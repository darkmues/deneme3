// ============================================================
// HAYAT API — Finance Routes
// Transactions, Budgets, Accounts, Analytics
// ============================================================
import { Router } from 'express';
import { query, getOne, getMany, paginate, paginatedResponse } from '../models/db.js';
import { asyncHandler, NotFoundError } from '../utils/errors.js';
import { authenticate } from '../middleware/auth.js';
import { validate, createTransactionSchema, updateTransactionSchema, transactionQuerySchema, createBudgetSchema, uuidParamSchema } from '../middleware/validate.js';

const router = Router();
router.use(authenticate);

// ═══════════════════════════════════════════════════════════
// TRANSACTIONS
// ═══════════════════════════════════════════════════════════

// ─── List Transactions ──────────────────────────────────────
router.get(
  '/transactions',
  validate(transactionQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { type, category_id, account_id, start_date, end_date, min_amount, max_amount, search, sort, order, page, limit } = req.validatedQuery;
    const { limit: safeLimit, offset, page: safePage } = paginate(page, limit);

    const conditions = ['t.user_id = $1', 't.deleted_at IS NULL'];
    const params = [req.userId];
    let idx = 2;

    if (type !== 'all') { conditions.push(`t.type = $${idx++}`); params.push(type); }
    if (category_id) { conditions.push(`t.category_id = $${idx++}`); params.push(category_id); }
    if (account_id) { conditions.push(`t.account_id = $${idx++}`); params.push(account_id); }
    if (start_date) { conditions.push(`t.date >= $${idx++}`); params.push(start_date); }
    if (end_date) { conditions.push(`t.date <= $${idx++}`); params.push(end_date); }
    if (min_amount) { conditions.push(`t.amount >= $${idx++}`); params.push(min_amount); }
    if (max_amount) { conditions.push(`t.amount <= $${idx++}`); params.push(max_amount); }
    if (search) { conditions.push(`t.title ILIKE $${idx++}`); params.push(`%${search}%`); }

    const where = conditions.join(' AND ');
    const orderMap = { date: 't.date', amount: 't.amount', created_at: 't.created_at' };
    const orderClause = `${orderMap[sort] || 't.date'} ${order === 'asc' ? 'ASC' : 'DESC'}, t.created_at DESC`;

    const [{ rows: transactions }, countResult] = await Promise.all([
      query(
        `SELECT t.*, c.name AS category_name, c.icon AS category_icon, c.color AS category_color,
                a.name AS account_name
         FROM transactions t
         LEFT JOIN categories c ON t.category_id = c.id
         LEFT JOIN accounts a ON t.account_id = a.id
         WHERE ${where}
         ORDER BY ${orderClause}
         LIMIT $${idx++} OFFSET $${idx++}`,
        [...params, safeLimit, offset]
      ),
      getOne(`SELECT COUNT(*) AS total FROM transactions t WHERE ${where}`, params),
    ]);

    res.json(paginatedResponse(transactions, parseInt(countResult.total), { page: safePage, limit: safeLimit }));
  })
);

// ─── Get Transaction ────────────────────────────────────────
router.get(
  '/transactions/:id',
  validate(uuidParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const tx = await getOne(
      `SELECT t.*, c.name AS category_name, c.icon AS category_icon, a.name AS account_name
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       LEFT JOIN accounts a ON t.account_id = a.id
       WHERE t.id = $1 AND t.user_id = $2 AND t.deleted_at IS NULL`,
      [req.params.id, req.userId]
    );
    if (!tx) throw new NotFoundError('İşlem');
    res.json({ success: true, data: tx });
  })
);

// ─── Create Transaction ─────────────────────────────────────
router.post(
  '/transactions',
  validate(createTransactionSchema),
  asyncHandler(async (req, res) => {
    const data = req.validated;

    const tx = await getOne(
      `INSERT INTO transactions (user_id, type, amount, title, description, category_id, account_id, date, currency, tags, is_recurring, recurrence_rule)
       VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, CURRENT_DATE), $9, $10, $11, $12)
       RETURNING *`,
      [
        req.userId, data.type, data.amount, data.title, data.description || null,
        data.category_id || null, data.account_id || null, data.date || null,
        data.currency, data.tags, data.is_recurring,
        data.recurrence_rule ? JSON.stringify(data.recurrence_rule) : null,
      ]
    );

    // Update account balance
    if (data.account_id) {
      const balanceChange = data.type === 'income' ? data.amount : -data.amount;
      await query(
        'UPDATE accounts SET balance = balance + $2 WHERE id = $1',
        [data.account_id, balanceChange]
      );
    }

    res.status(201).json({ success: true, data: tx });
  })
);

