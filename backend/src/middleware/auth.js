// ============================================================
// HAYAT API — Auth Middleware
// JWT verification + user injection
// ============================================================
import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import { AuthError } from '../utils/errors.js';
import { getOne } from '../models/db.js';

export const authenticate = async (req, _res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new AuthError('Token gerekli');
    }

    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.accessSecret);

    const user = await getOne(
      'SELECT id, email, full_name, plan, locale, timezone FROM users WHERE id = $1 AND deleted_at IS NULL',
      [decoded.userId]
    );

    if (!user) throw new AuthError('Kullanıcı bulunamadı');

    req.user = user;
    req.userId = user.id;
    next();
  } catch (error) {
    if (error instanceof AuthError) return next(error);
    if (error.name === 'TokenExpiredError') return next(new AuthError('Token süresi doldu'));
    if (error.name === 'JsonWebTokenError') return next(new AuthError('Geçersiz token'));
    next(error);
  }
};

// Optional auth: sets req.user if valid token, but doesn't block
export const optionalAuth = async (req, _res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) return next();
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.accessSecret);
    const user = await getOne(
      'SELECT id, email, full_name, plan FROM users WHERE id = $1 AND deleted_at IS NULL',
      [decoded.userId]
    );
    if (user) {
      req.user = user;
      req.userId = user.id;
    }
  } catch (_e) {
    // Silently continue — auth is optional
  }
  next();
};

// Plan check middleware
export const requirePlan = (...plans) => (req, _res, next) => {
  if (!plans.includes(req.user.plan)) {
    return next(new AuthError('Bu özellik için plan yükseltmeniz gerekiyor'));
  }
  next();
};

// Generate tokens
export const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiresIn,
  });
  const refreshToken = jwt.sign({ userId, type: 'refresh' }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  });
  return { accessToken, refreshToken };
};
