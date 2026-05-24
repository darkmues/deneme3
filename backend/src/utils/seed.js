// ============================================================
// HAYAT API — Demo Seed
// Creates (or resets) a demo user with sample data.
//   email:    demo@hayat.app
//   password: Demo1234
// Re-runnable: removes the existing demo user first.
// ============================================================
import bcrypt from 'bcryptjs';
import pool, { query, getOne } from '../models/db.js';

const DEMO_EMAIL = 'demo@hayat.app';
const DEMO_PASSWORD = 'Demo1234';

const CATEGORIES = [
  { name: 'İş', icon: '💼', color: '#60A5FA', module: 'task' },
  { name: 'Kişisel', icon: '👤', color: '#A78BFA', module: 'task' },
  { name: 'Sağlık', icon: '💚', color: '#34D399', module: 'task' },
  { name: 'Market', icon: '🛒', color: '#34D399', module: 'finance' },
  { name: 'Yiyecek', icon: '🍔', color: '#FBBF24', module: 'finance' },
  { name: 'Fatura', icon: '📄', color: '#F87171', module: 'finance' },
  { name: 'Ulaşım', icon: '🚕', color: '#60A5FA', module: 'finance' },
  { name: 'Maaş', icon: '💰', color: '#34D399', module: 'finance' },
];

async function seed() {
  console.log('[SEED] Resetting demo user ...');
  await query('DELETE FROM users WHERE email = $1', [DEMO_EMAIL]);

  const password_hash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const user = await getOne(
    `INSERT INTO users (email, password_hash, full_name, onboarding_done)
     VALUES ($1, $2, $3, TRUE) RETURNING id`,
    [DEMO_EMAIL, password_hash, 'Demo Kullanıcı']
  );

  const catIds = {};
  for (const c of CATEGORIES) {
    const row = await getOne(
      `INSERT INTO categories (user_id, name, icon, color, module)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [user.id, c.name, c.icon, c.color, c.module]
    );
    catIds[`${c.module}:${c.name}`] = row.id;
  }

  const account = await getOne(
    `INSERT INTO accounts (user_id, name, type, currency, balance, icon)
     VALUES ($1, 'Nakit', 'cash', 'TRY', 12500, '💵') RETURNING id`,
    [user.id]
  );

  // ─── Tasks ────────────────────────────────────────────────
  const tasks = [
    { title: 'Haftalık planı hazırla', priority: 'high', status: 'todo', cat: 'task:İş', dueOffset: 1 },
    { title: 'Sunum slaytlarını gözden geçir', priority: 'critical', status: 'in_progress', cat: 'task:İş', dueOffset: 0 },
    { title: 'Spor salonuna git', priority: 'medium', status: 'done', cat: 'task:Sağlık', dueOffset: -1, done: true },
    { title: 'Kitap oku (30 dk)', priority: 'low', status: 'todo', cat: 'task:Kişisel', dueOffset: 2 },
    { title: 'Faturaları öde', priority: 'high', status: 'todo', cat: 'task:Kişisel', dueOffset: -2 },
  ];
  for (const t of tasks) {
    await query(
      `INSERT INTO tasks (user_id, category_id, title, priority, status, due_date, completed_at)
       VALUES ($1, $2, $3, $4, $5, NOW() + ($6 || ' days')::INTERVAL, $7)`,
      [user.id, catIds[t.cat], t.title, t.priority, t.status, String(t.dueOffset), t.done ? new Date() : null]
    );
  }

  // ─── Transactions ─────────────────────────────────────────
  const txns = [
    { type: 'income', amount: 25000, title: 'Maaş', cat: 'finance:Maaş', dayOffset: -10 },
    { type: 'expense', amount: 1450.5, title: 'Market alışverişi', cat: 'finance:Market', dayOffset: -8 },
    { type: 'expense', amount: 320, title: 'Akşam yemeği', cat: 'finance:Yiyecek', dayOffset: -5 },
    { type: 'expense', amount: 890, title: 'Elektrik faturası', cat: 'finance:Fatura', dayOffset: -3 },
    { type: 'expense', amount: 210, title: 'Taksi', cat: 'finance:Ulaşım', dayOffset: -1 },
  ];
  for (const x of txns) {
    await query(
      `INSERT INTO transactions (user_id, account_id, category_id, type, amount, title, date)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE + ($7 || ' days')::INTERVAL)`,
      [user.id, account.id, catIds[x.cat], x.type, x.amount, x.title, String(x.dayOffset)]
    );
  }

  // ─── Habits + recent completions ──────────────────────────
  const habits = [
    { name: 'Su iç (2L)', icon: '💧', color: '#60A5FA' },
    { name: 'Meditasyon', icon: '🧘', color: '#A78BFA' },
    { name: 'Yürüyüş', icon: '🚶', color: '#34D399' },
  ];
  for (const h of habits) {
    const habit = await getOne(
      `INSERT INTO habits (user_id, name, icon, color) VALUES ($1, $2, $3, $4) RETURNING id`,
      [user.id, h.name, h.icon, h.color]
    );
    // Complete the last 4 days to build a streak
    for (let d = 1; d <= 4; d += 1) {
      await query(
        `INSERT INTO habit_completions (habit_id, user_id, completed_date)
         VALUES ($1, $2, CURRENT_DATE - ($3 || ' days')::INTERVAL)
         ON CONFLICT (habit_id, completed_date) DO NOTHING`,
        [habit.id, user.id, String(d)]
      );
    }
    await query(
      `UPDATE habits SET current_streak = 4, best_streak = 4, total_completions = 4 WHERE id = $1`,
      [habit.id]
    );
  }

  console.log(`[SEED] Done. Login with ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

seed()
  .catch((err) => {
    console.error('[SEED] FAILED:', err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