// ─── Update Transaction ─────────────────────────────────────
router.put(
  '/transactions/:id',
  validate(uuidParamSchema, 'params'),
  validate(updateTransactionSchema),
  asyncHandler(async (req, res) => {
    const existing = await getOne(
      'SELECT * FROM transactions WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
      [req.params.id, req.userId]
    );
    if (!existing) throw new NotFoundError('İşlem');

    const data = req.validated;
    const fields = [];
    const values = [req.params.id];
    let idx = 2;

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        if (key === 'recurrence_rule') {
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

    if (fields.length === 0) return res.json({ success: true, data: existing });

    const tx = await getOne(
      `UPDATE transactions SET ${fields.join(', ')} WHERE id = $1 RETURNING *`,
      values
    );

    res.json({ success: true, data: tx });
  })
);

// ─── Delete Transaction ─────────────────────────────────────
router.delete(
  '/transactions/:id',
  validate(uuidParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const tx = await getOne(
      'SELECT * FROM transactions WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
      [req.params.id, req.userId]
    );
    if (!tx) throw new NotFoundError('İşlem');

    await query('UPDATE transactions SET deleted_at = NOW() WHERE id = $1', [req.params.id]);

    // Reverse account balance
    if (tx.account_id) {
      const balanceReverse = tx.type === 'income' ? -tx.amount : tx.amount;
      await query('UPDATE accounts SET balance = balance + $2 WHERE id = $1', [tx.account_id, balanceReverse]);
    }

    res.json({ success: true, message: 'İşlem silindi' });
  })
);

// ═══════════════════════════════════════════════════════════
// ACCOUNTS
// ═══════════════════════════════════════════════════════════

router.get(
  '/accounts',
  asyncHandler(async (req, res) => {
    const accounts = await getMany(
      'SELECT * FROM accounts WHERE user_id = $1 AND is_active = TRUE ORDER BY created_at',
      [req.userId]
    );
    res.json({ success: true, data: accounts });
  })
);

router.post(
  '/accounts',
  asyncHandler(async (req, res) => {
    const { name, type, currency, balance, color, icon } = req.body;
    const account = await getOne(
      `INSERT INTO accounts (user_id, name, type, currency, balance, color, icon)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.userId, name, type || 'bank', currency || 'TRY', balance || 0, color, icon]
    );
    res.status(201).json({ success: true, data: account });
  })
);

// ═══════════════════════════════════════════════════════════
// BUDGETS
// ═══════════════════════════════════════════════════════════

router.get(
  '/budgets',
  asyncHandler(async (req, res) => {
    const budgets = await getMany(
      `SELECT b.*, c.name AS category_name, c.icon AS category_icon,
              COALESCE(
                (SELECT SUM(t.amount) FROM transactions t
                 WHERE t.user_id = $1 AND t.type = 'expense' AND t.deleted_at IS NULL
                   AND t.category_id = b.category_id
                   AND DATE_TRUNC(b.period, t.date) = DATE_TRUNC(b.period, CURRENT_DATE)),
                0
              ) AS spent
       FROM budgets b
       LEFT JOIN categories c ON b.category_id = c.id
       WHERE b.user_id = $1 AND b.is_active = TRUE
       ORDER BY b.created_at`,
      [req.userId]
    );

    const budgetsWithProgress = budgets.map((b) => ({
      ...b,
      spent: parseFloat(b.spent),
      remaining: parseFloat(b.amount) - parseFloat(b.spent),
      percentage: Math.round((parseFloat(b.spent) / parseFloat(b.amount)) * 100),
      isOverBudget: parseFloat(b.spent) > parseFloat(b.amount),
      isAlerted: parseFloat(b.spent) / parseFloat(b.amount) >= parseFloat(b.alert_threshold),
    }));

    res.json({ success: true, data: budgetsWithProgress });
  })
);

router.post(
  '/budgets',
  validate(createBudgetSchema),
  asyncHandler(async (req, res) => {
    const data = req.validated;
    const budget = await getOne(
      `INSERT INTO budgets (user_id, name, amount, category_id, period, start_date, end_date, alert_threshold)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [req.userId, data.name, data.amount, data.category_id, data.period, data.start_date, data.end_date, data.alert_threshold]
    );
    res.status(201).json({ success: true, data: budget });
  })
);

