// ============================================================
// HAYAT API — Tasks Routes
// Full CRUD + subtasks + bulk operations
// ============================================================
import { Router } from 'express';
import { query, getOne, getMany, paginate, paginatedResponse, transaction } from '../models/db.js';
import { asyncHandler, NotFoundError } from '../utils/errors.js';
import { authenticate } from '../middleware/auth.js';
import { validate, createTaskSchema, updateTaskSchema, taskQuerySchema, uuidParamSchema } from '../middleware/validate.js';

const router = Router();
router.use(authenticate);

// ─── List Tasks ─────────────────────────────────────────────
router.get(
  '/',
  validate(taskQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { status, priority, category_id, search, sort, order, page, limit } = req.validatedQuery;
    const { limit: safeLimit, offset, page: safePage } = paginate(page, limit);

    const conditions = ['t.user_id = $1', 't.deleted_at IS NULL'];
    const params = [req.userId];
    let paramIndex = 2;

    if (status !== 'all') {
      conditions.push(`t.status = $${paramIndex++}`);
      params.push(status);
    }
    if (priority !== 'all') {
      conditions.push(`t.priority = $${paramIndex++}`);
      params.push(priority);
    }
    if (category_id) {
      conditions.push(`t.category_id = $${paramIndex++}`);
      params.push(category_id);
    }
    if (search) {
      conditions.push(`(t.title ILIKE $${paramIndex} OR t.description ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const where = conditions.join(' AND ');
    const orderMap = {
      priority: "CASE t.priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END",
      due_date: 'COALESCE(t.due_date, \'9999-12-31\'::timestamptz)',
      created_at: 't.created_at',
      title: 't.title',
    };
    const orderClause = `${orderMap[sort] || 't.created_at'} ${order === 'asc' ? 'ASC' : 'DESC'}`;

    const [{ rows: tasks }, countResult] = await Promise.all([
      query(
        `SELECT t.*, c.name AS category_name, c.icon AS category_icon, c.color AS category_color,
                (SELECT COUNT(*) FROM subtasks st WHERE st.task_id = t.id) AS subtask_count,
                (SELECT COUNT(*) FROM subtasks st WHERE st.task_id = t.id AND st.completed = TRUE) AS subtask_done
         FROM tasks t
         LEFT JOIN categories c ON t.category_id = c.id
         WHERE ${where}
         ORDER BY ${orderClause}
         LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
        [...params, safeLimit, offset]
      ),
      getOne(`SELECT COUNT(*) AS total FROM tasks t WHERE ${where}`, params),
    ]);

    res.json(paginatedResponse(tasks, parseInt(countResult.total), { page: safePage, limit: safeLimit }));
  })
);

// ─── Get Single Task ────────────────────────────────────────
router.get(
  '/:id',
  validate(uuidParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const task = await getOne(
      `SELECT t.*, c.name AS category_name, c.icon AS category_icon, c.color AS category_color
       FROM tasks t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.id = $1 AND t.user_id = $2 AND t.deleted_at IS NULL`,
      [req.params.id, req.userId]
    );
    if (!task) throw new NotFoundError('Görev');

    // Get subtasks
    const subtasks = await getMany(
      'SELECT * FROM subtasks WHERE task_id = $1 ORDER BY sort_order, created_at',
      [task.id]
    );

    res.json({ success: true, data: { ...task, subtasks } });
  })
);

