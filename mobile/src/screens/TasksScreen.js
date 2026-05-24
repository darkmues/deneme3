// ============================================================
// HAYAT Mobile — Tasks Screen
// ============================================================
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, RefreshControl,
  StyleSheet, Alert, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { Card, Button, Input, Badge, EmptyState, SectionHeader, StatCard } from '../components/UI';
import { colors, spacing, radius, fonts, fontSize, priorityLabels } from '../theme';

export default function TasksScreen() {
  const { tasks, taskStats, loadTasks, createTask, toggleTask, deleteTask, loading } = useApp();
  const [filter, setFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', priority: 'medium', description: '' });

  useEffect(() => { loadTasks({ status: filter }); }, [filter]);

  const onRefresh = useCallback(() => loadTasks({ status: filter }), [filter]);

  const handleAdd = async () => {
    if (!newTask.title.trim()) return;
    try {
      await createTask(newTask);
      setNewTask({ title: '', priority: 'medium', description: '' });
      setShowAdd(false);
    } catch (e) {
      Alert.alert('Hata', e.message);
    }
  };

  const handleDelete = (id, title) => {
    Alert.alert('Görevi Sil', `"${title}" silinsin mi?`, [
      { text: 'İptal', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: () => deleteTask(id) },
    ]);
  };

  const priorityColors = { critical: colors.red, high: '#FBBF24', medium: colors.blue, low: colors.textDim };
  const filters = [
    { key: 'all', label: 'Tümü' },
    { key: 'todo', label: 'Yapılacak' },
    { key: 'in_progress', label: 'Devam' },
    { key: 'done', label: 'Tamamlandı' },
  ];

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={!!loading.tasks} onRefresh={onRefresh} tintColor={colors.amber} />}>

        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>Görevler</Text>
          <Button title="+ Yeni" onPress={() => setShowAdd(true)} size="sm" />
        </View>

        {/* Stats */}
        {taskStats && (
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
            <StatCard icon="📝" label="Yapılacak" value={taskStats.todo_count || 0} color={colors.blue} />
            <StatCard icon="⚡" label="Devam" value={taskStats.in_progress_count || 0} color={colors.amber} />
            <StatCard icon="✅" label="Tamam" value={taskStats.done_count || 0} color={colors.green} />
            <StatCard icon="⚠️" label="Gecikmiş" value={taskStats.overdue_count || 0} color={colors.red} />
          </View>
        )}

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.lg, marginHorizontal: -spacing.xl }}>
          <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: spacing.xl }}>
            {filters.map(f => (
              <TouchableOpacity key={f.key} onPress={() => setFilter(f.key)}
                style={[s.filterChip, filter === f.key && s.filterChipActive]}>
                <Text style={[s.filterText, filter === f.key && s.filterTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Task List */}
        {tasks.length === 0 ? (
          <EmptyState icon="📋" title="Görev yok" subtitle="Yeni bir görev ekleyerek başla!" />
        ) : (
          tasks.map(task => (
            <Card key={task.id} style={s.taskCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                {/* Checkbox */}
                <TouchableOpacity onPress={() => toggleTask(task)}
                  style={[s.checkbox, {
                    borderColor: task.status === 'done' ? colors.green : priorityColors[task.priority],
                    backgroundColor: task.status === 'done' ? colors.green : 'transparent',
                  }]}>
                  {task.status === 'done' && <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text>}
                </TouchableOpacity>

                {/* Content */}
                <View style={{ flex: 1 }}>
                  <Text style={[s.taskTitle, task.status === 'done' && s.taskDone]}
                    numberOfLines={2}>{task.title}</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                    <Badge color={priorityColors[task.priority]}>{priorityLabels[task.priority]}</Badge>
                    {task.due_date && (
                      <Text style={{
                        fontSize: fontSize.xs,
                        color: new Date(task.due_date) < new Date() && task.status !== 'done' ? colors.red : colors.textDim,
                      }}>📅 {new Date(task.due_date).toLocaleDateString('tr-TR')}</Text>
                    )}
                    {task.category_name && (
                      <Text style={{ fontSize: fontSize.xs, color: colors.textDim }}>
                        {task.category_icon} {task.category_name}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Delete */}
                <TouchableOpacity onPress={() => handleDelete(task.id, task.title)} style={{ padding: 8 }}>
                  <Text style={{ color: colors.textMuted, fontSize: 16 }}>✕</Text>
                </TouchableOpacity>
              </View>
            </Card>
          ))
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Add Task Modal */}
      <Modal visible={showAdd} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.modalOverlay}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>Yeni Görev</Text>

            <Input label="Başlık" value={newTask.title}
              onChangeText={t => setNewTask({ ...newTask, title: t })}
              placeholder="Görev başlığı..."
              containerStyle={{ marginBottom: spacing.md }} />

            <Input label="Açıklama" value={newTask.description}
              onChangeText={t => setNewTask({ ...newTask, description: t })}
              placeholder="Açıklama (opsiyonel)"
              multiline numberOfLines={3}
              containerStyle={{ marginBottom: spacing.lg }} />

            {/* Priority Picker */}
            <Text style={{ fontSize: fontSize.sm, color: colors.textDim, fontFamily: fonts.medium, marginBottom: 8 }}>Öncelik</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: spacing.xl }}>
              {Object.entries(priorityLabels).map(([key, label]) => (
                <TouchableOpacity key={key} onPress={() => setNewTask({ ...newTask, priority: key })}
                  style={[s.priorityChip, {
                    borderColor: newTask.priority === key ? priorityColors[key] : colors.border,
                    backgroundColor: newTask.priority === key ? priorityColors[key] + '20' : 'transparent',
                  }]}>
                  <Text style={{ color: newTask.priority === key ? priorityColors[key] : colors.textDim, fontSize: fontSize.sm, fontFamily: fonts.medium }}>
                    {label}
                  </Text>
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
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.full,
    borderWidth: 1, borderColor: colors.border,
  },
  filterChipActive: { borderColor: colors.amber, backgroundColor: colors.amberDim },
  filterText: { fontSize: fontSize.sm, color: colors.textDim, fontFamily: fonts.medium },
  filterTextActive: { color: colors.amber },
  taskCard: { padding: spacing.lg, marginBottom: spacing.sm },
  checkbox: {
    width: 24, height: 24, borderRadius: 24, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  taskTitle: { fontSize: fontSize.md, color: colors.text, fontFamily: fonts.medium },
  taskDone: { color: colors.textDim, textDecorationLine: 'line-through' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalContent: {
    backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: spacing.xxl, paddingBottom: 40,
  },
  modalTitle: { fontSize: fontSize.xl, fontFamily: fonts.semibold, color: colors.text, marginBottom: spacing.xl },
  priorityChip: {
    flex: 1, paddingVertical: 10, borderRadius: radius.md,
    borderWidth: 1, alignItems: 'center',
  },
});
