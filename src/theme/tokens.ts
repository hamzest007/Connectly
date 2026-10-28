export const colors = {
  // Connectly's calm indigo + sky visual system
  primary: '#5661E8',
  primaryDark: '#4148C7',
  primaryLight: '#7B83F0',
  accent: '#E05AC7',

  // Modern secondary colors (with backward compatibility)
  blue: '#5661E8',
  blueDeep: '#4148C7',
  blueSoft: '#EEF0FF',

  // Text colors
  ink: '#182230',
  inkLight: '#344054',
  muted: '#667085',
  mutedLight: '#98A2B3',

  // Background colors
  surface: '#FFFFFF',
  canvas: '#F7F8FC',
  surfaceAlt: '#F2F4F7',

  // Accent backgrounds
  lavender: '#EEF0FF',
  mint: '#DDF8EE',
  peach: '#FFF0E5',
  yellow: '#FFF6D8',

  // Status colors
  success: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',

  // Border
  border: '#E4E7EC',
  borderLight: '#F0F2F5',
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
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
};

export const shadow = {
  shadowColor: '#17204D',
  shadowOpacity: 0.07,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 5 },
  elevation: 3,
};

export const shadowLarge = {
  shadowColor: '#17204D',
  shadowOpacity: 0.1,
  shadowRadius: 22,
  shadowOffset: { width: 0, height: 9 },
  elevation: 6,
};