// ─── Create Task ────────────────────────────────────────────
router.post(
  '/',
  validate(createTaskSchema),
  asyncHandler(async (req, res) => {
    const data = req.validated;

    const task = await getOne(
      `INSERT INTO tasks (user_id, title, description, priority, status, category_id, due_date, tags, is_recurring, recurrence_rule)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        req.userId, data.title, data.description || null, data.priority, data.status,
        data.category_id || null, data.due_date || null, data.tags,
        data.is_recurring, data.recurrence_rule ? JSON.stringify(data.recurrence_rule) : null,
      ]
    );

    res.status(201).json({ success: true, data: task });
  })
);

// ─── Update Task ────────────────────────────────────────────
router.put(
  '/:id',
  validate(uuidParamSchema, 'params'),
  validate(updateTaskSchema),
  asyncHandler(async (req, res) => {
    const data = req.validated;

    // Check ownership
    const existing = await getOne(
      'SELECT id FROM tasks WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
      [req.params.id, req.userId]
    );
    if (!existing) throw new NotFoundError('Görev');

    // Build dynamic update
    const fields = [];
    const values = [req.params.id];
    let idx = 2;

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        if (key === 'recurrence_rule' || key === 'metadata') {
          fields.push(`${key} = $${idx++}`);
          values.push(JSON.stringify(value));
        } else if (key === 'tags') {
          fields.push(`${key} = $${idx++}`);
          values.push(value);
        } else {
          fields.push(`${key} = $${idx++}`);
          values.push(value);
        }
      }
    }

    // Auto-set completed_at
    if (data.status === 'done') {
      fields.push(`completed_at = NOW()`);
    } else if (data.status && data.status !== 'done') {
      fields.push(`completed_at = NULL`);
    }

    if (fields.length === 0) {
      return res.json({ success: true, data: existing });
    }

    const task = await getOne(
      `UPDATE tasks SET ${fields.join(', ')} WHERE id = $1 RETURNING *`,
      values
    );

    res.json({ success: true, data: task });
  })
);

// ─── Delete Task (soft) ─────────────────────────────────────
router.delete(
  '/:id',
  validate(uuidParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const result = await query(
      'UPDATE tasks SET deleted_at = NOW() WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
      [req.params.id, req.userId]
    );
    if (result.rowCount === 0) throw new NotFoundError('Görev');
    res.json({ success: true, message: 'Görev silindi' });
  })
);

// ─── Bulk Update Tasks ──────────────────────────────────────
router.patch(
  '/bulk',
  asyncHandler(async (req, res) => {
    const { ids, action, data } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: { message: 'IDs gerekli' } });
    }

    let result;
    switch (action) {
      case 'complete':
        result = await query(
          `UPDATE tasks SET status = 'done', completed_at = NOW()
           WHERE id = ANY($1) AND user_id = $2 AND deleted_at IS NULL`,
          [ids, req.userId]
        );
        break;
      case 'delete':
        result = await query(
          'UPDATE tasks SET deleted_at = NOW() WHERE id = ANY($1) AND user_id = $2 AND deleted_at IS NULL',
          [ids, req.userId]
        );
        break;
      case 'update_priority':
        result = await query(
          'UPDATE tasks SET priority = $3 WHERE id = ANY($1) AND user_id = $2 AND deleted_at IS NULL',
          [ids, req.userId, data.priority]
        );
        break;
      default:
        return res.status(400).json({ success: false, error: { message: 'Geçersiz işlem' } });
    }

    res.json({ success: true, data: { affected: result.rowCount } });
  })
);

// ─── Subtasks ───────────────────────────────────────────────
router.post(
  '/:id/subtasks',
  validate(uuidParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const task = await getOne(
      'SELECT id FROM tasks WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
      [req.params.id, req.userId]
    );
    if (!task) throw new NotFoundError('Görev');

    const { title } = req.body;
    const subtask = await getOne(
      'INSERT INTO subtasks (task_id, title) VALUES ($1, $2) RETURNING *',
      [req.params.id, title]
    );

    res.status(201).json({ success: true, data: subtask });
  })
);

router.put(
  '/:id/subtasks/:subtaskId',
  asyncHandler(async (req, res) => {
    const { completed, title } = req.body;
    const subtask = await getOne(
      `UPDATE subtasks SET
        title = COALESCE($3, title),
        completed = COALESCE($4, completed)
       WHERE id = $2 AND task_id = $1
       RETURNING *`,
      [req.params.id, req.params.subtaskId, title, completed]
    );
    if (!subtask) throw new NotFoundError('Alt görev');
    res.json({ success: true, data: subtask });
  })
);

router.delete(
  '/:id/subtasks/:subtaskId',
  asyncHandler(async (req, res) => {
    const result = await query(
      'DELETE FROM subtasks WHERE id = $1 AND task_id = $2',
      [req.params.subtaskId, req.params.id]
    );
    if (result.rowCount === 0) throw new NotFoundError('Alt görev');
    res.json({ success: true, message: 'Alt görev silindi' });
  })
);

// ─── Task Stats ─────────────────────────────────────────────
router.get(
  '/stats/overview',
  asyncHandler(async (req, res) => {
    const stats = await getOne(
      `SELECT
        COUNT(*) FILTER (WHERE status = 'todo') AS todo_count,
        COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress_count,
        COUNT(*) FILTER (WHERE status = 'done') AS done_count,
        COUNT(*) FILTER (WHERE priority = 'critical' AND status NOT IN ('done', 'archived')) AS critical_count,
        COUNT(*) FILTER (WHERE priority = 'high' AND status NOT IN ('done', 'archived')) AS high_count,
        COUNT(*) FILTER (WHERE due_date < NOW() AND status NOT IN ('done', 'archived')) AS overdue_count,
        COUNT(*) FILTER (WHERE due_date BETWEEN NOW() AND NOW() + INTERVAL '24 hours' AND status NOT IN ('done', 'archived')) AS due_today_count,
        COUNT(*) FILTER (WHERE completed_at >= DATE_TRUNC('day', NOW())) AS completed_today
       FROM tasks
       WHERE user_id = $1 AND deleted_at IS NULL`,
      [req.userId]
    );

    res.json({ success: true, data: stats });
  })
);

export default router;
