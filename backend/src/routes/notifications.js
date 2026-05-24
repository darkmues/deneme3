// ============================================================
// HAYAT API — Notifications Routes
// ============================================================
import { Router } from 'express';
import { getOne, getMany, query } from '../models/db.js';
import { asyncHandler } from '../utils/errors.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// ─── List Notifications ─────────────────────────────────────
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { unread_only = 'false', limit = 20, offset = 0 } = req.query;

    const conditions = ['user_id = $1'];
    const params = [req.userId];

    if (unread_only === 'true') {
      conditions.push('read_at IS NULL');
    }

    const notifications = await getMany(
      `SELECT * FROM notifications
       WHERE ${conditions.join(' AND ')}
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.userId, parseInt(limit), parseInt(offset)]
    );

    const unreadCount = await getOne(
      'SELECT COUNT(*) AS count FROM notifications WHERE user_id = $1 AND read_at IS NULL',
      [req.userId]
    );

    res.json({
      success: true,
      data: {
        notifications,
        unread_count: parseInt(unreadCount.count),
      },
    });
  })
);

// ─── Mark as Read ───────────────────────────────────────────
router.put(
  '/:id/read',
  asyncHandler(async (req, res) => {
    await query(
      'UPDATE notifications SET read_at = NOW() WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );
    res.json({ success: true });
  })
);

// ─── Mark All Read ──────────────────────────────────────────
router.put(
  '/read-all',
  asyncHandler(async (req, res) => {
    await query(
      'UPDATE notifications SET read_at = NOW() WHERE user_id = $1 AND read_at IS NULL',
      [req.userId]
    );
    res.json({ success: true });
  })
);

// ─── Delete Notification ────────────────────────────────────
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await query('DELETE FROM notifications WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    res.json({ success: true });
  })
);

// ─── Helper: Create notification (used by other services) ───
export const createNotification = async (userId, type, title, body, data = {}) => {
  return getOne(
    `INSERT INTO notifications (user_id, type, title, body, data)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [userId, type, title, body, JSON.stringify(data)]
  );
};

export default router;
