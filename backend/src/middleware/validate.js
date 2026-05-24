// ============================================================
// HAYAT API — Validation Schemas (Zod)
// ============================================================
import { z } from 'zod';
import { ValidationError } from '../utils/errors.js';

// ─── Validation middleware factory ──────────────────────────

export const validate = (schema, source = 'body') => (req, _res, next) => {
  const data = source === 'body' ? req.body : source === 'query' ? req.query : req.params;
  const result = schema.safeParse(data);

  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    return next(new ValidationError('Geçersiz veri', details));
  }

  if (source === 'body') req.validated = result.data;
  else if (source === 'query') req.validatedQuery = result.data;
  else req.validatedParams = result.data;

  next();
};

// ─── Auth Schemas ───────────────────────────────────────────

export const registerSchema = z.object({
  email: z.string().email('Geçerli e-posta giriniz'),
  password: z.string().min(8, 'Şifre en az 8 karakter olmalı')
    .regex(/[A-Z]/, 'En az 1 büyük harf')
    .regex(/[0-9]/, 'En az 1 rakam'),
  full_name: z.string().min(2, 'İsim en az 2 karakter').max(100),
});

export const loginSchema = z.object({
  email: z.string().email('Geçerli e-posta giriniz'),
  password: z.string().min(1, 'Şifre gerekli'),
});

// ─── Task Schemas ───────────────────────────────────────────

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Başlık gerekli').max(500),
  description: z.string().max(5000).optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).default('medium'),
  status: z.enum(['todo', 'in_progress', 'done', 'archived']).default('todo'),
  category_id: z.string().uuid().optional().nullable(),
  due_date: z.string().datetime().optional().nullable(),
  tags: z.array(z.string().max(50)).max(10).default([]),
  is_recurring: z.boolean().default(false),
  recurrence_rule: z.object({
    frequency: z.enum(['daily', 'weekly', 'monthly']),
    interval: z.number().int().min(1).max(365).default(1),
    days: z.array(z.number().int().min(1).max(7)).optional(),
  }).optional().nullable(),
});

export const updateTaskSchema = createTaskSchema.partial();

export const taskQuerySchema = z.object({
  status: z.enum(['todo', 'in_progress', 'done', 'archived', 'all']).default('all'),
  priority: z.enum(['critical', 'high', 'medium', 'low', 'all']).default('all'),
  category_id: z.string().uuid().optional(),
  search: z.string().max(200).optional(),
  sort: z.enum(['created_at', 'due_date', 'priority', 'title']).default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ─── Transaction Schemas ────────────────────────────────────

export const createTransactionSchema = z.object({
  type: z.enum(['income', 'expense', 'transfer']),
  amount: z.number().positive('Tutar pozitif olmalı'),
  title: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  category_id: z.string().uuid().optional().nullable(),
  account_id: z.string().uuid().optional().nullable(),
  date: z.string().optional(), // YYYY-MM-DD
  currency: z.string().length(3).default('TRY'),
  tags: z.array(z.string().max(50)).max(10).default([]),
  is_recurring: z.boolean().default(false),
  recurrence_rule: z.object({
    frequency: z.enum(['daily', 'weekly', 'monthly']),
    interval: z.number().int().min(1).default(1),
  }).optional().nullable(),
});

export const updateTransactionSchema = createTransactionSchema.partial();

export const transactionQuerySchema = z.object({
  type: z.enum(['income', 'expense', 'transfer', 'all']).default('all'),
  category_id: z.string().uuid().optional(),
  account_id: z.string().uuid().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  min_amount: z.coerce.number().optional(),
  max_amount: z.coerce.number().optional(),
  search: z.string().max(200).optional(),
  sort: z.enum(['date', 'amount', 'created_at']).default('date'),
  order: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ─── Habit Schemas ──────────────────────────────────────────

export const createHabitSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  icon: z.string().max(10).default('🎯'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#E8A838'),
  frequency: z.enum(['daily', 'weekly', 'custom']).default('daily'),
  target_days: z.array(z.number().int().min(1).max(7)).default([1, 2, 3, 4, 5, 6, 7]),
  target_count: z.number().int().min(1).max(100).default(1),
  reminder_time: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
});

export const updateHabitSchema = createHabitSchema.partial();

// ─── Budget Schemas ─────────────────────────────────────────

export const createBudgetSchema = z.object({
  name: z.string().min(1).max(100),
  amount: z.number().positive(),
  category_id: z.string().uuid().optional().nullable(),
  period: z.enum(['weekly', 'monthly', 'yearly']).default('monthly'),
  start_date: z.string(),
  end_date: z.string().optional().nullable(),
  alert_threshold: z.number().min(0).max(1).default(0.8),
});

// ─── Category Schemas ───────────────────────────────────────

export const createCategorySchema = z.object({
  name: z.string().min(1).max(50),
  icon: z.string().max(10).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  module: z.enum(['task', 'finance', 'habit']),
});

// ─── AI Chat Schema ─────────────────────────────────────────

export const aiChatSchema = z.object({
  message: z.string().min(1).max(2000),
  conversation_id: z.string().uuid().optional().nullable(),
});

// ─── UUID param ─────────────────────────────────────────────

export const uuidParamSchema = z.object({
  id: z.string().uuid('Geçersiz ID'),
});
