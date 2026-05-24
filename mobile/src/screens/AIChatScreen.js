// ============================================================
// HAYAT Mobile — AI Chat Screen
// ============================================================
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { Card } from '../components/UI';
import { colors, spacing, radius, fonts, fontSize } from '../theme';

const QUICK_ACTIONS = [
  { label: '📋 Görevlerim', msg: 'Görevlerim nasıl gidiyor?' },
  { label: '💰 Harcamalarım', msg: 'Bu ayki harcamalarım nasıl?' },
  { label: '🔥 Alışkanlıklarım', msg: 'Alışkanlık serim nasıl gidiyor?' },
  { label: '💡 Günlük öneri', msg: 'Bugün ne yapmalıyım?' },
  { label: '📊 Haftalık rapor', msg: 'Haftalık performansımı özetle' },
  { label: '🎯 Motivasyon', msg: 'Beni motive et!' },
];

export default function AIChatScreen() {
  const { aiMessages, sendAIMessage, loading, dispatch } = useApp();
  const [input, setInput] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [aiMessages]);

  const send = () => {
    const msg = input.trim();
    if (!msg || loading.ai) return;
    setInput('');
    sendAIMessage(msg);
  };

  const sendQuick = (msg) => {
    setInput('');
    sendAIMessage(msg);
  };

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>

      {/* Messages */}
      <ScrollView ref={scrollRef} style={s.messages} contentContainerStyle={s.messagesContent}
        keyboardShouldPersistTaps="handled">

        {aiMessages.length === 0 ? (
          <View style={s.emptyState}>
            <Text style={{ fontSize: 56, marginBottom: spacing.lg }}>🧠</Text>
            <Text style={s.emptyTitle}>HAYAT AI Asistan</Text>
            <Text style={s.emptySubtitle}>
              Görevlerin, harcamaların ve alışkanlıkların hakkında benimle konuş
            </Text>

            {/* Quick Actions */}
            <View style={s.quickGrid}>
              {QUICK_ACTIONS.map(qa => (
                <TouchableOpacity key={qa.label} onPress={() => sendQuick(qa.msg)} style={s.quickCard}>
                  <Text style={s.quickLabel}>{qa.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <>
            {/* New Chat Button */}
            <TouchableOpacity onPress={() => dispatch({ type: 'CLEAR_AI' })} style={s.newChatBtn}>
              <Text style={{ color: colors.amber, fontSize: fontSize.sm }}>🔄 Yeni Sohbet</Text>
            </TouchableOpacity>

            {aiMessages.map((msg, i) => (
              <View key={i} style={[s.bubble, msg.role === 'user' ? s.userBubble : s.aiBubble]}>
                {msg.role === 'assistant' && (
                  <Text style={{ fontSize: 16, marginBottom: 4 }}>🧠</Text>
                )}
                <Text style={[s.bubbleText, msg.role === 'user' && { color: colors.text }]}>
                  {msg.content}
                </Text>
              </View>
            ))}

            {loading.ai && (
              <View style={[s.bubble, s.aiBubble]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ActivityIndicator size="small" color={colors.amber} />
                  <Text style={{ color: colors.textDim, fontSize: fontSize.sm }}>Düşünüyor...</Text>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Input Bar */}
      <View style={s.inputBar}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Mesajını yaz..."
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={2000}
          style={s.input}
          onSubmitEditing={send}
          blurOnSubmit={false}
          returnKeyType="send"
        />
        <TouchableOpacity onPress={send} disabled={loading.ai || !input.trim()}
          style={[s.sendBtn, (!input.trim() || loading.ai) && { opacity: 0.4 }]}>
          <Text style={{ fontSize: 18 }}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  messages: { flex: 1 },
  messagesContent: { padding: spacing.xl, paddingBottom: spacing.md },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: fontSize.xl, fontFamily: fonts.semibold, color: colors.text, marginBottom: spacing.sm },
  emptySubtitle: { fontSize: fontSize.md, color: colors.textDim, textAlign: 'center', marginBottom: spacing.xxl, maxWidth: 280 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center', maxWidth: 340 },
  quickCard: {
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  quickLabel: { fontSize: fontSize.sm, color: colors.text },
  newChatBtn: {
    alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: radius.full, borderWidth: 1, borderColor: colors.amber + '40',
    backgroundColor: colors.amberGlow, marginBottom: spacing.lg,
  },
  bubble: {
    maxWidth: '82%', padding: spacing.lg, borderRadius: radius.lg,
    marginBottom: spacing.md,
  },
  userBubble: {
    alignSelf: 'flex-end', backgroundColor: colors.amberDim,
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    alignSelf: 'flex-start', backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: fontSize.md, color: colors.text, lineHeight: 22,
    fontFamily: fonts.regular,
  },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm,
    padding: spacing.lg, paddingBottom: Platform.OS === 'ios' ? spacing.xxl : spacing.lg,
    borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface,
  },
  input: {
    flex: 1, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    color: colors.text, fontSize: fontSize.md, fontFamily: fonts.regular,
    maxHeight: 100,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.amber,
    alignItems: 'center', justifyContent: 'center',
  },
});
