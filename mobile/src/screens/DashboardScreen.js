// ============================================================
// HAYAT Mobile — Dashboard Screen
// ============================================================
import React, { useEffect, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, StyleSheet } from 'react-native';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Card, ScoreRing, ProgressBar, StatCard, Badge, SectionHeader } from '../components/UI';
import { colors, spacing, radius, fonts, fontSize } from '../theme';

export default function DashboardScreen({ navigation }) {
  const { dashboard: d, insights, loadDashboard, loading, toggleHabit, habits } = useApp();
  const { user } = useAuth();

  useEffect(() => { loadDashboard(); }, []);

  const onRefresh = useCallback(() => { loadDashboard(); }, []);

  if (!d) {
    return (
      <View style={s.center}>
        <Text style={{ fontSize: 28, fontFamily: fonts.serif, color: colors.amber }}>HAYAT</Text>
        <Text style={{ color: colors.textDim, marginTop: 8 }}>Yükleniyor...</Text>
      </View>
    );
  }

  const dayNames = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={!!loading.dashboard} onRefresh={onRefresh} tintColor={colors.amber} />}>

      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.greeting}>Merhaba, {d.user?.name?.split(' ')[0]} 👋</Text>
          <Text style={s.date}>
            {new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
        </View>
        {d.unreadNotifications > 0 && (
          <Badge color={colors.red}>🔔 {d.unreadNotifications}</Badge>
        )}
      </View>

      {/* Score + Breakdown */}
      <View style={s.scoreSection}>
        <Card style={s.scoreCard}>
          <ScoreRing score={d.hayatScore || 0} size={130} strokeWidth={10} label="Hayat Skor" />
        </Card>

        <View style={s.breakdownCol}>
          {[
            { label: 'Görevler', value: d.scoreBreakdown?.tasks || 0, icon: '📋', color: colors.blue },
            { label: 'Alışkanlıklar', value: d.scoreBreakdown?.habits || 0, icon: '🔥', color: colors.green },
            { label: 'Finans', value: d.scoreBreakdown?.finance || 0, icon: '💰', color: colors.amber },
          ].map(item => (
            <Card key={item.label} style={s.breakdownCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ fontSize: 16 }}>{item.icon}</Text>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: fontSize.xs, color: colors.textDim }}>{item.label}</Text>
                    <Text style={{ fontSize: fontSize.xs, fontFamily: fonts.bold, color: item.color }}>{item.value}%</Text>
                  </View>
                  <ProgressBar value={item.value} max={100} color={item.color} />
                </View>
              </View>
            </Card>
          ))}
        </View>
      </View>

      {/* Quick Stats */}
      <View style={s.statsRow}>
        <StatCard icon="📝" label="Bekleyen" value={d.tasks?.todo || 0} color={colors.blue} />
        <StatCard icon="⚠️" label="Gecikmiş" value={d.tasks?.overdue || 0} color={colors.red} />
        <StatCard icon="💸" label="Harcama" value={`₺${((d.finance?.monthlyExpenses || 0) / 1000).toFixed(0)}K`} color={colors.pink} />
        <StatCard icon="🔥" label="Seri" value={d.habits?.totalStreak || 0} color={colors.green} />
      </View>

      {/* Today's Habits */}
      {d.habits?.today?.length > 0 && (
        <View style={{ marginTop: spacing.lg }}>
          <SectionHeader title="Bugünkü Alışkanlıklar" actionText="Tümü →" onAction={() => navigation.navigate('Habits')} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -spacing.xl }}>
            <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: spacing.xl }}>
              {d.habits.today.map(h => (
                <TouchableOpacity key={h.id} activeOpacity={0.7}
                  onPress={() => {
                    const fullHabit = habits?.find(hh => hh.id === h.id);
                    if (fullHabit) toggleHabit(fullHabit);
                  }}
                  style={[s.habitPill, {
                    borderColor: h.done ? h.color + '60' : colors.border,
                    backgroundColor: h.done ? h.color + '15' : 'transparent',
                  }]}>
                  <Text style={{ fontSize: 16 }}>{h.icon}</Text>
                  <Text style={{
                    fontSize: fontSize.sm, color: h.done ? h.color : colors.textDim,
                    textDecorationLine: h.done ? 'line-through' : 'none',
                  }}>{h.name}</Text>
                  {h.streak > 0 && <Text style={{ fontSize: 10, color: colors.amber }}>🔥{h.streak}</Text>}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Weekly Trend */}
      {d.weeklyTrend?.length > 0 && (
        <View style={{ marginTop: spacing.xl }}>
          <SectionHeader title="Haftalık Trend" />
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 100 }}>
              {d.weeklyTrend.map((day, i) => {
                const maxVal = Math.max(...d.weeklyTrend.map(dd => dd.tasks + dd.habits), 1);
                const dateObj = new Date(day.date);
                return (
                  <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                    <Text style={{ fontSize: 9, color: colors.textDim }}>{day.tasks + day.habits}</Text>
                    <View style={{ width: '100%', gap: 2 }}>
                      <View style={{
                        height: Math.max(4, (day.tasks / maxVal) * 70),
                        backgroundColor: colors.blue, borderRadius: 3,
                      }} />
                      <View style={{
                        height: Math.max(4, (day.habits / maxVal) * 70),
                        backgroundColor: colors.green, borderRadius: 3,
                      }} />
                    </View>
                    <Text style={{ fontSize: 9, color: colors.textMuted }}>{dayNames[dateObj.getDay()]}</Text>
                  </View>
                );
              })}
            </View>
            <View style={{ flexDirection: 'row', gap: 16, marginTop: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: colors.blue }} />
                <Text style={{ fontSize: 10, color: colors.textDim }}>Görevler</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: colors.green }} />
                <Text style={{ fontSize: 10, color: colors.textDim }}>Alışkanlıklar</Text>
              </View>
            </View>
          </Card>
        </View>
      )}

      {/* AI Insights */}
      {insights?.length > 0 && (
        <View style={{ marginTop: spacing.xl }}>
          <SectionHeader title="🧠 AI Öngörüler" />
          {insights.map((ins, i) => (
            <Card key={i} style={[s.insightCard, {
              borderLeftColor: ins.type === 'warning' ? colors.red : ins.type === 'success' ? colors.green : colors.blue,
            }]}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                <Text style={{ fontSize: 20 }}>{ins.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: fontSize.sm, fontFamily: fonts.semibold, color: colors.text }}>{ins.title}</Text>
                  <Text style={{ fontSize: fontSize.xs, color: colors.textDim, marginTop: 2 }}>{ins.message}</Text>
                </View>
              </View>
            </Card>
          ))}
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl },
  greeting: { fontSize: fontSize.xxl, fontFamily: fonts.serif, color: colors.text },
  date: { fontSize: fontSize.sm, color: colors.textDim, marginTop: 2 },
  scoreSection: { flexDirection: 'row', gap: spacing.md },
  scoreCard: { padding: spacing.xxl, alignItems: 'center', justifyContent: 'center' },
  breakdownCol: { flex: 1, gap: spacing.sm },
  breakdownCard: { padding: spacing.md },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  habitPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.md,
    borderWidth: 1,
  },
  insightCard: {
    padding: spacing.lg, marginBottom: spacing.sm, borderLeftWidth: 3,
  },
});
