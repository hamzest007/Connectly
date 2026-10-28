export const colors = {
  // Modern primary colors
  primary: '#6366F1',
  primaryDark: '#4F46E5',
  primaryLight: '#818CF8',
  accent: '#EC4899',

  // Modern secondary colors (with backward compatibility)
  blue: '#6366F1',
  blueDeep: '#4F46E5',
  blueSoft: '#E0E7FF',

  // Text colors
  ink: '#0F172A',
  inkLight: '#1E293B',
  muted: '#64748B',
  mutedLight: '#94A3B8',

  // Background colors
  surface: '#FFFFFF',
  canvas: '#F1F5F9',
  surfaceAlt: '#F8FAFC',

  // Accent backgrounds
  lavender: '#E0E7FF',
  mint: '#D1FAE5',
  peach: '#FED7AA',
  yellow: '#FEF3C7',

  // Status colors
  success: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',

  // Border
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
};
// Compatibility alias for legacy style declarations; the app has one light theme only.
export const darkColors = colors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const radius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  pill: 999,
};

export const shadow = {
  shadowColor: '#000000',
  shadowOpacity: 0.08,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 4 },
  elevation: 5,
};

export const shadowLarge = {
  shadowColor: '#000000',
  shadowOpacity: 0.12,
  shadowRadius: 24,
  shadowOffset: { width: 0, height: 8 },
  elevation: 8,
};
