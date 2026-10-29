import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, shadow } from '../../theme/tokens';

export type BottomTab = 'home' | 'reels' | 'create' | 'notifications' | 'menu';
type Tab = { key: BottomTab; label: string; icon: string };
const tabs: Tab[] = [
  { key: 'home', label: 'Home', icon: '⌂' },
  { key: 'reels', label: 'Reels', icon: '▣' },
  { key: 'create', label: 'Create', icon: '+' },
  { key: 'notifications', label: 'Notifications', icon: '♢' },
  { key: 'menu', label: 'Menu', icon: '☰' },
];

export function BottomTabBar({ activeTab, unreadCount, onTabPress }: { activeTab: BottomTab; unreadCount: number; onTabPress: (tab: BottomTab) => void }) {
  const insets = useSafeAreaInsets();
  const lastPress = React.useRef<{ tab: BottomTab; at: number } | null>(null);
  const press = (tab: BottomTab) => { const now = Date.now(); if (lastPress.current?.tab === tab && now - lastPress.current.at < 280) return; lastPress.current = { tab, at: now }; onTabPress(tab); };
  return <View style={[styles.shell, { bottom: Math.max(10, insets.bottom + 8) }]} accessibilityRole="tablist">
    {tabs.map(item => { const active = activeTab === item.key; return <Pressable key={item.key} onPress={() => press(item.key)} accessibilityRole="tab" accessibilityState={{ selected: active }} accessibilityLabel={`${item.label} tab`} style={({ pressed }) => [styles.item, active && item.key !== 'create' && styles.itemActive, pressed && styles.pressed]}>
      <View style={styles.iconArea}>{item.key === 'create' ? <View style={styles.createButton}><Text style={styles.createGlyph}>+</Text></View> : <Text style={[styles.glyph, active && styles.activeGlyph]}>{item.icon}</Text>}{item.key === 'notifications' && unreadCount > 0 ? <View style={styles.badge}><Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text></View> : null}</View>
      <Text style={[styles.label, active && styles.activeLabel, item.key === 'create' && styles.createLabel]}>{item.label}</Text>
    </Pressable>; })}
  </View>;
}

const styles = StyleSheet.create({
  shell: { position: 'absolute', left: 12, right: 12, height: 76, borderRadius: 25, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, ...shadow, shadowOpacity: 0.14, shadowRadius: 22, elevation: 12 },
  item: { flex: 1, height: 64, minWidth: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.lg },
  itemActive: { backgroundColor: colors.blueSoft },
  pressed: { opacity: 0.72 },
  iconArea: { height: 37, minWidth: 38, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  glyph: { color: colors.muted, fontSize: 24, lineHeight: 28, fontWeight: '700' },
  activeGlyph: { color: colors.blue },
  createButton: { width: 52, height: 52, borderRadius: 18, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center', marginTop: -16, borderWidth: 4, borderColor: colors.canvas, ...shadow, shadowColor: colors.blue, shadowOpacity: 0.32, shadowRadius: 12, elevation: 9 },
  createGlyph: { color: '#fff', fontSize: 31, fontWeight: '300', lineHeight: 35 },
  label: { color: colors.muted, fontSize: 10, fontWeight: '800', marginTop: 1 },
  activeLabel: { color: colors.blue, fontWeight: '900' },
  createLabel: { color: colors.ink, fontWeight: '900' },
  badge: { position: 'absolute', right: -4, top: -3, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.danger, borderWidth: 2, borderColor: colors.surface, paddingHorizontal: 3, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#fff', fontSize: 8, fontWeight: '900' },
});
