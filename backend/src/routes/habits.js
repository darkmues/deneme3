// ============================================================
// HAYAT API — Habits Routes
// CRUD + completions + streaks + analytics
// ============================================================
import { Router } from 'express';
import { query, getOne, getMany, transaction } from '../models/db.js';
import { asyncHandler, NotFoundError, ConflictError } from '../utils/errors.js';
import { authenticate } from '../middleware/auth.js';
import { validate, createHabitSchema, updateHabitSchema, uuidParamSchema } from '../middleware/validate.js';

const router = Router();
router.use(authenticate);

// ─── List Habits ────────────────────────────────────────────
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const includeArchived = req.query.include_archived === 'true';
    const conditions = ['h.user_id = $1', 'h.deleted_at IS NULL'];
    if (!includeArchived) conditions.push('h.is_active = TRUE');

    const habits = await getMany(
      `SELECT h.*,
        (SELECT COUNT(*) FROM habit_completions hc WHERE hc.habit_id = h.id) AS total_completions_count,
        (SELECT completed_date FROM habit_completions hc WHERE hc.habit_id = h.id ORDER BY completed_date DESC LIMIT 1) AS last_completed
       FROM habits h
       WHERE ${conditions.join(' AND ')}
       ORDER BY h.sort_order, h.created_at`,
      [req.userId]
    );

    // Get today's completions
    const todayCompletions = await getMany(
      `SELECT habit_id FROM habit_completions
       WHERE user_id = $1 AND completed_date = CURRENT_DATE`,
      [req.userId]
    );
    const completedToday = new Set(todayCompletions.map((c) => c.habit_id));

    // Get last 7 days completions for each habit
    const weekCompletions = await getMany(
      `SELECT habit_id, completed_date FROM habit_completions
       WHERE user_id = $1 AND completed_date >= CURRENT_DATE - INTERVAL '6 days'
       ORDER BY completed_date`,
      [req.userId]
    );

    const weekMap = {};
    weekCompletions.forEach((c) => {
      if (!weekMap[c.habit_id]) weekMap[c.habit_id] = [];
      weekMap[c.habit_id].push(c.completed_date);
    });

    const enriched = habits.map((h) => ({
      ...h,
      completed_today: completedToday.has(h.id),
      week_completions: weekMap[h.id] || [],
      completion_rate: h.total_completions_count > 0
        ? Math.round((parseInt(h.total_completions_count) / Math.max(1, Math.ceil((Date.now() - new Date(h.created_at).getTime()) / 86400000))) * 100)
        : 0,
    }));

    res.json({ success: true, data: enriched });
  })
);

// ─── Get Single Habit ───────────────────────────────────────
router.get(
  '/:id',
  validate(uuidParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const habit = await getOne(
      'SELECT * FROM habits WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
      [req.params.id, req.userId]
    );
    if (!habit) throw new NotFoundError('Alışkanlık');

    // Get last 30 days completions
    const completions = await getMany(
      `SELECT completed_date, count, notes FROM habit_completions
       WHERE habit_id = $1 AND completed_date >= CURRENT_DATE - INTERVAL '30 days'
       ORDER BY completed_date DESC`,
      [req.params.id]
    );

    res.json({ success: true, data: { ...habit, recent_completions: completions } });
  })
);

// ─── Create Habit ───────────────────────────────────────────
router.post(
  '/',
  validate(createHabitSchema),
  asyncHandler(async (req, res) => {
    const data = req.validated;

    const maxOrder = await getOne(
      'SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM habits WHERE user_id = $1',
      [req.userId]
    );

    const habit = await getOne(
      `INSERT INTO habits (user_id, name, description, icon, color, frequency, target_days, target_count, reminder_time, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        req.userId, data.name, data.description || null, data.icon, data.color,
        data.frequency, data.target_days, data.target_count,
        data.reminder_time || null, maxOrder.next,
      ]
    );

    res.status(201).json({ success: true, data: habit });
  })
);

// ─── Update Habit ───────────────────────────────────────────
router.put(
  '/:id',
  validate(uuidParamSchema, 'params'),
  validate(updateHabitSchema),
  asyncHandler(async (req, res) => {
    const existing = await getOne(
      'SELECT id FROM habits WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
      [req.params.id, req.userId]
    );
    if (!existing) throw new NotFoundError('Alışkanlık');

    const data = req.validated;
    const fields = [];
    const values = [req.params.id];
    let idx = 2;

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        fields.push(`${key} = $${idx++}`);
        values.push(key === 'target_days' ? value : value);
      }
    }

    if (fields.length === 0) return res.json({ success: true, data: existing });

    const habit = await getOne(
      `UPDATE habits SET ${fields.join(', ')} WHERE id = $1 RETURNING *`,
      values
    );

    res.json({ success: true, data: habit });
  })
);

// ─── Delete Habit ───────────────────────────────────────────
router.delete(
  '/:id',
  validate(uuidParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const result = await query(
      'UPDATE habits SET deleted_at = NOW() WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
      [req.params.id, req.userId]
    );
    if (result.rowCount === 0) throw new NotFoundError('Alışkanlık');
    res.json({ success: true, message: 'Alışkanlık silindi' });
  })
);

// ─── Log Completion ─────────────────────────────────────────
router.post(
  '/:id/complete',
  validate(uuidParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const { date, notes } = req.body;
    const completionDate = date || new Date().toISOString().split('T')[0];

    const habit = await getOne(
      'SELECT * FROM habits WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
      [req.params.id, req.userId]
    );
    if (!habit) throw new NotFoundError('Alışkanlık');

    // Check if already completed
    const existing = await getOne(
      'SELECT id FROM habit_completions WHERE habit_id = $1 AND completed_date = $2',
      [req.params.id, completionDate]
    );
    if (existing) throw new ConflictError('Bu gün için zaten tamamlanmış');

    // Insert completion and update streak
    const result = await transaction(async (client) => {
      const completion = await client.query(
        `INSERT INTO habit_completions (habit_id, user_id, completed_date, notes)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [req.params.id, req.userId, completionDate, notes || null]
      );

      // Recalculate streak
      const streakResult = await client.query(
        'SELECT calculate_streak($1) AS streak',
        [req.params.id]
      );
      const newStreak = streakResult.rows[0].streak;

      const updatedHabit = await client.query(
        `UPDATE habits SET
          current_streak = $2,
          best_streak = GREATEST(best_streak, $2),
          total_completions = total_completions + 1
         WHERE id = $1 RETURNING *`,
        [req.params.id, newStreak]
      );

      return { completion: completion.rows[0], habit: updatedHabit.rows[0] };
    });

    res.json({ success: true, data: result });
  })
);

