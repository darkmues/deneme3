// ============================================================
// HAYAT API — AI Routes
// Context-aware AI chat, insights, weekly reports
// ============================================================
import { Router } from 'express';
import { getOne, getMany, query } from '../models/db.js';
import { asyncHandler, AppError } from '../utils/errors.js';
import { authenticate } from '../middleware/auth.js';
import { validate, aiChatSchema } from '../middleware/validate.js';
import config from '../config/index.js';

const router = Router();
router.use(authenticate);

// ─── Gather User Context for AI ─────────────────────────────
async function getUserContext(userId) {
  const [taskStats, recentTasks, expenseStats, habitStats, habits] = await Promise.all([
    getOne(
      `SELECT
        COUNT(*) FILTER (WHERE status = 'todo') AS todo,
        COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress,
        COUNT(*) FILTER (WHERE status = 'done' AND completed_at >= CURRENT_DATE - INTERVAL '7 days') AS completed_week,
        COUNT(*) FILTER (WHERE due_date < NOW() AND status NOT IN ('done','archived')) AS overdue
       FROM tasks WHERE user_id = $1 AND deleted_at IS NULL`,
      [userId]
    ),
    getMany(
      `SELECT title, priority, status, due_date FROM tasks
       WHERE user_id = $1 AND deleted_at IS NULL AND status NOT IN ('done','archived')
       ORDER BY CASE priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, due_date
       LIMIT 10`,
      [userId]
    ),
    getOne(
      `SELECT
        COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0) AS monthly_expenses,
        COALESCE(SUM(amount) FILTER (WHERE type = 'income'), 0) AS monthly_income,
        COUNT(*) FILTER (WHERE type = 'expense') AS expense_count
       FROM transactions
       WHERE user_id = $1 AND deleted_at IS NULL
         AND DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE)`,
      [userId]
    ),
    getOne(
      `SELECT COUNT(*) AS total, SUM(current_streak) AS total_streak, MAX(best_streak) AS best
       FROM habits WHERE user_id = $1 AND deleted_at IS NULL AND is_active = TRUE`,
      [userId]
    ),
    getMany(
      `SELECT name, current_streak, best_streak,
              (SELECT completed_date FROM habit_completions WHERE habit_id = h.id ORDER BY completed_date DESC LIMIT 1) AS last_done
       FROM habits h WHERE user_id = $1 AND deleted_at IS NULL AND is_active = TRUE
       ORDER BY current_streak DESC LIMIT 5`,
      [userId]
    ),
  ]);

  return `
KULLANICI BAĞLAMI:
— GÖREVLER: ${taskStats.todo} bekleyen, ${taskStats.in_progress} devam eden, ${taskStats.completed_week} bu hafta tamamlanan, ${taskStats.overdue} gecikmiş
— Önemli Görevler: ${recentTasks.map((t) => `"${t.title}" (${t.priority}${t.due_date ? ', son: ' + new Date(t.due_date).toLocaleDateString('tr-TR') : ''})`).join('; ') || 'Yok'}
— FİNANS: Bu ay ₺${parseFloat(expenseStats.monthly_expenses).toLocaleString('tr-TR')} harcama, ₺${parseFloat(expenseStats.monthly_income).toLocaleString('tr-TR')} gelir (${expenseStats.expense_count} işlem)
— ALIŞKANLIKLAR: ${habitStats.total} aktif alışkanlık, toplam seri: ${habitStats.total_streak || 0}, en iyi: ${habitStats.best || 0}
— Alışkanlık Detay: ${habits.map((h) => `"${h.name}" (seri: ${h.current_streak})`).join('; ') || 'Yok'}
`.trim();
}

