// ============================================================
// HAYAT API — Categories Routes
// ============================================================
import { Router } from 'express';
import { getOne, getMany, query } from '../models/db.js';
import { asyncHandler, NotFoundError, ConflictError } from '../utils/errors.js';
import { authenticate } from '../middleware/auth.js';
import { validate, createCategorySchema, uuidParamSchema } from '../middleware/validate.js';

const router = Router();
router.use(authenticate);

// ─── List by module ─────────────────────────────────────────
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { module } = req.query;
    const conditions = ['user_id = $1'];
    const params = [req.userId];

    if (module) {
      conditions.push('module = $2');
      params.push(module);
    }

    const categories = await getMany(
      `SELECT * FROM categories WHERE ${conditions.join(' AND ')} ORDER BY sort_order, name`,
      params
    );

    res.json({ success: true, data: categories });
  })
);

// ─── Create ─────────────────────────────────────────────────
router.post(
  '/',
  validate(createCategorySchema),
  asyncHandler(async (req, res) => {
    const data = req.validated;

    const existing = await getOne(
      'SELECT id FROM categories WHERE user_id = $1 AND name = $2 AND module = $3',
      [req.userId, data.name, data.module]
    );
    if (existing) throw new ConflictError('Bu kategoriden zaten var');

    const category = await getOne(
      `INSERT INTO categories (user_id, name, icon, color, module)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.userId, data.name, data.icon, data.color, data.module]
    );

    res.status(201).json({ success: true, data: category });
  })
);

// ─── Update ─────────────────────────────────────────────────
router.put(
  '/:id',
  validate(uuidParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const { name, icon, color } = req.body;

    const category = await getOne(
      `UPDATE categories SET
        name = COALESCE($3, name),
        icon = COALESCE($4, icon),
        color = COALESCE($5, color)
       WHERE id = $1 AND user_id = $2 RETURNING *`,
      [req.params.id, req.userId, name, icon, color]
    );
    if (!category) throw new NotFoundError('Kategori');

    res.json({ success: true, data: category });
  })
);

// ─── Delete ─────────────────────────────────────────────────
router.delete(
  '/:id',
  validate(uuidParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const result = await query(
      'DELETE FROM categories WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );
    if (result.rowCount === 0) throw new NotFoundError('Kategori');
    res.json({ success: true, message: 'Kategori silindi' });
  })
);

export default router;
