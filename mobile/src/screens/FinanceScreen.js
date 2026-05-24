// ============================================================
// HAYAT Mobile — Finance Screen
// ============================================================
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, RefreshControl,
  StyleSheet, Modal, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { Card, Button, Input, ProgressBar, EmptyState, SectionHeader } from '../components/UI';
import { colors, spacing, radius, fonts, fontSize } from '../theme';

export default function FinanceScreen() {
  const { transactions, financeAnalytics: a, budgets, loadFinance, createTransaction, loading } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [newTx, setNewTx] = useState({ type: 'expense', amount: '', title: '' });

  useEffect(() => { loadFinance(); }, []);
  const onRefresh = useCallback(() => loadFinance(), []);

  const handleAdd = async () => {
    if (!newTx.title.trim() || !newTx.amount) return;
    try {
      await createTransaction({ ...newTx, amount: parseFloat(newTx.amount) });
      setNewTx({ type: 'expense', amount: '', title: '' });
      setShowAdd(false);
      loadFinance(); // refresh analytics
    } catch (e) {
      Alert.alert('Hata', e.message);
    }
  };

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={!!loading.finance} onRefresh={onRefresh} tintColor={colors.amber} />}>

        <View style={s.header}>
          <Text style={s.title}>Finans</Text>
          <Button title="+ İşlem" onPress={() => setShowAdd(true)} size="sm" />
        </View>

        {/* Summary */}
        {a && (
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
            <Card style={{ flex: 1, padding: spacing.md, alignItems: 'center' }}>
              <Text style={{ fontSize: fontSize.xs, color: colors.textDim }}>Gelir</Text>
              <Text style={{ fontSize: fontSize.lg, fontFamily: fonts.bold, color: colors.green, marginTop: 4 }}>
                ₺{(a.totalIncome || 0).toLocaleString('tr-TR')}
              </Text>
            </Card>
            <Card style={{ flex: 1, padding: spacing.md, alignItems: 'center' }}>
              <Text style={{ fontSize: fontSize.xs, color: colors.textDim }}>Gider</Text>
              <Text style={{ fontSize: fontSize.lg, fontFamily: fonts.bold, color: colors.red, marginTop: 4 }}>
                ₺{(a.totalExpenses || 0).toLocaleString('tr-TR')}
              </Text>
            </Card>
            <Card style={{ flex: 1, padding: spacing.md, alignItems: 'center' }}>
              <Text style={{ fontSize: fontSize.xs, color: colors.textDim }}>Net</Text>
              <Text style={{
                fontSize: fontSize.lg, fontFamily: fonts.bold, marginTop: 4,
                color: (a.netSavings || 0) >= 0 ? colors.green : colors.red,
              }}>
                ₺{(a.netSavings || 0).toLocaleString('tr-TR')}
              </Text>
            </Card>
          </View>
        )}

        {/* Category Breakdown */}
        {a?.byCategory?.length > 0 && (
          <>
            <SectionHeader title="Kategori Dağılımı" />
            <Card style={{ marginBottom: spacing.lg }}>
              {a.byCategory.slice(0, 6).map((cat, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <Text style={{ fontSize: 18, width: 28 }}>{cat.icon || '📦'}</Text>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ fontSize: fontSize.sm, color: colors.text }}>{cat.name || 'Diğer'}</Text>
                      <Text style={{ fontSize: fontSize.sm, fontFamily: fonts.semibold, color: colors.text }}>
                        ₺{(cat.total || 0).toLocaleString('tr-TR')}
                      </Text>
                    </View>
                    <ProgressBar value={cat.total} max={a.totalExpenses} color={cat.color || colors.amber} />
                  </View>
                </View>
              ))}
            </Card>
          </>
        )}

        {/* Budgets */}
        {budgets?.length > 0 && (
          <>
            <SectionHeader title="Bütçeler" />
            <Card style={{ marginBottom: spacing.lg }}>
              {budgets.map(b => (
                <View key={b.id} style={{ marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ fontSize: fontSize.sm, color: colors.text }}>{b.name}</Text>
                    <Text style={{ fontSize: fontSize.xs, color: b.isOverBudget ? colors.red : colors.textDim }}>
                      ₺{(b.spent || 0).toLocaleString('tr-TR')} / ₺{parseFloat(b.amount).toLocaleString('tr-TR')}
                    </Text>
                  </View>
                  <ProgressBar value={b.spent || 0} max={parseFloat(b.amount)}
                    color={b.isOverBudget ? colors.red : b.isAlerted ? colors.amber : colors.green} />
                </View>
              ))}
            </Card>
          </>
        )}

        {/* Recent Transactions */}
        <SectionHeader title="Son İşlemler" />
        {transactions.length === 0 ? (
          <EmptyState icon="💰" title="İşlem yok" subtitle="İlk gelir veya giderini ekle!" />
        ) : (
          transactions.slice(0, 20).map(tx => (
            <Card key={tx.id} style={s.txCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={[s.txIcon, { backgroundColor: tx.type === 'income' ? colors.greenDim : colors.redDim }]}>
                  <Text style={{ fontSize: 18 }}>{tx.category_icon || (tx.type === 'income' ? '💵' : '💸')}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: fontSize.md, color: colors.text, fontFamily: fonts.medium }} numberOfLines={1}>{tx.title}</Text>
                  <Text style={{ fontSize: fontSize.xs, color: colors.textDim, marginTop: 2 }}>
                    {tx.category_name || '—'} · {new Date(tx.date).toLocaleDateString('tr-TR')}
                  </Text>
                </View>
                <Text style={{
                  fontSize: fontSize.md, fontFamily: fonts.bold,
                  color: tx.type === 'income' ? colors.green : colors.red,
                }}>
                  {tx.type === 'income' ? '+' : '-'}₺{parseFloat(tx.amount).toLocaleString('tr-TR')}
                </Text>
              </View>
            </Card>
          ))
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Add Transaction Modal */}
      <Modal visible={showAdd} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.modalOverlay}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>Yeni İşlem</Text>

            {/* Type Toggle */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: spacing.lg }}>
              {['expense', 'income'].map(t => (
                <TouchableOpacity key={t} onPress={() => setNewTx({ ...newTx, type: t })}
                  style={[s.typeChip, {
                    borderColor: newTx.type === t ? (t === 'expense' ? colors.red : colors.green) : colors.border,
                    backgroundColor: newTx.type === t ? (t === 'expense' ? colors.redDim : colors.greenDim) : 'transparent',
                  }]}>
                  <Text style={{
                    color: newTx.type === t ? (t === 'expense' ? colors.red : colors.green) : colors.textDim,
                    fontFamily: fonts.semibold, fontSize: fontSize.md,
                  }}>{t === 'expense' ? '💸 Gider' : '💵 Gelir'}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Input label="Başlık" value={newTx.title}
              onChangeText={t => setNewTx({ ...newTx, title: t })}
              placeholder="Harcama başlığı"
              containerStyle={{ marginBottom: spacing.md }} />

            <Input label="Tutar (₺)" value={newTx.amount}
              onChangeText={t => setNewTx({ ...newTx, amount: t })}
              placeholder="0.00" keyboardType="decimal-pad"
              containerStyle={{ marginBottom: spacing.xl }} />

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
  txCard: { padding: spacing.lg, marginBottom: spacing.sm },
  txIcon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalContent: {
    backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: spacing.xxl, paddingBottom: 40,
  },
  modalTitle: { fontSize: fontSize.xl, fontFamily: fonts.semibold, color: colors.text, marginBottom: spacing.xl },
  typeChip: { flex: 1, paddingVertical: 14, borderRadius: radius.md, borderWidth: 1, alignItems: 'center' },
});
