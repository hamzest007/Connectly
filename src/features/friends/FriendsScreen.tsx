import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Avatar } from '../../components/common/Avatar';
import { colors, radius, shadow, spacing } from '../../theme/tokens';
import { apiRequest } from '../../services/api/client';

type User = { _id: string; name: string; username: string; avatarUrl?: string; accountType?: 'user' | 'page' };
type FriendRequest = { _id: string; requesterId: User };

export function FriendsScreen({
  accessToken,
  onOpenProfile,
  onOpenRequests,
}: {
  accessToken: string;
  onOpenProfile?: (user: { name: string; username: string }) => void;
  onOpenRequests?: () => void;
}) {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [following, setFollowing] = useState<string[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    void apiRequest<Array<{ followingId: string | { _id: string } }>>(
      '/follows',
      {},
      accessToken,
    )
      .then(items =>
        setFollowing(
          items.map(item =>
            typeof item.followingId === 'string'
              ? item.followingId
              : item.followingId._id,
          ),
        ),
      )
      .catch(() => setFollowing([]));
  }, [accessToken]);
  useEffect(() => {
    void apiRequest<FriendRequest[]>('/friends/requests', {}, accessToken)
      .then(setRequests)
      .catch(() => setRequests([]));
  }, [accessToken]);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!query.trim()) {
        setUsers([]);
        return;
      }
      setLoading(true);
      void apiRequest<User[]>(
        `/users/search?q=${encodeURIComponent(query)}`,
        {},
        accessToken,
      )
        .then(setUsers)
        .catch(() => setUsers([]))
        .finally(() => setLoading(false));
    }, 280);
    return () => clearTimeout(timer);
  }, [query, accessToken]);
  const toggleFollow = async (id: string) => {
    try {
      if (following.includes(id)) {
        await apiRequest(`/follows/${id}`, { method: 'DELETE' }, accessToken);
        setFollowing(items => items.filter(item => item !== id));
      } else {
        await apiRequest(`/follows/${id}`, { method: 'POST' }, accessToken);
        setFollowing(items => [...items, id]);
      }
    } catch {}
  };
  const sendFriendRequest = async (id: string) => {
    if (sentRequests.includes(id)) return;
    try {
      await apiRequest(`/friends/${id}`, { method: 'POST' }, accessToken);
      setSentRequests(items => [...items, id]);
    } catch {}
  };
  const respondToRequest = async (
    request: FriendRequest,
    status: 'accepted' | 'declined',
  ) => {
    try {
      await apiRequest(
        `/friends/${request._id}`,
        { method: 'PATCH', body: JSON.stringify({ status }) },
        accessToken,
      );
      setRequests(items => items.filter(item => item._id !== request._id));
    } catch {}
  };
  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>CONNECT WITH PEOPLE</Text>
          <Text style={styles.title}>Friends</Text>
        </View>
        <Pressable style={styles.headerBadge} onPress={onOpenRequests}>
          <Text style={styles.headerIcon}>♧</Text>
          {requests.length ? <View style={styles.requestBadge}><Text style={styles.requestBadgeText}>{requests.length > 9 ? '9+' : requests.length}</Text></View> : null}
        </Pressable>
      </View>
      <Text style={styles.subtitle}>
        Find your people and build your circle.
      </Text>
      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name or username"
          placeholderTextColor={colors.muted}
          style={styles.search}
        />
        {query ? (
          <Pressable onPress={() => setQuery('')}>
            <Text style={styles.clear}>×</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.quickRow}>
        <View style={[styles.quickCard, { backgroundColor: colors.blueSoft }]}>
          <Text style={styles.quickIcon}>✦</Text>
          <Text style={styles.quickTitle}>Discover</Text>
          <Text style={styles.quickMeta}>People for you</Text>
        </View>
        <View style={[styles.quickCard, { backgroundColor: colors.lavender }]}>
          <Text style={styles.quickIcon}>♡</Text>
          <Text style={styles.quickTitle}>Following</Text>
          <Text style={styles.quickMeta}>Your connections</Text>
        </View>
      </View>
      {requests.length ? (
        <View>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Friend requests</Text>
            <Text style={styles.resultCount}>{requests.length} waiting</Text>
          </View>
          {requests.map(request => (
            <View style={styles.requestCard} key={request._id}>
              <Avatar
                initials={request.requesterId.name
                  .split(' ')
                  .map(part => part[0])
                  .join('')
                  .slice(0, 2)}
                avatarUrl={request.requesterId.avatarUrl}
              />
              <View style={styles.info}>
                <Text style={styles.requesterName}>
                  {request.requesterId.name}
                </Text>
                <Text style={styles.requesterMeta}>
                  @{request.requesterId.username} wants to connect
                </Text>
              </View>
              <View style={styles.requestActions}>
                <Pressable
                  style={styles.acceptButton}
                  onPress={() => void respondToRequest(request, 'accepted')}
                >
                  <Text style={styles.acceptText}>Accept</Text>
                </Pressable>
                <Pressable
                  style={styles.declineButton}
                  onPress={() => void respondToRequest(request, 'declined')}
                >
                  <Text style={styles.declineText}>×</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      ) : null}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {query ? 'Search results' : 'Find friends'}
        </Text>
        {query ? (
          <Text style={styles.resultCount}>{users.length} found</Text>
        ) : null}
      </View>
      {loading ? (
        <ActivityIndicator color={colors.blue} style={styles.loader} />
      ) : users.length ? (
        users.map(user => (
          <View style={styles.row} key={user._id}>
            <Pressable
              style={styles.personTap}
              onPress={() =>
                onOpenProfile?.({ name: user.name, username: user.username })
              }
            >
              <Avatar
                initials={user.name
                  .split(' ')
                  .map(part => part[0])
                  .join('')
                  .slice(0, 2)}
                avatarUrl={user.avatarUrl}
              />
              <View style={styles.info}>
                <Text style={styles.name}>{user.name}</Text>
                <Text style={styles.meta}>@{user.username}</Text>
              </View>
            </Pressable>
            <View style={styles.rowActions}>
              {user.accountType === 'page' ? <Pressable
                style={[
                  styles.button,
                  following.includes(user._id) && styles.followingButton,
                ]}
                onPress={() => void toggleFollow(user._id)}
              >
                <Text
                  style={[
                    styles.buttonText,
                    following.includes(user._id) && styles.followingText,
                  ]}
                >
                  {following.includes(user._id) ? 'Following' : 'Follow'}
                </Text>
              </Pressable> : null}
              {user.accountType !== 'page' ? <Pressable
                style={[
                  styles.friendButton,
                  sentRequests.includes(user._id) && styles.friendPending,
                ]}
                onPress={() => void sendFriendRequest(user._id)}
              >
                <Text
                  style={[
                    styles.friendText,
                    sentRequests.includes(user._id) && styles.friendPendingText,
                  ]}
                >
                  {sentRequests.includes(user._id)
                    ? 'Request sent'
                    : 'Add friend'}
                </Text>
              </Pressable> : null}
            </View>
          </View>
        ))
      ) : (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Text style={styles.emptyIconText}>⌕</Text>
          </View>
          <Text style={styles.emptyTitle}>
            {query ? 'No people found' : 'Start building your circle'}
          </Text>
          <Text style={styles.emptyText}>
            {query
              ? 'Try a different name or username.'
              : 'Search for people you know and follow their updates.'}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: spacing.md, paddingBottom: 120 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
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
  headerBadge: {
    width: 50,
    height: 50,
    borderRadius: 18,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  headerIcon: { fontSize: 25, color: '#fff' },
  requestBadge: { position: 'absolute', top: -5, right: -5, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.canvas },
  requestBadgeText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  subtitle: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 6,
    marginBottom: spacing.lg,
  },
  searchWrap: {
    height: 58,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    ...shadow,
  },
  searchIcon: { fontSize: 25, color: colors.blue, marginRight: spacing.sm },
  search: { flex: 1, color: colors.ink, fontSize: 14, fontWeight: '600' },
  clear: { fontSize: 22, color: colors.muted, paddingLeft: spacing.sm },
  quickRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  quickCard: {
    flex: 1,
    minHeight: 116,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadow,
  },
  quickIcon: { fontSize: 20, color: colors.blue },
  quickTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.ink,
    marginTop: spacing.sm,
  },
  quickMeta: { fontSize: 11, color: colors.muted, marginTop: 3 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  sectionTitle: { fontSize: 19, fontWeight: '900', color: colors.ink },
  resultCount: { fontSize: 12, color: colors.muted, fontWeight: '700' },
  loader: { marginTop: spacing.xl },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
  },
  requestCard: {
    backgroundColor: colors.ink,
    borderRadius: radius.lg,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    ...shadow,
  },
  requesterName: { fontWeight: '900', color: '#fff', fontSize: 14 },
  requesterMeta: { fontSize: 12, color: 'rgba(255,255,255,.62)', marginTop: 3 },
  requestActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  acceptButton: {
    backgroundColor: colors.blue,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  acceptText: { color: '#fff', fontWeight: '900', fontSize: 11 },
  declineButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineText: { color: '#fff', fontSize: 18 },
  personTap: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  info: { flex: 1, marginLeft: spacing.sm },
  name: { fontWeight: '900', color: colors.ink, fontSize: 14 },
  meta: { fontSize: 12, color: colors.muted, marginTop: 3 },
  rowActions: { alignItems: 'flex-end', gap: spacing.xs },
  button: {
    backgroundColor: colors.blue,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  buttonText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  followingButton: { backgroundColor: colors.blueSoft },
  followingText: { color: colors.blue },
  friendButton: {
    backgroundColor: colors.ink,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  friendText: { color: '#fff', fontWeight: '800', fontSize: 10 },
  friendPending: { backgroundColor: colors.surfaceAlt },
  friendPendingText: { color: colors.muted },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.sm,
    ...shadow,
  },
  emptyIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyIconText: { fontSize: 27, color: colors.blue },
  emptyTitle: { fontSize: 16, fontWeight: '900', color: colors.ink },
  emptyText: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: spacing.xs,
  },
});