// ─── AI Chat ────────────────────────────────────────────────
router.post(
  '/chat',
  validate(aiChatSchema),
  asyncHandler(async (req, res) => {
    const { message, conversation_id } = req.validated;
    const userContext = await getUserContext(req.userId);

    // Get or create conversation
    let convId = conversation_id;
    if (!convId) {
      const conv = await getOne(
        `INSERT INTO ai_conversations (user_id, title) VALUES ($1, $2) RETURNING id`,
        [req.userId, message.slice(0, 100)]
      );
      convId = conv.id;
    }

    // Save user message
    await query(
      'INSERT INTO ai_messages (conversation_id, role, content) VALUES ($1, $2, $3)',
      [convId, 'user', message]
    );

    // Get conversation history
    const history = await getMany(
      `SELECT role, content FROM ai_messages WHERE conversation_id = $1 ORDER BY created_at LIMIT 20`,
      [convId]
    );

    // Call Claude API or generate smart response
    let aiResponse;

    if (config.ai.apiKey) {
      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': config.ai.apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: config.ai.model,
            max_tokens: config.ai.maxTokens,
            system: `Sen HAYAT Life OS yapay zeka asistanısın. Kullanıcıya görevleri, finansları ve alışkanlıkları hakkında yardımcı oluyorsun.
Her zaman Türkçe yanıt ver. Kısa, öz ve aksiyon odaklı ol. Emoji kullan ama abartma.
Kullanıcının gerçek verilerine dayanarak tavsiyeler ver.

${userContext}`,
            messages: history.map((m) => ({ role: m.role, content: m.content })),
          }),
        });

        const data = await response.json();
        aiResponse = data.content?.[0]?.text || 'Bir sorun oluştu, tekrar deneyin.';
      } catch (error) {
        console.error('[AI] Claude API error:', error.message);
        aiResponse = generateLocalResponse(message, userContext);
      }
    } else {
      aiResponse = generateLocalResponse(message, userContext);
    }

    // Save AI response
    await query(
      'INSERT INTO ai_messages (conversation_id, role, content) VALUES ($1, $2, $3)',
      [convId, 'assistant', aiResponse]
    );

    res.json({
      success: true,
      data: {
        conversation_id: convId,
        message: aiResponse,
      },
    });
  })
);

// ─── Smart Local Response (fallback) ────────────────────────
function generateLocalResponse(message, context) {
  const lower = message.toLowerCase();

  if (lower.includes('görev') || lower.includes('task') || lower.includes('yapılacak')) {
    const overdue = context.match(/(\d+) gecikmiş/)?.[1] || '0';
    const todo = context.match(/(\d+) bekleyen/)?.[1] || '0';
    if (parseInt(overdue) > 0) {
      return `⚠️ ${overdue} gecikmiş görevin var! Bunlara öncelik vermeni öneririm.\n\n📋 Toplamda ${todo} bekleyen görev var. Önce critical ve high önceliklilere odaklan, sonra diğerlerini halledebilirsin.`;
    }
    return `📋 ${todo} bekleyen görevin var. Bugün en az 2-3 tanesini tamamlamayı hedefle! Küçük adımlarla büyük işler başarılır 💪`;
  }

  if (lower.includes('harcama') || lower.includes('para') || lower.includes('finans') || lower.includes('bütçe')) {
    const expenses = context.match(/₺([\d.,]+) harcama/)?.[1] || '0';
    const income = context.match(/₺([\d.,]+) gelir/)?.[1] || '0';
    return `💰 Bu ay ₺${expenses} harcadın, ₺${income} gelir elde ettin.\n\n📊 Tasarruf oranını artırmak için gereksiz abonelikleri gözden geçir ve büyük harcamalardan önce 24 saat bekle kuralını uygula.`;
  }

  if (lower.includes('alışkanlık') || lower.includes('streak') || lower.includes('seri')) {
    const streak = context.match(/toplam seri: (\d+)/)?.[1] || '0';
    return `🔥 Toplam seri: ${streak} gün! Harika gidiyorsun.\n\n💡 İpucu: Alışkanlıklarını zincir şeklinde bağla — örneğin kahve yaparken su iç, yürüyüşten sonra meditasyon yap.`;
  }

  if (lower.includes('merhaba') || lower.includes('selam') || lower.includes('nasıl')) {
    return `Merhaba! 👋 Ben HAYAT asistanın. Görevlerin, harcamaların veya alışkanlıkların hakkında sohbet edebiliriz. Ne hakkında konuşmak istersin?`;
  }

  if (lower.includes('motivasyon') || lower.includes('motiv')) {
    return `💪 "Başarı, küçük çabaların her gün tekrarlanmasından oluşur."\n\nBugün bile bir adım atman, seni dünden ileride tutar. Haydi, en önemli görevle başla!`;
  }

  if (lower.includes('öneri') || lower.includes('tavsiye') || lower.includes('ne yapmalı')) {
    return `🎯 İşte bugün için 3 öneri:\n\n1. Gecikmiş görevlerini kontrol et ve en önemlisini bitir\n2. Bugünkü harcamalarını gir — kayıt tutmak farkındalığı artırır\n3. En az bir alışkanlığını tamamla — seri kırma! 🔥`;
  }

  return `Anladım! Seninle görevlerin, harcamaların veya alışkanlıkların hakkında konuşabilirim. 🎯\n\n💡 Şunu deneyebilirsin:\n• "Görevlerim nasıl?"\n• "Bu ay ne kadar harcadım?"\n• "Alışkanlık serim nasıl gidiyor?"`;
}

