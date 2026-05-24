// ============================================================
// HAYAT API — Database Seeder
// Usage: npm run seed
// Creates a demo user with sample data for development
// ============================================================
import pg from 'pg';
import bcrypt from 'bcryptjs';
import config from '../config/index.js';

const pool = new pg.Pool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.name,
  user: config.db.user,
  password: config.db.password,
});

async function seed() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // ─── Demo User ────────────────────────────────────────
    const passwordHash = await bcrypt.hash('Demo1234', 12);
    const userResult = await client.query(
      `INSERT INTO users (email, password_hash, full_name, plan, onboarding_done)
       VALUES ($1, $2, $3, $4, TRUE)
       ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
       RETURNING id`,
      ['demo@hayat.app', passwordHash, 'Demo Kullanıcı', 'pro']
    );
    const userId = userResult.rows[0].id;
    console.log('  👤 Demo kullanıcı oluşturuldu: demo@hayat.app / Demo1234');

    // ─── Categories ───────────────────────────────────────
    const categories = [
      { name: 'İş', icon: '💼', color: '#60A5FA', module: 'task' },
      { name: 'Kişisel', icon: '👤', color: '#A78BFA', module: 'task' },
      { name: 'Sağlık', icon: '💚', color: '#34D399', module: 'task' },
      { name: 'Market', icon: '🛒', color: '#34D399', module: 'finance' },
      { name: 'Yiyecek', icon: '🍔', color: '#FBBF24', module: 'finance' },
      { name: 'Fatura', icon: '📄', color: '#F87171', module: 'finance' },
      { name: 'Ulaşım', icon: '🚕', color: '#60A5FA', module: 'finance' },
      { name: 'Eğlence', icon: '🎮', color: '#A78BFA', module: 'finance' },
      { name: 'Teknoloji', icon: '💻', color: '#E8A838', module: 'finance' },
    ];

    const catIds = {};
    for (const cat of categories) {
      const res = await client.query(
        `INSERT INTO categories (user_id, name, icon, color, module)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id, name, module) DO UPDATE SET icon = EXCLUDED.icon
         RETURNING id`,
        [userId, cat.name, cat.icon, cat.color, cat.module]
      );
      catIds[cat.name] = res.rows[0].id;
    }
    console.log('  📁 Kategoriler oluşturuldu');

    // ─── Account ──────────────────────────────────────────
    await client.query(
      `INSERT INTO accounts (user_id, name, type, currency, balance, icon)
       VALUES ($1, 'Banka Hesabı', 'bank', 'TRY', 15000, '🏦')
       ON CONFLICT DO NOTHING`,
      [userId]
    );

    // ─── Tasks ────────────────────────────────────────────
    const tasks = [
      { title: 'Haftalık raporu hazırla', priority: 'high', category: 'İş', status: 'todo' },
      { title: 'Sunum dosyasını güncelle', priority: 'critical', category: 'İş', status: 'in_progress' },
      { title: 'Spor salonu kaydını yenile', priority: 'medium', category: 'Sağlık', status: 'todo' },
      { title: 'Diş hekimi randevusu al', priority: 'high', category: 'Sağlık', status: 'todo' },
      { title: 'Yeni kitap oku', priority: 'low', category: 'Kişisel', status: 'todo' },
      { title: 'Fatura ödemeleri', priority: 'critical', category: 'Kişisel', status: 'done' },
      { title: 'Müşteri toplantısına hazırlan', priority: 'high', category: 'İş', status: 'done' },
    ];

    for (const task of tasks) {
      await client.query(
        `INSERT INTO tasks (user_id, title, priority, status, category_id, completed_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          userId, task.title, task.priority, task.status,
          catIds[task.category] || null,
          task.status === 'done' ? new Date() : null,
        ]
      );
    }
    console.log('  📋 7 örnek görev oluşturuldu');

    // ─── Transactions ─────────────────────────────────────
    const transactions = [
      { type: 'income', amount: 35000, title: 'Maaş', category: null, daysAgo: 5 },
      { type: 'expense', amount: 4500, title: 'Kira', category: 'Fatura', daysAgo: 3 },
      { type: 'expense', amount: 850, title: 'Market alışverişi', category: 'Market', daysAgo: 2 },
      { type: 'expense', amount: 120, title: 'Akşam yemeği', category: 'Yiyecek', daysAgo: 1 },
      { type: 'expense', amount: 350, title: 'Taksi', category: 'Ulaşım', daysAgo: 1 },
      { type: 'expense', amount: 75, title: 'Netflix + Spotify', category: 'Eğlence', daysAgo: 4 },
      { type: 'expense', amount: 2500, title: 'Yeni kulaklık', category: 'Teknoloji', daysAgo: 6 },
      { type: 'expense', amount: 320, title: 'Elektrik faturası', category: 'Fatura', daysAgo: 7 },
    ];

    for (const tx of transactions) {
      const date = new Date();
      date.setDate(date.getDate() - tx.daysAgo);
      await client.query(
        `INSERT INTO transactions (user_id, type, amount, title, category_id, date)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, tx.type, tx.amount, tx.title, tx.category ? catIds[tx.category] : null, date.toISOString().split('T')[0]]
      );
    }
    console.log('  💰 8 örnek işlem oluşturuldu');

    // ─── Habits ───────────────────────────────────────────
    const habits = [
      { name: 'Su iç (8 bardak)', icon: '💧', color: '#60A5FA', streak: 12 },
      { name: 'Meditasyon', icon: '🧘', color: '#A78BFA', streak: 5 },
      { name: '30 dk yürüyüş', icon: '🚶', color: '#34D399', streak: 8 },
      { name: 'Kitap oku', icon: '📚', color: '#E8A838', streak: 3 },
      { name: 'Erken kalk', icon: '🌅', color: '#F472B6', streak: 15 },
    ];

    for (const habit of habits) {
      const habitResult = await client.query(
        `INSERT INTO habits (user_id, name, icon, color, current_streak, best_streak, total_completions)
         VALUES ($1, $2, $3, $4, $5, $5, $5) RETURNING id`,
        [userId, habit.name, habit.icon, habit.color, habit.streak]
      );

      // Add completion history
      for (let d = 0; d < habit.streak; d++) {
        const date = new Date();
        date.setDate(date.getDate() - d);
        await client.query(
          `INSERT INTO habit_completions (habit_id, user_id, completed_date)
           VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
          [habitResult.rows[0].id, userId, date.toISOString().split('T')[0]]
        );
      }
    }
    console.log('  🔥 5 örnek alışkanlık oluşturuldu (seri verileriyle)');

    // ─── Budget ───────────────────────────────────────────
    await client.query(
      `INSERT INTO budgets (user_id, name, amount, category_id, period, start_date, alert_threshold)
       VALUES ($1, 'Market Bütçesi', 3000, $2, 'monthly', CURRENT_DATE, 0.8)`,
      [userId, catIds['Market']]
    );
    await client.query(
      `INSERT INTO budgets (user_id, name, amount, category_id, period, start_date, alert_threshold)
       VALUES ($1, 'Eğlence Bütçesi', 500, $2, 'monthly', CURRENT_DATE, 0.8)`,
      [userId, catIds['Eğlence']]
    );
    console.log('  📊 2 örnek bütçe oluşturuldu');

    await client.query('COMMIT');
    console.log('\n  ✅ Seed tamamlandı!');
    console.log('  📧 Giriş: demo@hayat.app');
    console.log('  🔑 Şifre: Demo1234\n');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

console.log('\n🌱 HAYAT — Database Seeder\n');
seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Seed başarısız:', err.message);
    process.exit(1);
  });
