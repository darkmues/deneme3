// ============================================================
// HAYAT Mobile — Shared UI Components
// ============================================================
import React from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, spacing, radius, fonts, fontSize, shadows } from '../theme';

// ─── Card ─────────────────────────────────────────────────
export function Card({ children, style, onPress }) {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper onPress={onPress} activeOpacity={0.7}
      style={[styles.card, style]}>
      {children}
    </Wrapper>
  );
}

// ─── Button ───────────────────────────────────────────────
export function Button({ title, onPress, variant = 'primary', size = 'md', loading, disabled, icon, style }) {
  const variants = {
    primary: { bg: colors.amber, text: '#0A0A0F' },
    secondary: { bg: colors.surface, text: colors.text, border: colors.border },
    danger: { bg: colors.redDim, text: colors.red },
    ghost: { bg: 'transparent', text: colors.textDim },
  };
  const sizes = {
    sm: { paddingV: 8, paddingH: 14, font: fontSize.sm },
    md: { paddingV: 12, paddingH: 20, font: fontSize.md },
    lg: { paddingV: 16, paddingH: 28, font: fontSize.lg },
  };
  const v = variants[variant];
  const s = sizes[size];

  return (
    <TouchableOpacity onPress={onPress} disabled={disabled || loading} activeOpacity={0.7}
      style={[{
        backgroundColor: v.bg,
        paddingVertical: s.paddingV,
        paddingHorizontal: s.paddingH,
        borderRadius: radius.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        opacity: disabled ? 0.5 : 1,
        borderWidth: v.border ? 1 : 0,
        borderColor: v.border || 'transparent',
      }, style]}>
      {loading ? (
        <ActivityIndicator size="small" color={v.text} />
      ) : (
        <>
          {icon && <Text style={{ fontSize: s.font }}>{icon}</Text>}
          <Text style={{ color: v.text, fontSize: s.font, fontFamily: fonts.semibold }}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

// ─── Input ────────────────────────────────────────────────
export function Input({ label, error, style, containerStyle, ...props }) {
  return (
    <View style={[{ gap: 6 }, containerStyle]}>
      {label && <Text style={styles.inputLabel}>{label}</Text>}
      <TextInput
        placeholderTextColor={colors.textMuted}
        {...props}
        style={[styles.input, error && { borderColor: colors.red }, style]}
      />
      {error && <Text style={styles.inputError}>{error}</Text>}
    </View>
  );
}

// ─── Badge ────────────────────────────────────────────────
export function Badge({ children, color = colors.amber, style }) {
  return (
    <View style={[{
      backgroundColor: color + '20',
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: radius.full,
    }, style]}>
      <Text style={{ color, fontSize: fontSize.xs, fontFamily: fonts.semibold }}>{children}</Text>
    </View>
  );
}

// ─── Score Ring ───────────────────────────────────────────
export function ScoreRing({ score = 0, size = 120, strokeWidth = 8, label }) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 70 ? colors.green : score >= 40 ? colors.amber : colors.red;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }], position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={colors.border} strokeWidth={strokeWidth} />
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={`${circ}`} strokeDashoffset={offset} strokeLinecap="round" />
      </Svg>
      <Text style={{ fontSize: size * 0.28, fontFamily: fonts.serif, color: colors.text }}>{score}</Text>
      {label && <Text style={{ fontSize: 10, color: colors.textDim, marginTop: 2 }}>{label}</Text>}
    </View>
  );
}

// ─── Progress Bar ─────────────────────────────────────────
export function ProgressBar({ value, max, color = colors.amber, height = 6 }) {
  const pct = Math.min(100, (value / Math.max(1, max)) * 100);
  return (
    <View style={{ height, backgroundColor: colors.border, borderRadius: height, overflow: 'hidden', width: '100%' }}>
      <View style={{ height: '100%', width: `${pct}%`, backgroundColor: color, borderRadius: height }} />
    </View>
  );
}

// ─── Stat Card ────────────────────────────────────────────
export function StatCard({ icon, label, value, color = colors.amber }) {
  return (
    <Card style={{ flex: 1, padding: spacing.md, alignItems: 'center' }}>
      <Text style={{ fontSize: 20, marginBottom: 4 }}>{icon}</Text>
      <Text style={{ fontSize: fontSize.xl, fontFamily: fonts.bold, color }}>{value}</Text>
      <Text style={{ fontSize: fontSize.xs, color: colors.textDim, marginTop: 2 }}>{label}</Text>
    </Card>
  );
}

// ─── Empty State ──────────────────────────────────────────
export function EmptyState({ icon, title, subtitle }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: spacing.huge }}>
      <Text style={{ fontSize: 48, marginBottom: spacing.lg }}>{icon}</Text>
      <Text style={{ fontSize: fontSize.xl, fontFamily: fonts.semibold, color: colors.text, marginBottom: spacing.sm }}>{title}</Text>
      <Text style={{ fontSize: fontSize.md, color: colors.textDim, textAlign: 'center' }}>{subtitle}</Text>
    </View>
  );
}

// ─── Section Header ───────────────────────────────────────
export function SectionHeader({ title, actionText, onAction }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
      <Text style={{ fontSize: fontSize.lg, fontFamily: fonts.semibold, color: colors.text }}>{title}</Text>
      {actionText && (
        <TouchableOpacity onPress={onAction}>
          <Text style={{ fontSize: fontSize.sm, color: colors.amber }}>{actionText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Loading Screen ───────────────────────────────────────
export function LoadingScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 40, fontFamily: fonts.serif, color: colors.amber, marginBottom: spacing.lg }}>HAYAT</Text>
      <ActivityIndicator size="large" color={colors.amber} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    ...shadows.soft,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: fontSize.md,
    fontFamily: fonts.regular,
  },
  inputLabel: {
    fontSize: fontSize.sm,
    color: colors.textDim,
    fontFamily: fonts.medium,
  },
  inputError: {
    fontSize: fontSize.xs,
    color: colors.red,
    fontFamily: fonts.regular,
  },
});