// ─── AI Insights (auto-generated) ───────────────────────────
router.get(
  '/insights',
  asyncHandler(async (req, res) => {
    const context = await getUserContext(req.userId);
    const insights = [];

    // Parse context for insights
    const overdue = parseInt(context.match(/(\d+) gecikmiş/)?.[1] || '0');
    const todo = parseInt(context.match(/(\d+) bekleyen/)?.[1] || '0');
    const completedWeek = parseInt(context.match(/(\d+) bu hafta tamamlanan/)?.[1] || '0');

    if (overdue > 0) {
      insights.push({
        type: 'warning',
        icon: '⚠️',
        title: 'Gecikmiş Görevler',
        message: `${overdue} görev tarihi geçmiş. Bugün en az birini halletmeyi dene.`,
        action: 'tasks',
      });
    }

    if (completedWeek >= 10) {
      insights.push({
        type: 'success',
        icon: '🏆',
        title: 'Üretken Hafta!',
        message: `Bu hafta ${completedWeek} görev tamamladın. Harika iş!`,
        action: null,
      });
    }

    // Finance insights
    const expenses = parseFloat(context.match(/₺([\d.,]+) harcama/)?.[1]?.replace('.', '').replace(',', '.') || '0');
    const income = parseFloat(context.match(/₺([\d.,]+) gelir/)?.[1]?.replace('.', '').replace(',', '.') || '0');

    if (income > 0 && expenses / income > 0.9) {
      insights.push({
        type: 'warning',
        icon: '💸',
        title: 'Harcama Uyarısı',
        message: 'Harcamaların gelirinin %90\'ını aştı. Bütçeni gözden geçir.',
        action: 'finance',
      });
    } else if (income > 0 && expenses / income < 0.5) {
      insights.push({
        type: 'success',
        icon: '💰',
        title: 'Tasarruf Şampiyonu',
        message: 'Gelirinin %50\'sinden azını harcıyorsun. Harika finansal disiplin!',
        action: 'finance',
      });
    }

    // Habit insights
    const totalStreak = parseInt(context.match(/toplam seri: (\d+)/)?.[1] || '0');
    if (totalStreak > 20) {
      insights.push({
        type: 'success',
        icon: '🔥',
        title: 'Seri Gücü!',
        message: `Toplam ${totalStreak} günlük seri. Bu disiplini koru!`,
        action: 'habits',
      });
    }

    if (todo > 15) {
      insights.push({
        type: 'info',
        icon: '📋',
        title: 'Görev Yığılması',
        message: `${todo} bekleyen görev birikmiş. Önceliklendirme zamanı!`,
        action: 'tasks',
      });
    }

    // Always give at least one insight
    if (insights.length === 0) {
      insights.push({
        type: 'info',
        icon: '💡',
        title: 'Günlük İpucu',
        message: 'Bugün en önemli 3 görevini belirle ve onlara odaklan. Geri kalanı bonus!',
        action: null,
      });
    }

    res.json({ success: true, data: insights });
  })
);