// ═══════════════════════════════════════════════════════════
// ANALYTICS
// ═══════════════════════════════════════════════════════════

router.get(
  '/analytics/summary',
  asyncHandler(async (req, res) => {
    const { period = 'month' } = req.query;
    const periodMap = { week: '7 days', month: '1 month', quarter: '3 months', year: '1 year' };
    const interval = periodMap[period] || '1 month';

    const [income, expenses, byCategoryResult, dailyResult, topExpenses] = await Promise.all([
      getOne(
        `SELECT COALESCE(SUM(amount), 0) AS total FROM transactions
         WHERE user_id = $1 AND type = 'income' AND deleted_at IS NULL
           AND date >= CURRENT_DATE - INTERVAL '${interval}'`,
        [req.userId]
      ),
      getOne(
        `SELECT COALESCE(SUM(amount), 0) AS total FROM transactions
         WHERE user_id = $1 AND type = 'expense' AND deleted_at IS NULL
           AND date >= CURRENT_DATE - INTERVAL '${interval}'`,
        [req.userId]
      ),
      getMany(
        `SELECT c.name, c.icon, c.color, SUM(t.amount) AS total, COUNT(*) AS count
         FROM transactions t
         LEFT JOIN categories c ON t.category_id = c.id
         WHERE t.user_id = $1 AND t.type = 'expense' AND t.deleted_at IS NULL
           AND t.date >= CURRENT_DATE - INTERVAL '${interval}'
         GROUP BY c.name, c.icon, c.color
         ORDER BY total DESC`,
        [req.userId]
      ),
      getMany(
        `SELECT date, SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expenses,
                SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS income
         FROM transactions
         WHERE user_id = $1 AND deleted_at IS NULL
           AND date >= CURRENT_DATE - INTERVAL '${interval}'
         GROUP BY date ORDER BY date`,
        [req.userId]
      ),
      getMany(
        `SELECT title, amount, date, c.name AS category_name
         FROM transactions t
         LEFT JOIN categories c ON t.category_id = c.id
         WHERE t.user_id = $1 AND t.type = 'expense' AND t.deleted_at IS NULL
           AND t.date >= CURRENT_DATE - INTERVAL '${interval}'
         ORDER BY amount DESC LIMIT 5`,
        [req.userId]
      ),
    ]);

    res.json({
      success: true,
      data: {
        totalIncome: parseFloat(income.total),
        totalExpenses: parseFloat(expenses.total),
        netSavings: parseFloat(income.total) - parseFloat(expenses.total),
        savingsRate: parseFloat(income.total) > 0
          ? Math.round(((parseFloat(income.total) - parseFloat(expenses.total)) / parseFloat(income.total)) * 100)
          : 0,
        byCategory: byCategoryResult.map((c) => ({ ...c, total: parseFloat(c.total), count: parseInt(c.count) })),
        dailyTrend: dailyResult.map((d) => ({
          date: d.date,
          expenses: parseFloat(d.expenses),
          income: parseFloat(d.income),
        })),
        topExpenses,
        period,
      },
    });
  })
);

// Monthly comparison
router.get(
  '/analytics/monthly-comparison',
  asyncHandler(async (req, res) => {
    const months = await getMany(
      `SELECT
        DATE_TRUNC('month', date) AS month,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expenses,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS income,
        COUNT(*) AS transaction_count
       FROM transactions
       WHERE user_id = $1 AND deleted_at IS NULL AND date >= CURRENT_DATE - INTERVAL '12 months'
       GROUP BY DATE_TRUNC('month', date)
       ORDER BY month DESC`,
      [req.userId]
    );

    res.json({
      success: true,
      data: months.map((m) => ({
        month: m.month,
        expenses: parseFloat(m.expenses),
        income: parseFloat(m.income),
        net: parseFloat(m.income) - parseFloat(m.expenses),
        transactionCount: parseInt(m.transaction_count),
      })),
    });
  })
);

export default router;
