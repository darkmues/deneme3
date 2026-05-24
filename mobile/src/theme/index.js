// ============================================================
// HAYAT Mobile — Theme System
// ============================================================

export const colors = {
  // Backgrounds
  bg: '#0A0A0F',
  surface: '#12121A',
  surfaceLight: '#1A1A25',
  card: '#16161F',
  cardHover: '#1E1E2A',

  // Borders
  border: '#2A2A35',
  borderLight: '#3A3A45',

  // Brand
  amber: '#E8A838',
  amberDim: 'rgba(232, 168, 56, 0.2)',
  amberGlow: 'rgba(232, 168, 56, 0.1)',

  // Semantic
  green: '#34D399',
  greenDim: 'rgba(52, 211, 153, 0.15)',
  red: '#F87171',
  redDim: 'rgba(248, 113, 113, 0.15)',
  blue: '#60A5FA',
  blueDim: 'rgba(96, 165, 250, 0.15)',
  purple: '#A78BFA',
  purpleDim: 'rgba(167, 139, 250, 0.15)',
  pink: '#F472B6',

  // Text
  text: '#F0EDE6',
  textDim: '#8A8A9A',
  textMuted: '#555566',

  // Priority
  priority: {
    critical: '#F87171',
    high: '#FBBF24',
    medium: '#60A5FA',
    low: '#8A8A9A',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
};

export const fonts = {
  regular: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  semibold: 'DMSans_600SemiBold',
  bold: 'DMSans_700Bold',
  serif: 'InstrumentSerif_400Regular',
};

export const fontSize = {
  xs: 11,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 24,
  xxxl: 32,
  display: 48,
};

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
};

export const priorityLabels = {
  critical: 'Kritik',
  high: 'Yüksek',
  medium: 'Orta',
  low: 'Düşük',
};

export const statusLabels = {
  todo: 'Yapılacak',
  in_progress: 'Devam Ediyor',
  done: 'Tamamlandı',
  archived: 'Arşiv',
};

export default { colors, spacing, radius, fonts, fontSize, shadows };
