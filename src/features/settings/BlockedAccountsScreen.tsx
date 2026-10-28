import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Avatar } from '../../components/common/Avatar';
import { apiRequest } from '../../services/api/client';
import { colors, radius, shadow, spacing } from '../../theme/tokens';

type BlockedUser = {
  _id: string;
  name: string;
  username: string;
  avatarUrl?: string;
};

export function BlockedAccountsScreen({
  accessToken,
  onBack,
}: {
  accessToken: string;
  onBack: () => void;
}) {
  const [items, setItems] = React.useState<BlockedUser[]>([]);
  const [query, setQuery] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState('');
  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiRequest<Array<{ blockedId: BlockedUser }>>(
        '/blocks',
        {},
        accessToken,
      );
      setItems(result.map(item => item.blockedId).filter(Boolean));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Unable to load blocked accounts.',
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken]);
  React.useEffect(() => {
    void load();
  }, [load]);
  const unblock = async (id: string) => {
    setBusy(id);
    try {
      await apiRequest(`/blocks/${id}`, { method: 'DELETE' }, accessToken);
      setItems(current => current.filter(item => item._id !== id));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Unable to unblock this account.',
      );
    } finally {
      setBusy(null);
    }
  };
  const visible = items.filter(item =>
    `${item.name} ${item.username}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.kicker}>PRIVACY</Text>
          <Text style={styles.title}>Blocked accounts</Text>
        </View>
      </View>
      <Text style={styles.subtitle}>
        People you block cannot follow, message, or interact with you.
      </Text>
      <View style={styles.search}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search blocked accounts"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? (
        <ActivityIndicator color={colors.blue} style={styles.loader} />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Avatar
                initials={item.name
                  .split(' ')
                  .map(part => part[0])
                  .join('')
                  .slice(0, 2)}
                avatarUrl={item.avatarUrl}
                size={46}
              />
              <View style={styles.copy}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.username}>@{item.username}</Text>
              </View>
              <Pressable
                style={styles.unblock}
                onPress={() => void unblock(item._id)}
                disabled={busy === item._id}
              >
                <Text style={styles.unblockText}>
                  {busy === item._id ? '…' : 'Unblock'}
                </Text>
              </Pressable>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>✓</Text>
              <Text style={styles.emptyTitle}>
                {query ? 'No matching accounts' : 'No blocked accounts'}
              </Text>
              <Text style={styles.emptyText}>
                {query
                  ? 'Try another name or username.'
                  : 'Accounts you block will appear here.'}
              </Text>
            </View>
          }
        />
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
  headerCopy: { marginLeft: spacing.sm },
  kicker: {
    fontSize: 10,
    letterSpacing: 1.5,
    color: colors.blue,
    fontWeight: '900',
  },
  title: { fontSize: 24, fontWeight: '900', color: colors.ink, marginTop: 2 },
  subtitle: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 20,
    marginVertical: spacing.md,
  },
  search: {
    height: 50,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    ...shadow,
  },
  searchIcon: { fontSize: 22, color: colors.blue },
  input: {
    flex: 1,
    color: colors.ink,
    fontSize: 14,
    paddingHorizontal: spacing.sm,
  },
  error: { color: colors.danger, fontSize: 12, marginTop: spacing.sm },
  loader: { marginTop: spacing.xl },
  list: { paddingTop: spacing.md, paddingBottom: 120 },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadow,
  },
  copy: { flex: 1, marginLeft: spacing.sm },
  name: { fontSize: 14, fontWeight: '900', color: colors.ink },
  username: { fontSize: 11, color: colors.muted, marginTop: 3 },
  unblock: {
    borderRadius: radius.pill,
    backgroundColor: colors.blueSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  unblockText: { color: colors.blue, fontWeight: '900', fontSize: 12 },
  empty: { alignItems: 'center', padding: spacing.xl, marginTop: spacing.xl },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.mint,
    color: colors.success,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 24,
    fontWeight: '900',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.ink,
    marginTop: spacing.md,
  },
  emptyText: {
    fontSize: 13,
    color: colors.muted,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});
