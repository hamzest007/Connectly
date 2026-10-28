import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Avatar } from '../../components/common/Avatar';
import { colors, radius, shadow, spacing } from '../../theme/tokens';
import { apiRequest } from '../../services/api/client';

type Notice = {
  _id: string;
  type?: string;
  message: string;
  createdAt: string;
  readAt?: string | null;
  entityType?: string;
  entityId?: string;
  actorId?: { name: string; username?: string; avatarUrl?: string };
};
export function NotificationsScreen({ accessToken, profileType = 'personal', onOpenEntity }: { accessToken: string; profileType?: 'personal'|'page'; onOpenEntity?: (item: Notice) => void }) {
  const [items, setItems] = React.useState<Notice[]>([]);
  const [loading, setLoading] = React.useState(true);
  const load = React.useCallback(() => {
    setLoading(true);
    void apiRequest<{ items: Notice[] }>(profileType === 'page' ? '/notifications/page' : '/notifications', {}, accessToken)
      .then(result => setItems(result.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [accessToken, profileType]);
  React.useEffect(() => {
    load();
  }, [load]);
  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={load}
          tintColor={colors.blue}
        />
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>YOUR COMMUNITY</Text>
          <Text style={styles.title}>Notifications</Text>
        </View>
        <View style={styles.bell}>
          <Text style={styles.bellIcon}>♡</Text>
        </View>
      </View>
      <Text style={styles.subtitle}>
        Stay close to the people and moments that matter.
      </Text>
      <View style={styles.summary}>
        <View style={styles.summaryIcon}>
          <Text style={styles.summaryIconText}>✦</Text>
        </View>
        <View style={styles.summaryCopy}>
          <Text style={styles.summaryTitle}>
            {items.length
              ? `${items.length} recent updates`
              : 'You’re all caught up'}
          </Text>
          <Text style={styles.summaryText}>
            {items.length
              ? 'New activity from your community'
              : 'New reactions and follows will appear here.'}
          </Text>
        </View>
      </View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text style={styles.sectionTitle}>Recent activity</Text>
        {items.some(item => !item.readAt) ? (
          <Pressable
            onPress={() =>
              void apiRequest(
                profileType === 'page' ? '/notifications/page/read-all' : '/notifications/read-all',
                { method: 'POST' },
                accessToken,
              ).then(() => void load())
            }
          >
            <Text
              style={{ color: colors.blue, fontWeight: '900', fontSize: 12 }}
            >
              Mark all read
            </Text>
          </Pressable>
        ) : null}
      </View>
      {loading && !items.length ? (
        <ActivityIndicator color={colors.blue} style={styles.loader} />
      ) : items.length ? (
        items.map(item => (
          <Pressable
            style={[styles.row, !item.readAt && styles.unread]}
            key={item._id}
            onPress={() =>
              void apiRequest(
                `/notifications/${item._id}/read`,
                { method: 'PATCH' },
                accessToken,
              ).then(() => {
                setItems(current => current.map(value => value._id === item._id ? {...value, readAt: new Date().toISOString()} : value));
                onOpenEntity?.(item);
              })
            }
          >
            <Avatar
              initials={(item.actorId?.name ?? 'C')
                .split(' ')
                .map(part => part[0])
                .join('')
                .slice(0, 2)}
              avatarUrl={item.actorId?.avatarUrl}
            />
            <View style={styles.copy}>
              <Text style={styles.text}>
                {item.actorId?.name
                  ? `${item.actorId.name} ${item.message}`
                  : item.message}
              </Text>
              <Text style={styles.time}>
                {new Date(item.createdAt).toLocaleString()}
              </Text>
            </View>
            {!item.readAt ? <View style={styles.dot} /> : null}
            <Pressable
              onPress={() =>
                void apiRequest(
                  `/notifications/${item._id}`,
                  { method: 'DELETE' },
                  accessToken,
                ).then(() =>
                  setItems(current =>
                    current.filter(value => value._id !== item._id),
                  ),
                )
              }
            >
              <Text
                style={{
                  fontSize: 22,
                  color: colors.muted,
                  paddingLeft: spacing.sm,
                }}
              >
                ×
              </Text>
            </Pressable>
          </Pressable>
        ))
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>♡</Text>
          <Text style={styles.emptyTitle}>Nothing new yet</Text>
          <Text style={styles.emptyText}>
            When someone interacts with your posts, you’ll see it here.
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
  bell: {
    width: 50,
    height: 50,
    borderRadius: 18,
    backgroundColor: colors.peach,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  bellIcon: { fontSize: 25, color: '#EC7B45' },
  subtitle: {
    fontSize: 14,
    color: colors.muted,
    lineHeight: 21,
    marginTop: 6,
    marginBottom: spacing.lg,
  },
  summary: {
    backgroundColor: colors.ink,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadow,
  },
  summaryIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryIconText: { color: '#fff', fontSize: 21 },
  summaryCopy: { marginLeft: spacing.sm, flex: 1 },
  summaryTitle: { color: '#fff', fontSize: 15, fontWeight: '900' },
  summaryText: { color: 'rgba(255,255,255,.68)', fontSize: 12, marginTop: 3 },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: colors.ink,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  loader: { marginTop: spacing.xl },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
  },
  unread: { borderColor: colors.blue, backgroundColor: colors.blueSoft },
  copy: { flex: 1, marginLeft: spacing.sm },
  text: { color: colors.ink, fontWeight: '700', fontSize: 13, lineHeight: 19 },
  time: { color: colors.muted, fontSize: 11, marginTop: 4 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.blue },
  empty: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
  },
  emptyIcon: { fontSize: 32, color: colors.blue },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.ink,
    marginTop: spacing.sm,
  },
  emptyText: {
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
    fontSize: 13,
    marginTop: spacing.xs,
  },
});