// ─── Undo Completion ────────────────────────────────────────
router.delete(
  '/:id/complete',
  validate(uuidParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const { date } = req.query;
    const completionDate = date || new Date().toISOString().split('T')[0];

    const result = await transaction(async (client) => {
      const deleted = await client.query(
        'DELETE FROM habit_completions WHERE habit_id = $1 AND user_id = $2 AND completed_date = $3 RETURNING id',
        [req.params.id, req.userId, completionDate]
      );

      if (deleted.rowCount === 0) throw new NotFoundError('Tamamlama kaydı');

      const streakResult = await client.query('SELECT calculate_streak($1) AS streak', [req.params.id]);

      await client.query(
        'UPDATE habits SET current_streak = $2, total_completions = GREATEST(total_completions - 1, 0) WHERE id = $1',
        [req.params.id, streakResult.rows[0].streak]
      );

      return { undone: true };
    });

    res.json({ success: true, data: result });
  })
);

// ─── Habit Analytics ────────────────────────────────────────
router.get(
  '/analytics/overview',
  asyncHandler(async (req, res) => {
    const { days = 30 } = req.query;

    const [habits, completions, streakLeader, consistency] = await Promise.all([
      getOne(
        `SELECT COUNT(*) AS total, SUM(current_streak) AS total_streak, MAX(best_streak) AS max_streak
         FROM habits WHERE user_id = $1 AND deleted_at IS NULL AND is_active = TRUE`,
        [req.userId]
      ),
      getMany(
        `SELECT completed_date, COUNT(*) AS count FROM habit_completions
         WHERE user_id = $1 AND completed_date >= CURRENT_DATE - ($2 || ' days')::INTERVAL
         GROUP BY completed_date ORDER BY completed_date`,
        [req.userId, days]
      ),
      getOne(
        `SELECT h.name, h.icon, h.current_streak
         FROM habits h WHERE h.user_id = $1 AND h.deleted_at IS NULL
         ORDER BY h.current_streak DESC LIMIT 1`,
        [req.userId]
      ),
      getMany(
        `SELECT h.id, h.name, h.icon, h.current_streak, h.best_streak,
                COUNT(hc.id) AS completions,
                ROUND(COUNT(hc.id)::DECIMAL / GREATEST($2::INTEGER, 1) * 100) AS rate
         FROM habits h
         LEFT JOIN habit_completions hc ON h.id = hc.habit_id
           AND hc.completed_date >= CURRENT_DATE - ($2 || ' days')::INTERVAL
         WHERE h.user_id = $1 AND h.deleted_at IS NULL AND h.is_active = TRUE
         GROUP BY h.id ORDER BY rate DESC`,
        [req.userId, days]
      ),
    ]);

    // Build heatmap (last N days)
    const heatmap = [];
    for (let i = parseInt(days) - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const found = completions.find((c) => c.completed_date?.toISOString?.()?.split('T')[0] === dateStr || c.completed_date === dateStr);
      heatmap.push({ date: dateStr, count: found ? parseInt(found.count) : 0 });
    }

    res.json({
      success: true,
      data: {
        totalHabits: parseInt(habits?.total || 0),
        totalStreak: parseInt(habits?.total_streak || 0),
        maxStreak: parseInt(habits?.max_streak || 0),
        streakLeader: streakLeader || null,
        heatmap,
        habitConsistency: consistency.map((c) => ({
          ...c,
          completions: parseInt(c.completions),
          rate: parseInt(c.rate),
        })),
      },
    });
  })
);

export default router;
