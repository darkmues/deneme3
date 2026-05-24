// ============================================================
// HAYAT API — Dashboard Route
// Aggregated overview for the main screen
// ============================================================
import { Router } from 'express';
import { getOne, getMany } from '../models/db.js';
import { asyncHandler } from '../utils/errors.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const [user, taskStats, todayTasks, financeMonth, budgetAlerts, habitSummary, todayHabits, recentAchievements, unreadNotifs, weeklyTrend] = await Promise.all([
      // User basic info
      getOne('SELECT full_name, plan, streak_shield FROM users WHERE id = $1', [req.userId]),

      // Task overview
      getOne(
        `SELECT
          COUNT(*) FILTER (WHERE status = 'todo') AS todo,
          COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress,
          COUNT(*) FILTER (WHERE status = 'done') AS done,
          COUNT(*) FILTER (WHERE due_date < NOW() AND status NOT IN ('done','archived')) AS overdue,
          COUNT(*) FILTER (WHERE due_date::DATE = CURRENT_DATE AND status NOT IN ('done','archived')) AS due_today,
          COUNT(*) FILTER (WHERE completed_at::DATE = CURRENT_DATE) AS completed_today
         FROM tasks WHERE user_id = $1 AND deleted_at IS NULL`,
        [req.userId]
      ),

      // Today's priority tasks
      getMany(
        `SELECT id, title, priority, status, due_date FROM tasks
         WHERE user_id = $1 AND deleted_at IS NULL AND status NOT IN ('done','archived')
         ORDER BY CASE priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
                  COALESCE(due_date, '9999-12-31'::timestamptz)
         LIMIT 5`,
        [req.userId]
      ),

      // Monthly finance
      getOne(
        `SELECT
          COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0) AS expenses,
          COALESCE(SUM(amount) FILTER (WHERE type = 'income'), 0) AS income
         FROM transactions
         WHERE user_id = $1 AND deleted_at IS NULL
           AND DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE)`,
        [req.userId]
      ),

      // Budget alerts
      getMany(
        `SELECT b.name, b.amount, COALESCE(s.spent, 0) AS spent
         FROM budgets b
         LEFT JOIN LATERAL (
           SELECT SUM(t.amount) AS spent FROM transactions t
           WHERE t.user_id = b.user_id AND t.type = 'expense' AND t.deleted_at IS NULL
             AND t.category_id = b.category_id
             AND DATE_TRUNC(
                   CASE b.period WHEN 'weekly' THEN 'week' WHEN 'yearly' THEN 'year' ELSE 'month' END,
                   t.date
                 ) = DATE_TRUNC(
                   CASE b.period WHEN 'weekly' THEN 'week' WHEN 'yearly' THEN 'year' ELSE 'month' END,
                   CURRENT_DATE
                 )
         ) s ON TRUE
         WHERE b.user_id = $1 AND b.is_active = TRUE
           AND COALESCE(s.spent, 0) >= b.amount * b.alert_threshold`,
        [req.userId]
      ),

      // Habit summary
      getOne(
        `SELECT COUNT(*) AS total,
                SUM(current_streak) AS total_streak,
                MAX(current_streak) AS best_active_streak
         FROM habits WHERE user_id = $1 AND deleted_at IS NULL AND is_active = TRUE`,
        [req.userId]
      ),

      // Today's habit completions
      getMany(
        `SELECT h.id, h.name, h.icon, h.color, h.current_streak,
                CASE WHEN hc.id IS NOT NULL THEN TRUE ELSE FALSE END AS completed_today
         FROM habits h
         LEFT JOIN habit_completions hc ON h.id = hc.habit_id AND hc.completed_date = CURRENT_DATE
         WHERE h.user_id = $1 AND h.deleted_at IS NULL AND h.is_active = TRUE
         ORDER BY h.sort_order`,
        [req.userId]
      ),

      // Recent achievements
      getMany(
        `SELECT a.name, a.icon, a.points, ua.unlocked_at
         FROM user_achievements ua
         JOIN achievements a ON ua.achievement_id = a.id
         WHERE ua.user_id = $1
         ORDER BY ua.unlocked_at DESC LIMIT 3`,
        [req.userId]
      ),

      // Unread notifications count
      getOne(
        'SELECT COUNT(*) AS count FROM notifications WHERE user_id = $1 AND read_at IS NULL',
        [req.userId]
      ),

      // 7-day productivity trend
      getMany(
        `SELECT d.date,
          COALESCE(t.cnt, 0) AS tasks_done,
          COALESCE(h.cnt, 0) AS habits_done
         FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day') d(date)
         LEFT JOIN LATERAL (
           SELECT COUNT(*) AS cnt FROM tasks
           WHERE user_id = $1 AND deleted_at IS NULL AND completed_at::DATE = d.date
         ) t ON TRUE
         LEFT JOIN LATERAL (
           SELECT COUNT(*) AS cnt FROM habit_completions
           WHERE user_id = $1 AND completed_date = d.date
         ) h ON TRUE
         ORDER BY d.date`,
        [req.userId]
      ),
    ]);

    // Calculate Hayat Score
    const taskCompletion = parseInt(taskStats.done) / Math.max(1, parseInt(taskStats.todo) + parseInt(taskStats.in_progress) + parseInt(taskStats.done)) * 100;
    const habitRate = todayHabits.length > 0
      ? (todayHabits.filter((h) => h.completed_today).length / todayHabits.length) * 100
      : 0;
    const savings = parseFloat(financeMonth.income) > 0
      ? ((parseFloat(financeMonth.income) - parseFloat(financeMonth.expenses)) / parseFloat(financeMonth.income)) * 100
      : 0;
    const hayatScore = Math.round((Math.min(100, taskCompletion) + Math.min(100, habitRate) + Math.max(0, Math.min(100, savings))) / 3);

    res.json({
      success: true,
      data: {
        user: {
          name: user.full_name,
          plan: user.plan,
        },
        hayatScore,
        scoreBreakdown: {
          tasks: Math.round(Math.min(100, taskCompletion)),
          habits: Math.round(habitRate),
          finance: Math.round(Math.max(0, Math.min(100, savings))),
        },
        tasks: {
          ...Object.fromEntries(Object.entries(taskStats).map(([k, v]) => [k, parseInt(v)])),
          priority: todayTasks,
        },
        finance: {
          monthlyExpenses: parseFloat(financeMonth.expenses),
          monthlyIncome: parseFloat(financeMonth.income),
          netSavings: parseFloat(financeMonth.income) - parseFloat(financeMonth.expenses),
          budgetAlerts: budgetAlerts.map((b) => ({
            name: b.name,
            limit: parseFloat(b.amount),
            spent: parseFloat(b.spent),
            percentage: Math.round((parseFloat(b.spent) / parseFloat(b.amount)) * 100),
          })),
        },
        habits: {
          total: parseInt(habitSummary?.total || 0),
          totalStreak: parseInt(habitSummary?.total_streak || 0),
          bestActiveStreak: parseInt(habitSummary?.best_active_streak || 0),
          today: todayHabits.map((h) => ({
            id: h.id,
            name: h.name,
            icon: h.icon,
            color: h.color,
            streak: h.current_streak,
            done: h.completed_today,
          })),
        },
        achievements: recentAchievements,
        unreadNotifications: parseInt(unreadNotifs.count),
        weeklyTrend: weeklyTrend.map((d) => ({
          date: d.date,
          tasks: parseInt(d.tasks_done),
          habits: parseInt(d.habits_done),
        })),
      },
    });
  })
);

export default router;
