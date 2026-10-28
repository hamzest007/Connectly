import React from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors, radius, shadow, spacing } from '../../theme/tokens';
const darkColors = colors;

type Props = {
  onProfile: () => void;
  onFriends: () => void;
  onSaved: () => void;
  onMessages: () => void;
  onBlocked: () => void;
  onGroups: () => void;
  onDetail: (
    kind:
      | 'activity'
      | 'privacy'
      | 'notifications'
      | 'security'
      | 'content'
      | 'accessibility'
      | 'data'
      | 'support'
      | 'account'
      | 'archive'
      | 'creator'
      | 'close-friends'
      | 'monetization',
  ) => void;
  onBack?: () => void;
  onLogout: () => void;
};
type MenuItem = [string, string, string];

const tools: MenuItem[] = [
  ['Saved posts', 'Your private collection of bookmarks', '▱'],
  ['Your activity', 'Review likes, comments and account history', '◷'],
  ['Close friends', 'Choose who sees your closer updates', '✦'],
  ['Archive', 'Manage hidden stories and posts', '□'],
  ['Groups and Pages', 'Communities, public pages and roles', '⌂'],
  ['Creator dashboard', 'Audience, content performance and insights', '◒'],
  ['Monetization', 'Subscriptions, tips and payouts', '◇'],
  ['Messages', 'Private chats, requests and group conversations', '✉'],
];
const privacy: MenuItem[] = [
  ['Privacy and security', 'Control your visibility and safety', '◈'],
  ['Notification preferences', 'Choose what you want to hear about', '♡'],
  [
    'Blocked and muted accounts',
    'Manage accounts you have blocked or muted',
    '⊘',
  ],
  [
    'Security and login',
    'Sessions, login alerts and two-factor authentication',
    '⌁',
  ],
  ['Help and support', 'Get support from Connectly', '?'],
];

export function SettingsScreen({
  onProfile,
  onFriends,
  onSaved,
  onMessages,
  onBlocked,
  onGroups,
  onDetail,
  onBack,
  onLogout,
}: Props) {
  const actions: Record<string, () => void> = {
    'Saved posts': onSaved,
    Messages: onMessages,
    'Blocked and muted accounts': onBlocked,
    'Groups and Pages': onGroups,
    'Your activity': () => onDetail('activity'),
    'Privacy and security': () => onDetail('privacy'),
    'Notification preferences': () => onDetail('notifications'),
    'Security and login': () => onDetail('security'),
    'Help and support': () => onDetail('support'),
    Archive: () => onDetail('archive'),
    'Close friends': () => onDetail('close-friends'),
    'Creator dashboard': () => onDetail('creator'),
    Monetization: () => onDetail('monetization'),
  };
  const renderItem = ([title, meta, icon]: MenuItem) => (
    <Pressable
      key={title}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      onPress={actions[title] ?? (() => onDetail('content'))}
    >
      <View style={styles.rowIcon}>
        <Text style={styles.rowIconText}>{icon}</Text>
      </View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowText}>{title}</Text>
        <Text style={styles.rowMeta}>{meta}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            style={styles.back}
          >
            <Text style={styles.backText}>‹</Text>
          </Pressable>
        ) : null}
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>YOUR SPACE</Text>
          <Text style={styles.title}>Menu</Text>
        </View>
        <View style={styles.menuBadge}>
          <Text style={styles.menuIcon}>☰</Text>
        </View>
      </View>
      <Text style={styles.subtitle}>
        Your community, creator tools, privacy and account controls.
      </Text>
      <Pressable
        style={({ pressed }) => [styles.profile, pressed && styles.pressed]}
        onPress={onProfile}
      >
        <View style={styles.profileCircle}>
          <Text style={styles.profileInitial}>You</Text>
        </View>
        <View style={styles.profileCopy}>
          <Text style={styles.profileName}>Your profile</Text>
          <Text style={styles.profileMeta}>View and edit your profile</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>
      <Pressable
        style={({ pressed }) => [styles.findPeople, pressed && styles.pressed]}
        onPress={onFriends}
      >
        <View style={styles.findIcon}>
          <Text style={styles.rowIconText}>♧</Text>
        </View>
        <View style={styles.rowCopy}>
          <Text style={styles.rowText}>Find people</Text>
          <Text style={styles.rowMeta}>
            Search users, hashtags and communities
          </Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>
      <Text style={styles.sectionTitle}>Preferences</Text>
      <Text style={styles.sectionTitle}>Connectly tools</Text>
      {tools.map(renderItem)}
      <Text style={styles.sectionTitle}>Privacy and account</Text>
      {privacy.map(renderItem)}
      <Pressable
        style={({ pressed }) => [styles.logout, pressed && styles.pressed]}
        onPress={() =>
          Alert.alert('Log out', 'Are you sure you want to log out?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Log out', style: 'destructive', onPress: onLogout },
          ])
        }
      >
        <Text style={styles.logoutText}>Log out of Connectly</Text>
      </Pressable>
      <Text style={styles.version}>CONNECTLY · YOUR COMMUNITY, YOUR WAY</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.canvas },
  lightPage: { backgroundColor: darkColors.canvas },
  content: { padding: spacing.md, paddingBottom: 120 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
  },
  backText: { fontSize: 30, color: colors.ink },
  headerCopy: { flex: 1, marginLeft: spacing.sm },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 1.3,
    color: colors.blue,
    fontWeight: '900',
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    color: colors.ink,
    letterSpacing: -1.1,
    marginTop: 4,
  },
  menuBadge: {
    width: 50,
    height: 50,
    borderRadius: 18,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  menuIcon: { fontSize: 21, color: colors.surface },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 6,
    marginBottom: spacing.lg,
  },
  profile: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
  },
  profileCircle: {
    width: 50,
    height: 50,
    borderRadius: 18,
    backgroundColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInitial: { color: '#fff', fontWeight: '900' },
  profileCopy: { flex: 1, marginLeft: spacing.sm },
  profileName: { color: colors.ink, fontWeight: '900', fontSize: 15 },
  profileMeta: { color: colors.muted, fontSize: 12, marginTop: 3 },
  findPeople: {
    backgroundColor: colors.blueSoft,
    borderRadius: radius.lg,
    padding: spacing.sm,
    marginBottom: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
  },
  findIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevron: { color: colors.muted, fontSize: 26, lineHeight: 26 },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: colors.ink,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
  },
  pressed: { opacity: 0.72, transform: [{ scale: 0.985 }] },
  rowIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconText: { color: colors.blue, fontSize: 19 },
  rowCopy: { flex: 1, marginLeft: spacing.sm },
  rowText: { color: colors.ink, fontWeight: '800', fontSize: 13 },
  rowMeta: { color: colors.muted, fontSize: 11, marginTop: 4 },
  switch: {
    width: 46,
    height: 26,
    borderRadius: 13,
    padding: 3,
    justifyContent: 'center',
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  switchThumbOn: { alignSelf: 'flex-end' },
  logout: { marginTop: spacing.lg, padding: spacing.md, alignItems: 'center' },
  logoutText: { color: colors.danger, fontWeight: '900' },
  version: {
    textAlign: 'center',
    fontSize: 9,
    letterSpacing: 1.2,
    color: colors.muted,
    marginTop: spacing.md,
  },
});
