// ============================================================
// HAYAT Mobile — App Data Context
// Global state for dashboard, tasks, finance, habits, AI
// ============================================================
import React, { createContext, useContext, useReducer, useCallback } from 'react';
import api from '../services/api';
import * as Haptics from 'expo-haptics';

const AppContext = createContext(null);

const initialState = {
  dashboard: null,
  insights: [],
  tasks: [],
  taskStats: null,
  transactions: [],
  financeAnalytics: null,
  budgets: [],
  habits: [],
  habitAnalytics: null,
  aiMessages: [],
  aiConversationId: null,
  notifications: [],
  unreadCount: 0,
  loading: {},
};

function appReducer(state, action) {
  switch (action.type) {
    case 'SET':
      return { ...state, ...action.payload };
    case 'SET_LOADING':
      return { ...state, loading: { ...state.loading, [action.key]: action.value } };

    // Tasks
    case 'ADD_TASK':
      return { ...state, tasks: [action.task, ...state.tasks] };
    case 'UPDATE_TASK':
      return { ...state, tasks: state.tasks.map(t => t.id === action.task.id ? { ...t, ...action.task } : t) };
    case 'REMOVE_TASK':
      return { ...state, tasks: state.tasks.filter(t => t.id !== action.id) };

    // Finance
    case 'ADD_TRANSACTION':
      return { ...state, transactions: [action.tx, ...state.transactions] };
    case 'REMOVE_TRANSACTION':
      return { ...state, transactions: state.transactions.filter(t => t.id !== action.id) };

    // Habits
    case 'ADD_HABIT':
      return { ...state, habits: [...state.habits, action.habit] };
    case 'TOGGLE_HABIT':
      return {
        ...state,
        habits: state.habits.map(h =>
          h.id === action.id
            ? {
                ...h,
                completed_today: !h.completed_today,
                current_streak: h.completed_today ? h.current_streak - 1 : h.current_streak + 1,
              }
            : h
        ),
      };

    // AI
    case 'AI_MESSAGE':
      return { ...state, aiMessages: [...state.aiMessages, action.msg] };
    case 'CLEAR_AI':
      return { ...state, aiMessages: [], aiConversationId: null };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // ─── Dashboard ──────────────────────────────────────────
  const loadDashboard = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', key: 'dashboard', value: true });
    try {
      const [dashRes, insRes] = await Promise.all([
        api.getDashboard(),
        api.getInsights(),
      ]);
      dispatch({ type: 'SET', payload: { dashboard: dashRes.data, insights: insRes.data } });
    } catch (e) {
      console.warn('[App] Dashboard load error:', e.message);
    }
    dispatch({ type: 'SET_LOADING', key: 'dashboard', value: false });
  }, []);

  // ─── Tasks ──────────────────────────────────────────────
  const loadTasks = useCallback(async (filters = {}) => {
    dispatch({ type: 'SET_LOADING', key: 'tasks', value: true });
    try {
      const [taskRes, statsRes] = await Promise.all([
        api.getTasks(filters),
        api.getTaskStats(),
      ]);
      dispatch({ type: 'SET', payload: { tasks: taskRes.data, taskStats: statsRes.data } });
    } catch (e) {
      console.warn('[App] Tasks load error:', e.message);
    }
    dispatch({ type: 'SET_LOADING', key: 'tasks', value: false });
  }, []);

  const createTask = useCallback(async (data) => {
    const res = await api.createTask(data);
    dispatch({ type: 'ADD_TASK', task: res.data });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    return res.data;
  }, []);

  const toggleTask = useCallback(async (task) => {
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    await api.updateTask(task.id, { status: newStatus });
    dispatch({ type: 'UPDATE_TASK', task: { id: task.id, status: newStatus } });
    if (newStatus === 'done') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, []);

  const deleteTask = useCallback(async (id) => {
    await api.deleteTask(id);
    dispatch({ type: 'REMOVE_TASK', id });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  // ─── Finance ────────────────────────────────────────────
  const loadFinance = useCallback(async (period = 'month') => {
    dispatch({ type: 'SET_LOADING', key: 'finance', value: true });
    try {
      const [txRes, anlRes, budRes] = await Promise.all([
        api.getTransactions({ limit: 30 }),
        api.getFinanceAnalytics(period),
        api.getBudgets(),
      ]);
      dispatch({ type: 'SET', payload: {
        transactions: txRes.data,
        financeAnalytics: anlRes.data,
        budgets: budRes.data,
      }});
    } catch (e) {
      console.warn('[App] Finance load error:', e.message);
    }
    dispatch({ type: 'SET_LOADING', key: 'finance', value: false });
  }, []);

  const createTransaction = useCallback(async (data) => {
    const res = await api.createTransaction(data);
    dispatch({ type: 'ADD_TRANSACTION', tx: res.data });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    return res.data;
  }, []);

  // ─── Habits ─────────────────────────────────────────────
  const loadHabits = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', key: 'habits', value: true });
    try {
      const [habRes, anlRes] = await Promise.all([
        api.getHabits(),
        api.getHabitAnalytics(),
      ]);
      dispatch({ type: 'SET', payload: { habits: habRes.data, habitAnalytics: anlRes.data } });
    } catch (e) {
      console.warn('[App] Habits load error:', e.message);
    }
    dispatch({ type: 'SET_LOADING', key: 'habits', value: false });
  }, []);

  const createHabit = useCallback(async (data) => {
    const res = await api.createHabit(data);
    dispatch({ type: 'ADD_HABIT', habit: { ...res.data, completed_today: false, week_completions: [] } });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    return res.data;
  }, []);

  const toggleHabit = useCallback(async (habit) => {
    try {
      if (habit.completed_today) {
        await api.uncompleteHabit(habit.id);
      } else {
        await api.completeHabit(habit.id);
      }
      dispatch({ type: 'TOGGLE_HABIT', id: habit.id });
      if (!habit.completed_today) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {
      throw e;
    }
  }, []);

  // ─── AI ─────────────────────────────────────────────────
  const sendAIMessage = useCallback(async (message) => {
    dispatch({ type: 'AI_MESSAGE', msg: { role: 'user', content: message } });
    dispatch({ type: 'SET_LOADING', key: 'ai', value: true });
    try {
      const res = await api.sendAIMessage(message, state.aiConversationId);
      dispatch({ type: 'AI_MESSAGE', msg: { role: 'assistant', content: res.data.message } });
      dispatch({ type: 'SET', payload: { aiConversationId: res.data.conversation_id } });
    } catch (e) {
      dispatch({ type: 'AI_MESSAGE', msg: { role: 'assistant', content: 'Üzgünüm, bir hata oluştu. Tekrar dene.' } });
    }
    dispatch({ type: 'SET_LOADING', key: 'ai', value: false });
  }, [state.aiConversationId]);

  const value = {
    ...state, dispatch,
    loadDashboard, loadTasks, createTask, toggleTask, deleteTask,
    loadFinance, createTransaction,
    loadHabits, createHabit, toggleHabit,
    sendAIMessage,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be inside AppProvider');
  return context;
};

export default AppContext;
