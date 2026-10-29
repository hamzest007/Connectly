import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '../../components/common/Avatar';
import { colors, radius, shadow, spacing } from '../../theme/tokens';

type Mode = 'post' | 'story' | 'reel';
type Action = { title: string; subtitle: string; icon: string; mode: Mode; interaction?: 'poll'; media?: 'photo' | 'video' };

export function CreateHubScreen({ user, onCreate }: { user: { name: string; avatarUrl?: string }; onCreate: (mode: Mode, options?: { interaction?: 'poll'; media?: 'photo' | 'video' }) => void }) {
  const initials = user.name.split(' ').map(part => part[0]).join('').slice(0, 2);
  const main: Action[] = [
    { title: 'Create post', subtitle: 'Share an update with your community', icon: '✎', mode: 'post' },
    { title: 'Create story', subtitle: 'A moment that disappears in 24 hours', icon: '◉', mode: 'story' },
    { title: 'Create reel', subtitle: 'Publish an immersive short video', icon: '▶', mode: 'reel' },
  ];
  const quick: Action[] = [
    { title: 'Photo', subtitle: 'Add photos to a post', icon: '▧', mode: 'post', media: 'photo' },
    { title: 'Video', subtitle: 'Share a video post', icon: '▹', mode: 'post', media: 'video' },
    { title: 'Create poll', subtitle: 'Ask your community', icon: '◫', mode: 'post', interaction: 'poll' },
    { title: 'Text update', subtitle: 'Write something simple', icon: 'T', mode: 'post' },
  ];
  const card = (item: Action) => <Pressable key={item.title} style={({ pressed }) => [styles.actionCard, pressed && styles.pressed]} onPress={() => onCreate(item.mode, { interaction: item.interaction, media: item.media })} accessibilityRole="button" accessibilityLabel={item.title}><View style={styles.actionIcon}><Text style={styles.actionIconText}>{item.icon}</Text></View><View style={styles.actionCopy}><Text style={styles.actionTitle}>{item.title}</Text><Text style={styles.actionSubtitle}>{item.subtitle}</Text></View><Text style={styles.chevron}>›</Text></Pressable>;
  return <ScrollView style={styles.page} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <View style={styles.header}><View><Text style={styles.eyebrow}>SHARE YOUR MOMENT</Text><Text style={styles.title}>Create</Text><Text style={styles.subtitle}>Turn an idea into something your community can enjoy.</Text></View><View style={styles.headerOrb}><Text style={styles.headerOrbText}>＋</Text></View></View>
    <Pressable style={({ pressed }) => [styles.composer, pressed && styles.pressed]} onPress={() => onCreate('post')} accessibilityRole="button"><Avatar initials={initials} avatarUrl={user.avatarUrl} size={48} /><View style={styles.composerCopy}><Text style={styles.composerTitle}>What’s on your mind?</Text><Text style={styles.composerSubtitle}>Start a post, poll, or update</Text></View><Text style={styles.composerArrow}>›</Text></Pressable>
    <Text style={styles.sectionTitle}>Create something new</Text>
    <View style={styles.grid}>{main.map(item => <View key={item.title} style={styles.gridItem}>{card(item)}</View>)}</View>
    <Text style={styles.sectionTitle}>Quick actions</Text>
    {quick.map(card)}
    <View style={styles.note}><Text style={styles.noteIcon}>✦</Text><View style={styles.noteCopy}><Text style={styles.noteTitle}>Your content, your audience</Text><Text style={styles.noteText}>Choose privacy, add accessibility text, and save drafts from the editor.</Text></View></View>
  </ScrollView>;
}

const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: colors.canvas }, content: { padding: spacing.md, paddingBottom: 130 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm, marginBottom: spacing.lg }, eyebrow: { color: colors.blue, fontSize: 10, letterSpacing: 1.5, fontWeight: '900' }, title: { color: colors.ink, fontSize: 36, fontWeight: '900', letterSpacing: -1.2, marginTop: 4 }, subtitle: { color: colors.muted, fontSize: 14, lineHeight: 20, marginTop: 5, maxWidth: 290 }, headerOrb: { width: 58, height: 58, borderRadius: 20, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center', ...shadow }, headerOrbText: { color: '#fff', fontSize: 29, fontWeight: '300' }, composer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, ...shadow }, composerCopy: { flex: 1, marginLeft: spacing.sm }, composerTitle: { color: colors.ink, fontSize: 15, fontWeight: '900' }, composerSubtitle: { color: colors.muted, fontSize: 12, marginTop: 3 }, composerArrow: { color: colors.blue, fontSize: 28 }, sectionTitle: { color: colors.ink, fontSize: 20, fontWeight: '900', marginTop: spacing.xl, marginBottom: spacing.sm }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, gridItem: { width: '48%' }, actionCard: { minHeight: 92, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.sm, flexDirection: 'row', alignItems: 'center', ...shadow }, actionIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' }, actionIconText: { color: colors.blue, fontSize: 20, fontWeight: '900' }, actionCopy: { flex: 1, marginLeft: spacing.sm }, actionTitle: { color: colors.ink, fontSize: 13, fontWeight: '900' }, actionSubtitle: { color: colors.muted, fontSize: 10, lineHeight: 14, marginTop: 3 }, chevron: { color: colors.muted, fontSize: 24, marginLeft: 2 }, pressed: { opacity: 0.72, transform: [{ scale: 0.99 }] }, note: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.blueSoft, borderRadius: radius.lg, padding: spacing.md, marginTop: spacing.xl }, noteIcon: { color: colors.blue, fontSize: 22 }, noteCopy: { flex: 1, marginLeft: spacing.sm }, noteTitle: { color: colors.ink, fontSize: 13, fontWeight: '900' }, noteText: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 3 } });
