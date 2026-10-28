import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, shadow, spacing } from '../../theme/tokens';
export function SplashScreen() {
  return (
    <View style={styles.page}>
      <View style={styles.logo}>
        <Text style={styles.logoText}>C</Text>
      </View>
      <Text style={styles.brand}>CONNECTLY</Text>
      <Text style={styles.tagline}>Your community, your way.</Text>
      <ActivityIndicator color={colors.blue} style={styles.loader} />
    </View>
  );
}
const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 82,
    height: 82,
    borderRadius: 28,
    backgroundColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  logoText: { fontSize: 42, fontWeight: '900', color: '#fff' },
  brand: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 3,
    color: colors.ink,
    marginTop: spacing.lg,
  },
  tagline: { fontSize: 12, color: colors.muted, marginTop: spacing.xs },
  loader: { marginTop: spacing.xl },
});
