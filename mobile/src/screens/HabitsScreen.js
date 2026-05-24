// ============================================================
// HAYAT Mobile — Habits Screen
// ============================================================
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, RefreshControl,
  StyleSheet, Modal, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { Card, Button, Input, EmptyState, SectionHeader, StatCard } from '../components/UI';
import { colors, spacing, radius, fonts, fontSize } from '../theme';

const ICONS = ['🎯', '💪', '📚', '🧘', '🏃', '💧', '🌅', '🧠', '✍️', '🎨', '🏋️', '😴', '🚶', '🍎'];

export default function HabitsScreen() {
  const { habits, habitAnalytics: ha, loadHabits, createHabit, toggleHabit, loading } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [newHabit, setNewHabit] = useState({ name: '', icon: '🎯', color: '#E8A838' });

  useEffect(() => { loadHabits(); }, []);
  const onRefresh = useCallback(() => loadHabits(), []);

  const handleAdd = async () => {
    if (!newHabit.name.trim()) return;
    try {
      await createHabit(newHabit);
      setNewHabit({ name: '', icon: '🎯', color: '#E8A838' });
      setShowAdd(false);
    } catch (e) {
      Alert.alert('Hata', e.message);
    }
  };

  const handleToggle = async (habit) => {
    try {
      await toggleHabit(habit);
    } catch (e) {
      Alert.alert('Hata', e.message);
    }
  };

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={!!loading.habits} onRefresh={onRefresh} tintColor={colors.amber} />}>

        <View style={s.header}>
          <Text style={s.title}>Alışkanlıklar</Text>
          <Button title="+ Yeni" onPress={() => setShowAdd(true)} size="sm" />
        </View>

        {/* Stats */}
        {ha && (
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
            <StatCard icon="🔥" label="Toplam Seri" value={ha.totalStreak || 0} color={colors.amber} />
            <StatCard icon="🏆" label="En İyi" value={ha.maxStreak || 0} color={colors.green} />
            <StatCard icon="🎯" label="Aktif" value={ha.totalHabits || 0} color={colors.blue} />
          </View>
        )}

        {/* Heatmap */}
        {ha?.heatmap?.length > 0 && (
          <>
            <SectionHeader title="30 Gün Aktivite" />
            <Card style={{ marginBottom: spacing.lg }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 3 }}>
                {ha.heatmap.map((d, i) => (
                  <View key={i} style={{
                    width: 14, height: 14, borderRadius: 3,
                    backgroundColor: d.count === 0 ? colors.border
                      : d.count <= 2 ? colors.green + '40'
                      : d.count <= 4 ? colors.green + '80'
                      : colors.green,
                  }} />
                ))}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
                <Text style={{ fontSize: 10, color: colors.textDim }}>Az</Text>
                {['40', '80', 'FF'].map((op, i) => (
                  <View key={i} style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: colors.green + op }} />
                ))}
                <Text style={{ fontSize: 10, color: colors.textDim }}>Çok</Text>
              </View>
            </Card>
          </>
        )}

        {/* Habit List */}
        {habits.length === 0 ? (
          <EmptyState icon="🌱" title="Henüz alışkanlık yok" subtitle="İlk alışkanlığını ekle ve seriyi başlat!" />
        ) : (
          habits.map(h => (
            <Card key={h.id} style={s.habitCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                {/* Toggle Button */}
                <TouchableOpacity onPress={() => handleToggle(h)}
                  style={[s.habitToggle, {
                    borderColor: h.completed_today ? h.color : colors.border,
                    backgroundColor: h.completed_today ? h.color + '20' : 'transparent',
                  }]}>
                  <Text style={{ fontSize: 20 }}>{h.completed_today ? '✓' : h.icon}</Text>
                </TouchableOpacity>

                {/* Info */}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: fontSize.md, fontFamily: fonts.semibold, color: colors.text }}>{h.name}</Text>
                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
                    {h.current_streak > 0 && (
                      <Text style={{ fontSize: fontSize.xs, color: colors.amber }}>🔥 {h.current_streak} gün</Text>
                    )}
                    <Text style={{ fontSize: fontSize.xs, color: colors.textDim }}>
                      {h.frequency === 'daily' ? 'Her gün' : 'Haftalık'}
                    </Text>
                    {h.best_streak > 0 && (
                      <Text style={{ fontSize: fontSize.xs, color: colors.textMuted }}>🏆 {h.best_streak}</Text>
                    )}
                  </View>
                </View>

                {/* Week dots */}
                <View style={{ flexDirection: 'row', gap: 3 }}>
                  {Array.from({ length: 7 }).map((_, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() - (6 - i));
                    const dateStr = d.toISOString().split('T')[0];
                    const done = h.week_completions?.some(wc => {
                      const wcStr = typeof wc === 'string' ? wc : wc?.toISOString?.()?.split('T')[0];
                      return wcStr === dateStr;
                    });
                    return (
                      <View key={i} style={{
                        width: 8, height: 8, borderRadius: 8,
                        backgroundColor: done ? h.color : colors.border,
                      }} />
                    );
                  })}
                </View>
              </View>
            </Card>
          ))
        )}

        {/* Consistency Ranking */}
        {ha?.habitConsistency?.length > 0 && (
          <>
            <SectionHeader title="Tutarlılık Sıralaması" />
            {ha.habitConsistency.map((h, i) => (
              <Card key={h.id} style={{ padding: spacing.md, marginBottom: spacing.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Text style={{ fontSize: 14, fontFamily: fonts.bold, color: colors.textDim, width: 20 }}>#{i + 1}</Text>
                  <Text style={{ fontSize: 16 }}>{h.icon}</Text>
                  <Text style={{ flex: 1, fontSize: fontSize.sm, color: colors.text }}>{h.name}</Text>
                  <Text style={{
                    fontSize: fontSize.sm, fontFamily: fonts.bold,
                    color: h.rate >= 80 ? colors.green : h.rate >= 50 ? colors.amber : colors.red,
                  }}>%{h.rate}</Text>
                </View>
              </Card>
            ))}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Add Habit Modal */}
      <Modal visible={showAdd} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.modalOverlay}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>Yeni Alışkanlık</Text>

            <Input label="Alışkanlık Adı" value={newHabit.name}
              onChangeText={t => setNewHabit({ ...newHabit, name: t })}
              placeholder="Örn: Su iç, Meditasyon..."
              containerStyle={{ marginBottom: spacing.lg }} />

            {/* Icon Picker */}
            <Text style={{ fontSize: fontSize.sm, color: colors.textDim, fontFamily: fonts.medium, marginBottom: 8 }}>İkon Seç</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.xl }}>
              {ICONS.map(ic => (
                <TouchableOpacity key={ic} onPress={() => setNewHabit({ ...newHabit, icon: ic })}
                  style={[s.iconChip, newHabit.icon === ic && { borderColor: colors.amber, backgroundColor: colors.amberDim }]}>
                  <Text style={{ fontSize: 20 }}>{ic}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button title="Ekle" onPress={handleAdd} style={{ flex: 1 }} />
              <Button title="İptal" variant="ghost" onPress={() => setShowAdd(false)} style={{ flex: 1 }} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  title: { fontSize: fontSize.xxl, fontFamily: fonts.serif, color: colors.text },
  habitCard: { padding: spacing.lg, marginBottom: spacing.sm },
  habitToggle: {
    width: 48, height: 48, borderRadius: 14, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalContent: {
    backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: spacing.xxl, paddingBottom: 40,
  },
  modalTitle: { fontSize: fontSize.xl, fontFamily: fonts.semibold, color: colors.text, marginBottom: spacing.xl },
  iconChip: {
    width: 44, height: 44, borderRadius: radius.md, borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
});
