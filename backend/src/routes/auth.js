// ============================================================
// HAYAT API — Auth Routes
// POST /api/auth/register
// POST /api/auth/login
// POST /api/auth/refresh
// GET  /api/auth/me
// PUT  /api/auth/me
// POST /api/auth/logout
// ============================================================
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import { query, getOne } from '../models/db.js';
import { asyncHandler, AuthError, ConflictError, ValidationError } from '../utils/errors.js';
import { authenticate, generateTokens } from '../middleware/auth.js';
import { validate, registerSchema, loginSchema } from '../middleware/validate.js';

const router = Router();

// ─── Register ───────────────────────────────────────────────
router.post(
  '/register',
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const { email, password, full_name } = req.validated;

    // Check existing user
    const existing = await getOne('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing) throw new ConflictError('Bu e-posta adresi zaten kullanılıyor');

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(password, salt);

    // Create user
    const user = await getOne(
      `INSERT INTO users (email, password_hash, full_name)
       VALUES ($1, $2, $3)
       RETURNING id, email, full_name, plan, locale, timezone, created_at`,
      [email.toLowerCase(), password_hash, full_name]
    );

    // Create default categories
    const defaultCategories = [
      { name: 'İş', icon: '💼', color: '#60A5FA', module: 'task' },
      { name: 'Kişisel', icon: '👤', color: '#A78BFA', module: 'task' },
      { name: 'Sağlık', icon: '💚', color: '#34D399', module: 'task' },
      { name: 'Market', icon: '🛒', color: '#34D399', module: 'finance' },
      { name: 'Yiyecek', icon: '🍔', color: '#FBBF24', module: 'finance' },
      { name: 'Fatura', icon: '📄', color: '#F87171', module: 'finance' },
      { name: 'Ulaşım', icon: '🚕', color: '#60A5FA', module: 'finance' },
      { name: 'Eğlence', icon: '🎮', color: '#A78BFA', module: 'finance' },
      { name: 'Teknoloji', icon: '💻', color: '#E8A838', module: 'finance' },
      { name: 'Eğitim', icon: '📚', color: '#F472B6', module: 'finance' },
    ];

    for (const cat of defaultCategories) {
      await query(
        'INSERT INTO categories (user_id, name, icon, color, module) VALUES ($1, $2, $3, $4, $5)',
        [user.id, cat.name, cat.icon, cat.color, cat.module]
      );
    }

    // Create default account
    await query(
      'INSERT INTO accounts (user_id, name, type, currency, icon) VALUES ($1, $2, $3, $4, $5)',
      [user.id, 'Nakit', 'cash', 'TRY', '💵']
    );

    // Generate tokens
    const tokens = generateTokens(user.id);

    // Store refresh token
    const tokenHash = await bcrypt.hash(tokens.refreshToken, 8);
    await query(
      `INSERT INTO refresh_tokens (user_id, token_hash, device_info, ip_address, expires_at)
       VALUES ($1, $2, $3, $4, NOW() + INTERVAL '7 days')`,
      [user.id, tokenHash, JSON.stringify({ userAgent: req.headers['user-agent'] }), req.ip]
    );

    // Update last login
    await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          plan: user.plan,
        },
        ...tokens,
      },
    });
  })
);

// ─── Login ──────────────────────────────────────────────────
router.post(
  '/login',
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.validated;

    const user = await getOne(
      'SELECT id, email, password_hash, full_name, plan, locale, timezone FROM users WHERE email = $1 AND deleted_at IS NULL',
      [email.toLowerCase()]
    );

    if (!user) throw new AuthError('E-posta veya şifre hatalı');

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) throw new AuthError('E-posta veya şifre hatalı');

    const tokens = generateTokens(user.id);

    // Store refresh token
    const tokenHash = await bcrypt.hash(tokens.refreshToken, 8);
    await query(
      `INSERT INTO refresh_tokens (user_id, token_hash, device_info, ip_address, expires_at)
       VALUES ($1, $2, $3, $4, NOW() + INTERVAL '7 days')`,
      [user.id, tokenHash, JSON.stringify({ userAgent: req.headers['user-agent'] }), req.ip]
    );

    await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          plan: user.plan,
          locale: user.locale,
          timezone: user.timezone,
        },
        ...tokens,
      },
    });
  })
);

// ─── Refresh Token ──────────────────────────────────────────
router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) throw new AuthError('Refresh token gerekli');

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
    } catch {
      throw new AuthError('Geçersiz refresh token');
    }

    const user = await getOne(
      'SELECT id, email, full_name, plan FROM users WHERE id = $1 AND deleted_at IS NULL',
      [decoded.userId]
    );
    if (!user) throw new AuthError('Kullanıcı bulunamadı');

    const tokens = generateTokens(user.id);

    res.json({
      success: true,
      data: { ...tokens },
    });
  })
);

// ─── Get Profile ────────────────────────────────────────────
router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await getOne(
      `SELECT id, email, full_name, avatar_url, locale, timezone, plan,
              onboarding_done, streak_shield, created_at, last_login_at
       FROM users WHERE id = $1`,
      [req.userId]
    );

    // Get stats
    const taskStats = await getOne(
      `SELECT
        COUNT(*) FILTER (WHERE status = 'done') AS completed,
        COUNT(*) FILTER (WHERE status != 'archived' AND deleted_at IS NULL) AS total
       FROM tasks WHERE user_id = $1 AND deleted_at IS NULL`,
      [req.userId]
    );

    const habitStats = await getOne(
      `SELECT COUNT(*) AS total,
        SUM(current_streak) AS total_streak,
        MAX(best_streak) AS best_streak
       FROM habits WHERE user_id = $1 AND deleted_at IS NULL AND is_active = TRUE`,
      [req.userId]
    );

    const monthlySpending = await getOne(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM transactions
       WHERE user_id = $1 AND type = 'expense' AND deleted_at IS NULL
         AND DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE)`,
      [req.userId]
    );

    res.json({
      success: true,
      data: {
        ...user,
        stats: {
          tasks: { completed: parseInt(taskStats?.completed || 0), total: parseInt(taskStats?.total || 0) },
          habits: {
            total: parseInt(habitStats?.total || 0),
            totalStreak: parseInt(habitStats?.total_streak || 0),
            bestStreak: parseInt(habitStats?.best_streak || 0),
          },
          finance: { monthlySpending: parseFloat(monthlySpending?.total || 0) },
        },
      },
    });
  })
);

// ─── Update Profile ─────────────────────────────────────────
router.put(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const { full_name, avatar_url, locale, timezone } = req.body;

    const user = await getOne(
      `UPDATE users SET
        full_name = COALESCE($2, full_name),
        avatar_url = COALESCE($3, avatar_url),
        locale = COALESCE($4, locale),
        timezone = COALESCE($5, timezone)
       WHERE id = $1
       RETURNING id, email, full_name, avatar_url, locale, timezone, plan`,
      [req.userId, full_name, avatar_url, locale, timezone]
    );

    res.json({ success: true, data: user });
  })
);

// ─── Logout ─────────────────────────────────────────────────
router.post(
  '/logout',
  authenticate,
  asyncHandler(async (req, res) => {
    await query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
      [req.userId]
    );
    res.json({ success: true, message: 'Çıkış yapıldı' });
  })
);

export default router;