// ─── Weekly Report ──────────────────────────────────────────
router.get(
  '/weekly-report',
  asyncHandler(async (req, res) => {
    const [taskWeek, financeWeek, habitWeek, dailyProductivity] = await Promise.all([
      getOne(
        `SELECT
          COUNT(*) FILTER (WHERE completed_at >= CURRENT_DATE - INTERVAL '7 days') AS completed,
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') AS created,
          COUNT(*) FILTER (WHERE due_date < NOW() AND status NOT IN ('done','archived')) AS overdue
         FROM tasks WHERE user_id = $1 AND deleted_at IS NULL`,
        [req.userId]
      ),
      getOne(
        `SELECT
          COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0) AS expenses,
          COALESCE(SUM(amount) FILTER (WHERE type = 'income'), 0) AS income,
          COUNT(*) AS tx_count
         FROM transactions
         WHERE user_id = $1 AND deleted_at IS NULL
           AND date >= CURRENT_DATE - INTERVAL '7 days'`,
        [req.userId]
      ),
      getOne(
        `SELECT COUNT(DISTINCT habit_id) AS habits_active,
                COUNT(*) AS completions
         FROM habit_completions
         WHERE user_id = $1 AND completed_date >= CURRENT_DATE - INTERVAL '7 days'`,
        [req.userId]
      ),
      getMany(
        `SELECT
          d.date,
          COALESCE(t.completed, 0) AS tasks_completed,
          COALESCE(h.completions, 0) AS habits_completed,
          COALESCE(e.spent, 0) AS amount_spent
         FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day') AS d(date)
         LEFT JOIN LATERAL (
           SELECT COUNT(*) AS completed FROM tasks
           WHERE user_id = $1 AND deleted_at IS NULL AND completed_at::DATE = d.date
         ) t ON TRUE
         LEFT JOIN LATERAL (
           SELECT COUNT(*) AS completions FROM habit_completions
           WHERE user_id = $1 AND completed_date = d.date
         ) h ON TRUE
         LEFT JOIN LATERAL (
           SELECT COALESCE(SUM(amount), 0) AS spent FROM transactions
           WHERE user_id = $1 AND deleted_at IS NULL AND type = 'expense' AND date = d.date
         ) e ON TRUE
         ORDER BY d.date`,
        [req.userId]
      ),
    ]);

    // Calculate scores
    const taskScore = Math.min(100, (parseInt(taskWeek.completed) / Math.max(1, parseInt(taskWeek.created))) * 100);
    const savingsRate = parseFloat(financeWeek.income) > 0
      ? ((parseFloat(financeWeek.income) - parseFloat(financeWeek.expenses)) / parseFloat(financeWeek.income)) * 100
      : 0;
    const habitScore = parseInt(habitWeek.completions) > 0 ? Math.min(100, (parseInt(habitWeek.completions) / 7) * 100 / Math.max(1, parseInt(habitWeek.habits_active))) : 0;
    const overallScore = Math.round((taskScore + Math.max(0, savingsRate) + habitScore) / 3);

    res.json({
      success: true,
      data: {
        period: {
          start: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
          end: new Date().toISOString().split('T')[0],
        },
        scores: {
          overall: overallScore,
          tasks: Math.round(taskScore),
          finance: Math.round(Math.max(0, savingsRate)),
          habits: Math.round(habitScore),
        },
        tasks: {
          completed: parseInt(taskWeek.completed),
          created: parseInt(taskWeek.created),
          overdue: parseInt(taskWeek.overdue),
        },
        finance: {
          expenses: parseFloat(financeWeek.expenses),
          income: parseFloat(financeWeek.income),
          net: parseFloat(financeWeek.income) - parseFloat(financeWeek.expenses),
          transactionCount: parseInt(financeWeek.tx_count),
        },
        habits: {
          activeCount: parseInt(habitWeek.habits_active),
          completions: parseInt(habitWeek.completions),
        },
        dailyBreakdown: dailyProductivity.map((d) => ({
          date: d.date,
          tasksCompleted: parseInt(d.tasks_completed),
          habitsCompleted: parseInt(d.habits_completed),
          amountSpent: parseFloat(d.amount_spent),
        })),
      },
    });
  })
);

// ─── Chat History ───────────────────────────────────────────
router.get(
  '/conversations',
  asyncHandler(async (req, res) => {
    const conversations = await getMany(
      `SELECT c.*, (SELECT content FROM ai_messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message
       FROM ai_conversations c
       WHERE c.user_id = $1
       ORDER BY c.updated_at DESC LIMIT 20`,
      [req.userId]
    );
    res.json({ success: true, data: conversations });
  })
);

router.get(
  '/conversations/:id/messages',
  asyncHandler(async (req, res) => {
    const messages = await getMany(
      `SELECT role, content, created_at FROM ai_messages
       WHERE conversation_id = $1 ORDER BY created_at`,
      [req.params.id]
    );
    res.json({ success: true, data: messages });
  })
);

export default router;
