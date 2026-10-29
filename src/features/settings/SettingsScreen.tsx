import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { Avatar } from '../../components/common/Avatar';
import { ActionModal } from '../../components/common/ActionModal';
import { colors, radius, spacing } from '../../theme/tokens';

type DetailKind = 'activity' | 'privacy' | 'notifications' | 'security' | 'content' | 'collections' | 'accessibility' | 'data' | 'support' | 'account' | 'archive' | 'creator' | 'close-friends' | 'monetization';
type MenuUser = { id: string; name: string; username: string; avatarUrl?: string; accountType?: 'user' | 'page'; role?: string };
type Props = { user: MenuUser; onProfile: () => void; onFriends: () => void; onFindPeople: () => void; onSaved: () => void; onMessages: () => void; onBlocked: () => void; onGroups: () => void; onReels: () => void; onDetail: (kind: DetailKind) => void; onBack?: () => void; onLogout: () => void };
type Item = { title: string; description: string; icon: string; action: () => void };

function ExpandableSection({ title, icon, children, palette, initiallyOpen = false }: { title: string; icon: string; children: React.ReactNode; palette: typeof colors; initiallyOpen?: boolean }) {
  const [open, setOpen] = useState(initiallyOpen);
  const progress = useRef(new Animated.Value(initiallyOpen ? 1 : 0)).current;
  useEffect(() => { Animated.timing(progress, { toValue: open ? 1 : 0, duration: 180, useNativeDriver: false }).start(); }, [open, progress]);
  return <View style={[styles.sectionCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(value => !value)} style={({ pressed }) => [styles.sectionHeader, pressed && styles.pressed]}>
      <View style={[styles.sectionIcon, { backgroundColor: palette.blueSoft }]}><Text style={[styles.sectionIconText, { color: palette.blue }]}>{icon}</Text></View>
      <Text style={[styles.sectionTitle, { color: palette.ink }]}>{title}</Text><Text style={[styles.sectionChevron, { color: palette.muted }]}>{open ? '⌃' : '⌄'}</Text>
    </Pressable>
    <Animated.View style={{ opacity: progress, maxHeight: progress.interpolate({ inputRange: [0, 1], outputRange: [0, 600] }) }}>{children}</Animated.View>
  </View>;
}

export function SettingsScreen({ user, onProfile, onFriends, onFindPeople, onSaved, onMessages, onBlocked, onGroups, onReels, onDetail, onBack, onLogout }: Props) {
  const systemDark = useColorScheme() === 'dark';
  const [showLogout, setShowLogout] = useState(false);
  const palette = systemDark ? { ...colors, canvas: '#101828', surface: '#182230', surfaceAlt: '#243244', ink: '#F8FAFC', inkLight: '#D0D5DD', muted: '#98A2B3', border: '#344054', borderLight: '#243244', blueSoft: '#1D3B70' } : colors;
  const settings: Item[] = [
    { title: 'Settings', description: 'Manage your account and activity', icon: '⚙', action: () => onDetail('account') },
    { title: 'Privacy & security', description: 'Control visibility and safety', icon: '◈', action: () => onDetail('privacy') },
    { title: 'Blocked users', description: 'Review accounts you blocked or muted', icon: '⊘', action: onBlocked },
    { title: 'Notification settings', description: 'Choose what you want to hear about', icon: '♡', action: () => onDetail('notifications') },
    { title: 'Appearance', description: 'Accessibility and display preferences', icon: '◐', action: () => onDetail('accessibility') },
    { title: 'Help & support', description: 'Find answers or report an issue', icon: '?', action: () => onDetail('support') },
    { title: 'Report a problem', description: 'Tell us what went wrong', icon: '⚑', action: () => onDetail('support') },
  ];
  const privacyItems: Item[] = [
    { title: 'Content preferences', description: 'Feeds, muted words and recommendations', icon: '✦', action: () => onDetail('content') },
    { title: 'Content collections', description: 'Organize saved posts into folders', icon: '▱', action: () => onDetail('collections') },
    { title: 'Your activity', description: 'Review likes, comments and history', icon: '◷', action: () => onDetail('activity') },
    { title: 'Security and login', description: 'Sessions, login alerts and 2FA', icon: '⌁', action: () => onDetail('security') },
  ];
  const renderItem = (item: Item) => <Pressable key={item.title} accessibilityRole="button" style={({ pressed }) => [styles.item, { borderTopColor: palette.borderLight }, pressed && styles.pressed]} onPress={item.action}>
    <View style={[styles.itemIcon, { backgroundColor: palette.surfaceAlt }]}><Text style={[styles.itemIconText, { color: palette.blue }]}>{item.icon}</Text></View><View style={styles.itemCopy}><Text style={[styles.itemTitle, { color: palette.ink }]}>{item.title}</Text><Text style={[styles.itemDescription, { color: palette.muted }]}>{item.description}</Text></View><Text style={[styles.itemChevron, { color: palette.muted }]}>›</Text>
  </Pressable>;
  const shortcuts: Item[] = [
    { title: 'Friends', description: 'Your connections', icon: '♧', action: onFriends },
    { title: 'Groups', description: 'Communities you joined', icon: '⌂', action: onGroups },
    { title: 'Saved posts', description: 'Your private bookmarks', icon: '▱', action: onSaved },
    { title: 'Reels', description: 'Short videos', icon: '▶', action: onReels },
  ];
  return <ScrollView style={[styles.page, { backgroundColor: palette.canvas }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <View style={styles.header}>{onBack ? <Pressable onPress={onBack} accessibilityLabel="Back" style={[styles.back, { backgroundColor: palette.surface, borderColor: palette.border }]}><Text style={[styles.backText, { color: palette.ink }]}>‹</Text></Pressable> : null}<View style={styles.headerCopy}><Text style={[styles.kicker, { color: palette.blue }]}>CONNECTLY</Text><Text style={[styles.title, { color: palette.ink }]}>Menu</Text></View><Pressable onPress={onFindPeople} accessibilityLabel="Search people" style={[styles.headerButton, { backgroundColor: palette.surface, borderColor: palette.border }]}><Text style={[styles.headerButtonText, { color: palette.blue }]}>⌕</Text></Pressable></View>
    <Pressable accessibilityRole="button" style={({ pressed }) => [styles.profileCard, { backgroundColor: palette.surface, borderColor: palette.border }, pressed && styles.pressed]} onPress={onProfile}><Avatar initials={user.name.split(' ').map(part => part[0]).join('').slice(0, 2)} avatarUrl={user.avatarUrl} size={58} /><View style={styles.profileCopy}><Text style={[styles.profileName, { color: palette.ink }]}>{user.name}</Text><Text style={[styles.profileUsername, { color: palette.muted }]}>@{user.username}</Text><Text style={[styles.profileAction, { color: palette.blue }]}>View profile</Text></View><Text style={[styles.itemChevron, { color: palette.muted }]}>›</Text></Pressable>
    <Text style={[styles.heading, { color: palette.ink }]}>Shortcuts</Text><View style={styles.grid}>{shortcuts.map(item => <Pressable key={item.title} accessibilityRole="button" onPress={item.action} style={({ pressed }) => [styles.shortcut, { backgroundColor: palette.surface, borderColor: palette.border }, pressed && styles.pressed]}><View style={[styles.shortcutIcon, { backgroundColor: palette.blueSoft }]}><Text style={[styles.shortcutIconText, { color: palette.blue }]}>{item.icon}</Text></View><Text style={[styles.shortcutTitle, { color: palette.ink }]}>{item.title}</Text><Text style={[styles.shortcutDescription, { color: palette.muted }]}>{item.description}</Text></Pressable>)}</View>
    {user.accountType === 'page' ? <><Text style={[styles.heading, { color: palette.ink }]}>Creator tools</Text><View style={[styles.creatorCard, { backgroundColor: palette.blue }]}><View style={styles.creatorCopy}><Text style={styles.creatorTitle}>Creator dashboard</Text><Text style={styles.creatorDescription}>Insights, publishing and monetization</Text></View><Pressable accessibilityRole="button" onPress={() => onDetail('creator')} style={styles.creatorButton}><Text style={styles.creatorButtonText}>Open</Text></Pressable></View></> : null}
    <Text style={[styles.heading, { color: palette.ink }]}>Settings & privacy</Text><ExpandableSection title="Account & privacy" icon="⚙" palette={palette}>{settings.map(renderItem)}</ExpandableSection><ExpandableSection title="More preferences" icon="✦" palette={palette}>{privacyItems.map(renderItem)}{renderItem({ title: 'Messages', description: 'Private chats and message requests', icon: '✉', action: onMessages })}</ExpandableSection>
    <Text style={[styles.heading, { color: palette.ink }]}>Account</Text><View style={[styles.accountCard, { backgroundColor: palette.surface, borderColor: palette.border }]}><Pressable accessibilityRole="button" onPress={() => setShowLogout(true)} style={({ pressed }) => [styles.logout, pressed && styles.pressed]}><Text style={styles.logoutText}>Log out</Text></Pressable></View><Text style={[styles.footer, { color: palette.muted }]}>CONNECTLY · YOUR COMMUNITY, YOUR WAY · v1.0.0</Text>
    <ActionModal visible={showLogout} title="Log out of Connectly?" message="You can sign back in anytime with your account." icon="↪" onClose={() => setShowLogout(false)} actions={[{label: 'Cancel', tone: 'secondary', onPress: () => setShowLogout(false)}, {label: 'Log out', tone: 'destructive', onPress: async () => { setShowLogout(false); onLogout(); }}]} />
  </ScrollView>;
}

const styles = StyleSheet.create({
  page: { flex: 1 }, content: { padding: spacing.md, paddingBottom: 120 }, header: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg }, back: { width: 42, height: 42, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, backText: { fontSize: 30, lineHeight: 34 }, headerCopy: { flex: 1, marginLeft: spacing.sm }, kicker: { fontSize: 11, fontWeight: '900', letterSpacing: 1.6 }, title: { fontSize: 32, fontWeight: '900', letterSpacing: -1 }, headerButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, headerButtonText: { fontSize: 25 }, profileCard: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: radius.md, borderWidth: 1 }, profileCopy: { flex: 1, marginLeft: spacing.md }, profileName: { fontSize: 17, fontWeight: '900' }, profileUsername: { fontSize: 12, marginTop: 2 }, profileAction: { fontSize: 12, fontWeight: '800', marginTop: 7 }, heading: { fontSize: 18, fontWeight: '900', marginTop: spacing.xl, marginBottom: spacing.sm }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, shortcut: { width: '48%', minHeight: 112, padding: spacing.md, borderRadius: radius.md, borderWidth: 1 }, shortcutIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' }, shortcutIconText: { fontSize: 18 }, shortcutTitle: { fontSize: 14, fontWeight: '900', marginTop: spacing.sm }, shortcutDescription: { fontSize: 10, marginTop: 3 }, creatorCard: { borderRadius: radius.md, padding: spacing.md, flexDirection: 'row', alignItems: 'center' }, creatorCopy: { flex: 1 }, creatorTitle: { color: '#fff', fontSize: 15, fontWeight: '900' }, creatorDescription: { color: '#EAF1FF', fontSize: 11, marginTop: 4 }, creatorButton: { backgroundColor: '#fff', borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }, creatorButtonText: { color: colors.blue, fontWeight: '900', fontSize: 12 }, sectionCard: { borderRadius: radius.md, borderWidth: 1, overflow: 'hidden', marginBottom: spacing.sm }, sectionHeader: { minHeight: 62, padding: spacing.sm, flexDirection: 'row', alignItems: 'center' }, sectionIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' }, sectionIconText: { fontSize: 18 }, sectionTitle: { flex: 1, fontSize: 15, fontWeight: '900', marginLeft: spacing.sm }, sectionChevron: { fontSize: 22, marginRight: spacing.xs }, item: { flexDirection: 'row', alignItems: 'center', padding: spacing.sm, marginHorizontal: spacing.sm, borderTopWidth: 1 }, itemIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }, itemIconText: { fontSize: 16 }, itemCopy: { flex: 1, marginLeft: spacing.sm }, itemTitle: { fontSize: 13, fontWeight: '800' }, itemDescription: { fontSize: 10, marginTop: 2 }, itemChevron: { fontSize: 27 }, accountCard: { borderRadius: radius.md, borderWidth: 1, overflow: 'hidden' }, logout: { padding: spacing.md, alignItems: 'center' }, logoutText: { color: colors.danger, fontWeight: '900' }, pressed: { opacity: 0.7 }, footer: { textAlign: 'center', fontSize: 9, letterSpacing: 1, marginTop: spacing.xl },
});
