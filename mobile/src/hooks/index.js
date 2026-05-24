// ============================================================
// HAYAT Mobile — Custom Hooks
// ============================================================
import { useState, useCallback, useEffect, useRef } from 'react';

// Pull-to-refresh wrapper
export function useRefreshable(loadFn) {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadFn();
    } catch (e) {
      console.warn('[Refresh]', e.message);
    }
    setRefreshing(false);
  }, [loadFn]);

  return { refreshing, onRefresh };
}

// Debounce hook
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// Previous value tracker
export function usePrevious(value) {
  const ref = useRef();
  useEffect(() => { ref.current = value; });
  return ref.current;
}

// Interval hook
export function useInterval(callback, delay) {
  const savedCallback = useRef();

  useEffect(() => { savedCallback.current = callback; }, [callback]);

  useEffect(() => {
    if (delay === null) return;
    const id = setInterval(() => savedCallback.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}

// Format currency
export function formatCurrency(amount, currency = 'TRY') {
  const symbols = { TRY: '₺', USD: '$', EUR: '€', GBP: '£' };
  const symbol = symbols[currency] || currency;
  return `${symbol}${parseFloat(amount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// Relative date
export function relativeDate(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) return 'Bugün';
  if (diffDays === 1) return 'Dün';
  if (diffDays < 7) return `${diffDays} gün önce`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} hafta önce`;
  return date.toLocaleDateString('tr-TR');
}

// Streak emoji based on count
export function streakEmoji(streak) {
  if (streak >= 100) return '👑';
  if (streak >= 30) return '💎';
  if (streak >= 14) return '⚡';
  if (streak >= 7) return '🔥';
  if (streak >= 3) return '✨';
  return '🌱';
}
