import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Avatar } from '../../components/common/Avatar';
import { apiRequest } from '../../services/api/client';
import { colors, radius, shadow, spacing } from '../../theme/tokens';

type UserResult = {
  _id: string;
  name: string;
  username: string;
  avatarUrl?: string;
  bio?: string;
  isVerified?: boolean;
};
type PostResult = {
  _id: string;
  body: string;
  createdAt: string;
  authorId: { name: string; username: string; avatarUrl?: string };
  media?: { url: string; type: 'image' | 'video' }[];
};
type SearchResponse = {
  users: UserResult[];
  posts: PostResult[];
  hashtags: { tag: string; posts: number }[];
  nextCursor: string | null;
};
export function SearchScreen({
  accessToken,
  initialQuery = '',
  onBack,
  onOpenProfile,
}: {
  accessToken: string;
  initialQuery?: string;
  onBack?: () => void;
  onOpenProfile?: (user: {
    id?: string;
    name: string;
    username: string;
  }) => void;
}) {
  const [query, setQuery] = React.useState(initialQuery);
  const [type, setType] = React.useState('all');
  const [result, setResult] = React.useState<SearchResponse | null>(null);
  const [trending, setTrending] = React.useState<
    { tag: string; posts: number }[]
  >([]);
  const [recent, setRecent] = React.useState<{ query: string }[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const load = async (value = query, kind = type) => {
    if (!value.trim()) return;
    setLoading(true);
    setError('');
    try {
      setResult(
        await apiRequest<SearchResponse>(
          `/search?q=${encodeURIComponent(value.trim())}&type=${kind}`,
          {},
          accessToken,
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed.');
    } finally {
      setLoading(false);
    }
  };
  React.useEffect(() => {
    void Promise.all([
      apiRequest<typeof trending>('/search/trending', {}, accessToken),
      apiRequest<typeof recent>('/search/recent', {}, accessToken),
    ])
      .then(([tags, history]) => {
        setTrending(tags);
        setRecent(history);
      })
      .catch(() => undefined);
  }, [accessToken]);
  React.useEffect(() => {
    if (initialQuery.trim()) {
      setQuery(initialQuery);
      void load(initialQuery);
    }
  }, [initialQuery]);
  const filters = ['all', 'users', 'posts', 'reels', 'hashtags'];
  return (
    <View style={styles.page}>
      <View style={styles.header}>
        {onBack ? (
          <Pressable onPress={onBack} style={styles.backButton}>
            <Text style={styles.backText}>‹ Back</Text>
          </Pressable>
        ) : null}
        <Text style={styles.kicker}>DISCOVER</Text>
        <Text style={styles.title}>Search</Text>
        <Text style={styles.subtitle}>
          Find people, conversations, creators and ideas.
        </Text>
      </View>
      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => void load()}
          placeholder="Search people, posts or hashtags"
          placeholderTextColor={colors.muted}
          style={styles.input}
          returnKeyType="search"
        />
        <Pressable
          onPress={() => {
            setQuery('');
            setResult(null);
          }}
        >
          <Text style={styles.clear}>×</Text>
        </Pressable>
      </View>
      <FlatList
        style={styles.filterList}
        horizontal
        showsHorizontalScrollIndicator={false}
        data={filters}
        keyExtractor={item => item}
        contentContainerStyle={styles.filters}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => {
              setType(item);
              if (query) void load(query, item);
            }}
            style={[styles.filter, type === item && styles.filterActive]}
          >
            <Text
              style={[
                styles.filterText,
                type === item && styles.filterTextActive,
              ]}
            >
              {item[0].toUpperCase() + item.slice(1)}
            </Text>
          </Pressable>
        )}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? (
        <ActivityIndicator color={colors.blue} style={styles.loader} />
      ) : result ? (
        <FlatList
          data={[
            ...result.users.map(item => ({ kind: 'user' as const, item })),
            ...result.posts.map(item => ({ kind: 'post' as const, item })),
          ]}
          keyExtractor={(item, index) =>
            `${item.kind}-${item.item._id}-${index}`
          }
          contentContainerStyle={styles.results}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={() => void load()}
              tintColor={colors.blue}
            />
          }
          renderItem={({ item }) =>
            item.kind === 'user' ? (
              <Pressable
                style={styles.userCard}
                onPress={() =>
                  onOpenProfile?.({
                    id: item.item._id,
                    name: item.item.name,
                    username: item.item.username,
                  })
                }
              >
                <Avatar
                  initials={item.item.name
                    .split(' ')
                    .map(part => part[0])
                    .join('')
                    .slice(0, 2)}
                  avatarUrl={item.item.avatarUrl}
                  size={46}
                />
                <View style={styles.resultCopy}>
                  <Text style={styles.resultName}>
                    {item.item.name}
                    {item.item.isVerified ? ' ✓' : ''}
                  </Text>
                  <Text style={styles.handle}>@{item.item.username}</Text>
                  <Text numberOfLines={1} style={styles.resultMeta}>
                    {item.item.bio || 'Connectly member'}
                  </Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            ) : (
              <View style={styles.postCard}>
                <View style={styles.postAuthor}>
                  <Avatar
                    initials={item.item.authorId.name
                      .split(' ')
                      .map(part => part[0])
                      .join('')
                      .slice(0, 2)}
                    avatarUrl={item.item.authorId.avatarUrl}
                    size={32}
                  />
                  <View>
                    <Text style={styles.resultName}>
                      {item.item.authorId.name}
                    </Text>
                    <Text style={styles.handle}>
                      @{item.item.authorId.username}
                    </Text>
                  </View>
                </View>
                <Text style={styles.postBody}>
                  {item.item.body || 'Shared media'}
                </Text>
              </View>
            )
          }
          ListEmptyComponent={
            <Text style={styles.empty}>No results found.</Text>
          }
        />
      ) : (
        <View style={styles.discovery}>
          <View style={styles.discoveryHeader}>
            <View>
              <Text style={styles.sectionTitle}>Trending now</Text>
              <Text style={styles.sectionMeta}>
                What people are exploring today
              </Text>
            </View>
            <Text style={styles.spark}>✦</Text>
          </View>
          {trending.map(item => (
            <Pressable
              key={item.tag}
              style={styles.trend}
              onPress={() => {
                setQuery(item.tag);
                void load(item.tag, 'hashtags');
              }}
            >
              <View>
                <Text style={styles.trendTag}>{item.tag}</Text>
                <Text style={styles.trendMeta}>{item.posts} posts</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
          <Text style={[styles.sectionTitle, styles.recentTitle]}>
            Recent searches
          </Text>
          {recent.map(item => (
            <Pressable
              key={item.query}
              style={styles.recent}
              onPress={() => {
                setQuery(item.query);
                void load(item.query);
              }}
            >
              <Text style={styles.recentIcon}>◷</Text>
              <Text style={styles.recentText}>{item.query}</Text>
            </Pressable>
          ))}
          <Pressable
            style={styles.clearHistory}
            onPress={async () => {
              await apiRequest(
                '/search/recent',
                { method: 'DELETE' },
                accessToken,
              );
              setRecent([]);
            }}
          >
            <Text style={styles.clearHistoryText}>Clear search history</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.canvas, padding: spacing.md },
  header: { marginTop: spacing.sm, marginBottom: spacing.lg },
  backButton: { marginBottom: spacing.sm },
  backText: { color: colors.blue, fontSize: 14, fontWeight: '800' },
  kicker: {
    fontSize: 10,
    letterSpacing: 2,
    color: colors.blue,
    fontWeight: '900',
  },
  title: { fontSize: 30, fontWeight: '900', color: colors.ink, marginTop: 4 },
  subtitle: { fontSize: 13, color: colors.muted, marginTop: 5 },
  searchBox: {
    height: 52,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    ...shadow,
  },
  searchIcon: { fontSize: 24, color: colors.blue },
  input: {
    flex: 1,
    color: colors.ink,
    fontSize: 15,
    paddingHorizontal: spacing.sm,
  },
  clear: { fontSize: 22, color: colors.muted },
  filterList: { height: 58, flexGrow: 0 },
  filters: { alignItems: 'center', paddingVertical: spacing.sm },
  filter: {
    height: 40,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  filterActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  filterText: { fontSize: 12, fontWeight: '800', color: colors.muted },
  filterTextActive: { color: '#fff' },
  loader: { marginTop: spacing.xl },
  error: { color: colors.danger, fontSize: 12 },
  results: { paddingBottom: 110 },
  userCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultCopy: { flex: 1, marginLeft: spacing.sm },
  resultName: { fontSize: 14, fontWeight: '900', color: colors.ink },
  handle: { fontSize: 11, color: colors.blue, marginTop: 2 },
  resultMeta: { fontSize: 11, color: colors.muted, marginTop: 4 },
  chevron: { fontSize: 28, color: colors.muted },
  postCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  postAuthor: { flexDirection: 'row', alignItems: 'center' },
  postBody: {
    fontSize: 14,
    color: colors.ink,
    lineHeight: 21,
    marginTop: spacing.sm,
  },
  empty: { textAlign: 'center', color: colors.muted, paddingTop: spacing.xl },
  discovery: { paddingBottom: 110 },
  discoveryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  sectionMeta: { fontSize: 12, color: colors.muted },
  spark: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.blueSoft,
    color: colors.blue,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 20,
  },
  trend: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trendTag: { fontSize: 15, fontWeight: '900', color: colors.ink },
  trendMeta: { fontSize: 11, color: colors.muted, marginTop: 3 },
  recentTitle: { marginTop: spacing.xl },
  recent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  recentIcon: { fontSize: 18, color: colors.muted },
  recentText: { color: colors.ink, fontSize: 13, marginLeft: spacing.sm },
  clearHistory: { paddingVertical: spacing.md },
  clearHistoryText: { color: colors.blue, fontWeight: '900', fontSize: 12 },
});
