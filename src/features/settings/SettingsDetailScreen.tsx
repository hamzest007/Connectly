import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { apiRequest } from '../../services/api/client';
import { colors, radius, shadow, spacing } from '../../theme/tokens';
type Kind =
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
  | 'monetization';
export function SettingsDetailScreen({
  kind,
  accessToken,
  onBack,
  onLogout,
}: {
  kind: Kind;
  accessToken: string;
  onBack: () => void;
  onLogout: () => void;
}) {
  const [loading, setLoading] = React.useState(
    kind === 'activity' || kind === 'security' || kind === 'notifications' || kind === 'creator' || kind === 'close-friends' || kind === 'monetization',
  );
  const [items, setItems] = React.useState<any[]>([]);
  const [prefs, setPrefs] = React.useState<any>(null);
  const [following, setFollowing] = React.useState<any[]>([]);
  const [closeFriends, setCloseFriends] = React.useState<Set<string>>(new Set());
  const [monetization, setMonetization] = React.useState<any>(null);
  const labels: { [key in Kind]: [string, string] } = {
    activity: ['Your activity', 'Review your recent account activity.'],
    privacy: [
      'Privacy & security',
      'Control who can see and interact with you.',
    ],
    notifications: [
      'Notification preferences',
      'Choose the updates you want to receive.',
    ],
    security: [
      'Security & login',
      'Review active sessions and protect your account.',
    ],
    content: [
      'Content preferences',
      'Manage hidden words and sensitive content.',
    ],
    accessibility: ['Accessibility', 'Make Connectly easier to use.'],
    data: ['Your data', 'Export or manage your Connectly data.'],
    support: ['Help & support', 'Find answers and contact the Connectly team.'],
    account: [
      'Account controls',
      'Deactivate or permanently delete your account.',
    ],
    archive: ['Archive', 'Manage content you have archived.'],
    creator: ['Creator dashboard', 'See how your content is performing.'],
    'close-friends': ['Close friends', 'Choose who sees your closer updates.'],
    monetization: ['Monetization', 'Manage tips, subscriptions, and payouts.'],
  };
  React.useEffect(() => {
    void (async () => {
      try {
        if (kind === 'activity')
          setItems(await apiRequest<any[]>('/posts/activity', {}, accessToken));
        if (kind === 'creator')
          setItems([await apiRequest<any>('/users/me/creator-dashboard', {}, accessToken)]);
        if (kind === 'close-friends') {
          const [friends, selected] = await Promise.all([
            apiRequest<any[]>('/follows', {}, accessToken),
            apiRequest<any[]>('/users/me/close-friends', {}, accessToken),
          ]);
          setFollowing(friends);
          setCloseFriends(new Set(selected.map(item => String(item.friendId?._id ?? item.friendId))));
        }
        if (kind === 'monetization')
          setMonetization(await apiRequest<any>('/users/me/monetization', {}, accessToken));
        if (kind === 'security')
          setItems(await apiRequest<any[]>('/auth/sessions', {}, accessToken));
        if (kind === 'notifications')
          setPrefs(
            await apiRequest<any>(
              '/notifications/preferences',
              {},
              accessToken,
            ),
          );
      } catch {
      } finally {
        setLoading(false);
      }
    })();
  }, [accessToken, kind]);
  const toggle = async (key: string, value: boolean) => {
    try {
      const next = await apiRequest<any>(
        '/notifications/preferences',
        { method: 'PATCH', body: JSON.stringify({ [key]: !value }) },
        accessToken,
      );
      setPrefs(next);
    } catch (e) {
      Alert.alert(
        'Unable to update',
        e instanceof Error ? e.message : 'Please try again.',
      );
    }
  };
  const action = async (label: string) => {
    if (label === 'Export my data') {
      try {
        const data = await apiRequest<any>(
          '/auth/account/export',
          {},
          accessToken,
        );
        Alert.alert(
          'Data export ready',
          `Your account export was prepared at ${data.exportedAt}.`,
        );
      } catch (e) {
        Alert.alert(
          'Export failed',
          e instanceof Error ? e.message : 'Please try again.',
        );
      }
    } else if (label === 'Log out all other sessions') {
      await apiRequest('/auth/logout-all', { method: 'POST' }, accessToken);
      Alert.alert(
        'Sessions revoked',
        'All refresh sessions have been revoked.',
      );
      setItems([]);
    } else if (label === 'Deactivate account') {
      Alert.alert(
        'Deactivate account',
        'Your account will be hidden until you sign in again.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Deactivate',
            style: 'destructive',
            onPress: async () => {
              await apiRequest(
                '/auth/deactivate',
                { method: 'POST' },
                accessToken,
              );
              onLogout();
            },
          },
        ],
      );
    } else if (label === 'Delete account') {
      Alert.alert('Delete account', 'This permanently removes your account.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await apiRequest(
              '/auth/account',
              { method: 'DELETE' },
              accessToken,
            );
            onLogout();
          },
        },
      ]);
    } else
      Alert.alert(
        label,
        'This control is ready for its next policy-specific configuration.',
      );
  };
  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View>
          <Text style={styles.kicker}>SETTINGS</Text>
          <Text style={styles.title}>{labels[kind][0]}</Text>
        </View>
      </View>
      <Text style={styles.subtitle}>{labels[kind][1]}</Text>
      {loading ? (
        <ActivityIndicator color={colors.blue} style={styles.loader} />
      ) : kind === 'notifications' && prefs ? (
        <View>
          {(['engagement', 'social', 'messages', 'account'] as const).map(
            key => (
              <Pressable
                key={key}
                style={styles.row}
                onPress={() => void toggle(key, Boolean(prefs[key]))}
              >
                <View style={styles.copy}>
                  <Text style={styles.rowTitle}>
                    {key[0].toUpperCase() + key.slice(1)}
                  </Text>
                  <Text style={styles.rowMeta}>
                    In-app and push notifications
                  </Text>
                </View>
                <View style={[styles.toggle, prefs[key] && styles.toggleOn]}>
                  <View style={[styles.thumb, prefs[key] && styles.thumbOn]} />
                </View>
              </Pressable>
            ),
          )}
        </View>
      ) : kind === 'security' ? (
        <View>
          {items.map(item => (
            <View style={styles.row} key={item._id}>
              <View style={styles.copy}>
                <Text style={styles.rowTitle}>Active session</Text>
                <Text style={styles.rowMeta}>
                  Created {new Date(item.createdAt).toLocaleString()}
                </Text>
              </View>
              <Pressable
                onPress={() =>
                  void apiRequest(
                    `/auth/sessions/${item._id}`,
                    { method: 'DELETE' },
                    accessToken,
                  ).then(() =>
                    setItems(current =>
                      current.filter(value => value._id !== item._id),
                    ),
                  )
                }
              >
                <Text style={styles.actionText}>Revoke</Text>
              </Pressable>
            </View>
          ))}
          <Pressable
            style={styles.primary}
            onPress={() => void action('Log out all other sessions')}
          >
            <Text style={styles.primaryText}>Log out all other sessions</Text>
          </Pressable>
        </View>
      ) : kind === 'close-friends' ? (
        <View>
          {following.map(item => {
            const person = item.followingId;
            if (!person) return null;
            const selected = closeFriends.has(String(person._id));
            return <Pressable style={styles.row} key={person._id} onPress={() => { const next = new Set(closeFriends); if (selected) { next.delete(String(person._id)); void apiRequest(`/users/me/close-friends/${person._id}`, {method:'DELETE'}, accessToken); } else { next.add(String(person._id)); void apiRequest(`/users/me/close-friends/${person._id}`, {method:'PUT'}, accessToken); } setCloseFriends(next); }}><View style={styles.copy}><Text style={styles.rowTitle}>{person.name}</Text><Text style={styles.rowMeta}>@{person.username}</Text></View><Text style={styles.actionText}>{selected ? 'Added' : 'Add'}</Text></Pressable>;
          })}
          {!following.length ? <Text style={styles.empty}>Follow people first to add close friends.</Text> : null}
        </View>
      ) : kind === 'monetization' ? (
        <View>
          <Text style={styles.sectionHint}>Your settings are saved to your account and can be changed anytime.</Text>
          {(['enabled','tipsEnabled','subscriptionsEnabled'] as const).map(key => <Pressable style={styles.row} key={key} onPress={() => { const next = {...monetization, [key]: !monetization?.[key]}; setMonetization(next); void apiRequest('/users/me/monetization',{method:'PATCH',body:JSON.stringify({[key]:next[key]})},accessToken); }}><View style={styles.copy}><Text style={styles.rowTitle}>{key === 'enabled' ? 'Enable monetization' : key === 'tipsEnabled' ? 'Accept tips' : 'Offer subscriptions'}</Text><Text style={styles.rowMeta}>{monetization?.[key] ? 'Enabled' : 'Disabled'}</Text></View><Text style={styles.actionText}>{monetization?.[key] ? 'On' : 'Off'}</Text></Pressable>)}
          <TextInput value={monetization?.payoutEmail ?? ''} onChangeText={value => setMonetization({...monetization,payoutEmail:value})} onEndEditing={() => void apiRequest('/users/me/monetization',{method:'PATCH',body:JSON.stringify({payoutEmail:monetization?.payoutEmail ?? ''})},accessToken)} placeholder="Payout email" placeholderTextColor={colors.muted} autoCapitalize="none" keyboardType="email-address" style={styles.input} />
        </View>
      ) : kind === 'creator' ? (
        <View>
          {Object.entries(items[0] ?? {}).filter(([key]) => key !== '_id').map(([key, value]) => (
            <View style={styles.row} key={key}>
              <View style={styles.copy}>
                <Text style={styles.rowTitle}>{key[0].toUpperCase() + key.slice(1)}</Text>
                <Text style={styles.rowMeta}>Lifetime creator metric</Text>
              </View>
              <Text style={styles.metricValue}>{String(value)}</Text>
            </View>
          ))}
        </View>
      ) : kind === 'activity' ? (
        <View>
          {items.map(item => (
            <View style={styles.row} key={item._id}>
              <View style={styles.copy}>
                <Text style={styles.rowTitle}>
                  {item.postId?.body || 'Viewed post'}
                </Text>
                <Text style={styles.rowMeta}>
                  {item.viewedAt
                    ? new Date(item.viewedAt).toLocaleString()
                    : ''}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View>
          {(kind === 'data'
            ? ['Export my data', 'Clear search history']
            : kind === 'account'
            ? ['Deactivate account', 'Delete account']
            : kind === 'privacy'
            ? [
                'Private account',
                'Blocked accounts',
                'Muted accounts',
                'Restricted accounts',
              ]
            : kind === 'support'
            ? ['Help center', 'Report a problem', 'Community guidelines']
            : kind === 'content'
            ? ['Hidden words', 'Sensitive content', 'Muted topics']
            : kind === 'accessibility'
            ? ['Captions', 'Text size', 'Reduced motion']
            : kind === 'archive'
            ? ['Archived posts', 'Archived stories']
            : ['Password', 'Two-factor authentication']
          ).map(label => (
            <Pressable
              style={styles.row}
              key={label}
              onPress={() => void action(label)}
            >
              <View style={styles.copy}>
                <Text style={styles.rowTitle}>{label}</Text>
                <Text style={styles.rowMeta}>Manage this setting</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.canvas, padding: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
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
  kicker: {
    fontSize: 10,
    letterSpacing: 1.5,
    color: colors.blue,
    fontWeight: '900',
    marginLeft: spacing.sm,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.ink,
    marginLeft: spacing.sm,
  },
  subtitle: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 20,
    marginVertical: spacing.md,
  },
  loader: { marginTop: spacing.xl },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadow,
  },
  copy: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: '900', color: colors.ink },
  rowMeta: { fontSize: 11, color: colors.muted, marginTop: 4 },
  sectionHint: { color: colors.muted, fontSize: 13, lineHeight: 20, marginBottom: spacing.sm },
  empty: { color: colors.muted, fontSize: 13, paddingVertical: spacing.lg },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, color: colors.ink, marginTop: spacing.md },
  metricValue: { fontSize: 20, fontWeight: '900', color: colors.blue },
  chevron: { fontSize: 28, color: colors.muted },
  actionText: { fontSize: 12, color: colors.blue, fontWeight: '900' },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border,
    padding: 3,
  },
  toggleOn: { backgroundColor: colors.blue },
  thumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' },
  thumbOn: { alignSelf: 'flex-end' },
  primary: {
    backgroundColor: colors.blue,
    borderRadius: radius.pill,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  primaryText: { color: '#fff', fontWeight: '900' },
});
