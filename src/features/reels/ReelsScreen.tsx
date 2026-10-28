import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Video from 'react-native-video';
import { Avatar } from '../../components/common/Avatar';
import { apiRequest } from '../../services/api/client';
import { colors, radius, shadow, spacing } from '../../theme/tokens';
import {
  loadReelHistory,
  saveReelHistory,
} from '../../services/storage/session';

type Reel = {
  _id: string;
  body: string;
  createdAt: string;
  authorId: { _id: string; name: string; username: string; avatarUrl?: string };
  media: { url: string; type: 'video'; thumbnailUrl?: string }[];
  reactionCount: number;
  commentCount: number;
  shareCount: number;
  viewerReaction?: string | null;
};
type ReelComment = {
  _id: string;
  body: string;
  createdAt: string;
  authorId: { name: string; username: string; avatarUrl?: string };
};
const reelHeight = Dimensions.get('window').height;

export function ReelsScreen({
  accessToken,
  onCreate,
}: {
  accessToken: string;
  onCreate: () => void;
}) {
  const [items, setItems] = React.useState<Reel[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [active, setActive] = React.useState<string | null>(null);
  const [muted, setMuted] = React.useState(false);
  const [following, setFollowing] = React.useState<Record<string, boolean>>({});
  const [history, setHistory] = React.useState<string[]>([]);
  const [liked, setLiked] = React.useState<Record<string, boolean>>({});
  const [likeCounts, setLikeCounts] = React.useState<Record<string, number>>(
    {},
  );
  const [commentTarget, setCommentTarget] = React.useState<Reel | null>(null);
  const [comments, setComments] = React.useState<ReelComment[]>([]);
  const [commentText, setCommentText] = React.useState('');
  const [commentBusy, setCommentBusy] = React.useState(false);
  const load = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await apiRequest<{ items: Reel[] }>(
        '/posts?feed=reels&limit=30',
        {},
        accessToken,
      );
      const reels = result.items.filter(
        item => item.media?.[0]?.type === 'video',
      );
      setItems(reels);
      setActive(reels[0]?._id ?? null);
      setLiked(
        Object.fromEntries(
          reels.map(item => [item._id, Boolean(item.viewerReaction)]),
        ),
      );
      setLikeCounts(
        Object.fromEntries(reels.map(item => [item._id, item.reactionCount])),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load reels.');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);
  React.useEffect(() => {
    void load();
    void loadReelHistory().then(setHistory);
  }, [load]);
  const recordView = async (id: string) => {
    const next = [id, ...history.filter(item => item !== id)];
    setHistory(next);
    await saveReelHistory(next);
  };
  const followCreator = async (item: Reel) => {
    const isFollowing = Boolean(following[item.authorId.username]);
    try {
      await apiRequest(
        `/follows/${item.authorId._id}`,
        { method: isFollowing ? 'DELETE' : 'POST' },
        accessToken,
      );
      setFollowing(current => ({
        ...current,
        [item.authorId.username]: !isFollowing,
      }));
    } catch {}
  };
  const saveReel = async (item: Reel) => {
    try {
      await apiRequest(
        `/posts/${item._id}/save`,
        { method: 'POST' },
        accessToken,
      );
    } catch {}
  };
  const shareReel = async (item: Reel) => {
    try {
      await apiRequest(
        `/posts/${item._id}/share`,
        { method: 'POST' },
        accessToken,
      );
    } catch {}
  };
  const feedback = async (
    item: Reel,
    type: 'not-interested' | 'hide-creator',
  ) => {
    try {
      await apiRequest(
        `/posts/${item._id}/recommendation-feedback`,
        { method: 'POST', body: JSON.stringify({ type }) },
        accessToken,
      );
      setItems(current => current.filter(reel => reel._id !== item._id));
    } catch {}
  };
  const reportReel = async (item: Reel) => {
    try {
      await apiRequest('/reports', {method: 'POST', body: JSON.stringify({targetType: 'reel', targetId: item._id, reason: 'Inappropriate or abusive reel'})}, accessToken);
      Alert.alert('Report submitted', 'Thanks for helping keep Connectly safe.');
    } catch (e) {
      Alert.alert('Unable to report', e instanceof Error ? e.message : 'Please try again later.');
    }
  };
  const toggleLike = async (item: Reel) => {
    const isLiked = Boolean(liked[item._id]);
    try {
      const result = isLiked
        ? await apiRequest<{ count: number }>(
            `/posts/${item._id}/reaction`,
            { method: 'DELETE' },
            accessToken,
          )
        : await apiRequest<{ count: number }>(
            `/posts/${item._id}/reaction`,
            { method: 'PUT', body: JSON.stringify({ type: 'Like' }) },
            accessToken,
          );
      setLiked(current => ({ ...current, [item._id]: !isLiked }));
      setLikeCounts(current => ({ ...current, [item._id]: result.count }));
    } catch {}
  };
  const openComments = async (item: Reel) => {
    setCommentTarget(item);
    setCommentText('');
    setComments([]);
    try {
      setComments(
        await apiRequest<ReelComment[]>(
          `/posts/${item._id}/comments`,
          {},
          accessToken,
        ),
      );
    } catch {
      setComments([]);
    }
  };
  const addComment = async () => {
    if (!commentTarget || !commentText.trim() || commentBusy) return;
    setCommentBusy(true);
    try {
      await apiRequest(
        `/posts/${commentTarget._id}/comments`,
        { method: 'POST', body: JSON.stringify({ body: commentText.trim() }) },
        accessToken,
      );
      setCommentText('');
      setComments(
        await apiRequest<ReelComment[]>(
          `/posts/${commentTarget._id}/comments`,
          {},
          accessToken,
        ),
      );
      setItems(current =>
        current.map(item =>
          item._id === commentTarget._id
            ? { ...item, commentCount: item.commentCount + 1 }
            : item,
        ),
      );
      setCommentTarget(current =>
        current
          ? { ...current, commentCount: current.commentCount + 1 }
          : current,
      );
    } finally {
      setCommentBusy(false);
    }
  };
  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.blue} />
        <Text style={styles.muted}>Loading reels…</Text>
      </View>
    );
  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>DISCOVER</Text>
          <Text style={styles.title}>Reels</Text>
          <Text style={styles.subtitle}>
            Short videos from the Connectly community
          </Text>
        </View>
        <Pressable style={styles.create} onPress={onCreate}>
          <Text style={styles.createText}>＋ Reel</Text>
        </Pressable>
      </View>
      {error ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Couldn’t load reels</Text>
          <Text style={styles.muted}>{error}</Text>
          <Pressable onPress={() => void load()}>
            <Text style={styles.retry}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.list}
          refreshing={loading}
          onRefresh={() => void load()}
          pagingEnabled
          snapToAlignment="start"
          decelerationRate="fast"
          onViewableItemsChanged={({ viewableItems }) => {
            const item = viewableItems[0]?.item as Reel | undefined;
            if (item) {
              setActive(item._id);
              void recordView(item._id);
            }
          }}
          viewabilityConfig={{ itemVisiblePercentThreshold: 70 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>▶</Text>
              <Text style={styles.emptyTitle}>No reels yet</Text>
              <Text style={styles.muted}>
                Publish the first short video from Create.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.videoWrap}>
                <Video
                  source={{ uri: item.media[0].url }}
                  style={styles.video}
                  resizeMode="cover"
                  paused={active !== item._id}
                  repeat
                  muted={muted}
                  controls={false}
                  poster={item.media[0].thumbnailUrl}
                />
                <Pressable
                  style={styles.videoTap}
                  onPress={() =>
                    setActive(value => (value === item._id ? null : item._id))
                  }
                >
                  <View style={styles.play}>
                    <Text style={styles.playText}>
                      {active === item._id ? 'Ⅱ' : '▶'}
                    </Text>
                  </View>
                </Pressable>
                <View style={styles.actionRail}>
                  <Pressable
                    style={styles.reelAction}
                    onPress={() => setMuted(value => !value)}
                  >
                    <Text style={styles.reelActionIcon}>
                      {muted ? '🔇' : '🔊'}
                    </Text>
                    <Text style={styles.reelActionText}>
                      {muted ? 'Muted' : 'Sound'}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={styles.reelAction}
                    onPress={() => void toggleLike(item)}
                  >
                    <Text
                      style={[
                        styles.reelActionIcon,
                        liked[item._id] && styles.liked,
                      ]}
                    >
                      ♥
                    </Text>
                    <Text style={styles.reelActionText}>
                      {likeCounts[item._id] ?? item.reactionCount}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={styles.reelAction}
                    onPress={() => void openComments(item)}
                  >
                    <Text style={styles.reelActionIcon}>◌</Text>
                    <Text style={styles.reelActionText}>
                      {item.commentCount}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={styles.reelAction}
                    onPress={() => void shareReel(item)}
                  >
                    <Text style={styles.reelActionIcon}>↗</Text>
                    <Text style={styles.reelActionText}>Share</Text>
                  </Pressable>
                  <Pressable
                    style={styles.reelAction}
                    onPress={() => void saveReel(item)}
                  >
                    <Text style={styles.reelActionIcon}>▱</Text>
                    <Text style={styles.reelActionText}>Save</Text>
                  </Pressable>
                  <Pressable
                    style={styles.reelAction}
                    onPress={() => void followCreator(item)}
                  >
                    <Text style={styles.reelActionIcon}>＋</Text>
                    <Text style={styles.reelActionText}>
                      {following[item.authorId.username]
                        ? 'Following'
                        : 'Follow'}
                    </Text>
                  </Pressable>
                  <Pressable style={styles.reelAction} onPress={onCreate}>
                    <Text style={styles.reelActionIcon}>↻</Text>
                    <Text style={styles.reelActionText}>Remix</Text>
                  </Pressable>
                  <Pressable
                    style={styles.reelAction}
                    onPress={() => void feedback(item, 'not-interested')}
                  >
                    <Text style={styles.reelActionIcon}>−</Text>
                    <Text style={styles.reelActionText}>Not for me</Text>
                  </Pressable>
                  <Pressable
                    style={styles.reelAction}
                    onPress={() => void reportReel(item)}
                  >
                    <Text style={styles.reelActionIcon}>⚑</Text>
                    <Text style={styles.reelActionText}>Report</Text>
                  </Pressable>
                </View>
                <View style={styles.overlay}>
                  <View style={styles.author}>
                    <Avatar
                      initials={item.authorId.name
                        .split(' ')
                        .map(part => part[0])
                        .join('')
                        .slice(0, 2)}
                      avatarUrl={item.authorId.avatarUrl}
                      size={38}
                    />
                    <View>
                      <Text style={styles.authorName}>
                        {item.authorId.name}
                      </Text>
                      <Text style={styles.handle}>
                        @{item.authorId.username}
                      </Text>
                    </View>
                  </View>
                  {item.body ? (
                    <Text style={styles.caption}>{item.body}</Text>
                  ) : null}
                  <Text style={styles.stats}>
                    {likeCounts[item._id] ?? item.reactionCount} likes ·{' '}
                    {item.commentCount} comments · {item.shareCount} shares
                  </Text>
                  {history.includes(item._id) ? (
                    <Text style={styles.viewed}>Viewed</Text>
                  ) : null}
                </View>
              </View>
            </View>
          )}
        />
      )}
      <Modal
        visible={Boolean(commentTarget)}
        transparent
        animationType="slide"
        onRequestClose={() => setCommentTarget(null)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={styles.dismissArea}
            onPress={() => setCommentTarget(null)}
          />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Comments</Text>
              <Pressable onPress={() => setCommentTarget(null)}>
                <Text style={styles.close}>×</Text>
              </Pressable>
            </View>
            <ScrollView
              style={styles.commentList}
              contentContainerStyle={styles.commentContent}
              keyboardShouldPersistTaps="handled"
            >
              {comments.length === 0 ? (
                <Text style={styles.muted}>
                  Be the first to comment on this reel.
                </Text>
              ) : (
                comments.map(comment => (
                  <View style={styles.commentRow} key={comment._id}>
                    <Avatar
                      initials={comment.authorId.name
                        .split(' ')
                        .map(part => part[0])
                        .join('')
                        .slice(0, 2)}
                      avatarUrl={comment.authorId.avatarUrl}
                      size={36}
                    />
                    <View style={styles.commentBubble}>
                      <Text style={styles.commentAuthor}>
                        {comment.authorId.name}{' '}
                        <Text style={styles.commentHandle}>
                          @{comment.authorId.username}
                        </Text>
                      </Text>
                      <Text style={styles.commentBody}>{comment.body}</Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
            <View style={styles.composer}>
              <TextInput
                value={commentText}
                onChangeText={setCommentText}
                placeholder="Share your thoughts…"
                placeholderTextColor={colors.muted}
                style={styles.input}
                multiline
                maxLength={500}
              />
              <Pressable
                disabled={!commentText.trim() || commentBusy}
                onPress={() => void addComment()}
              >
                <Text
                  style={[
                    styles.send,
                    !commentText.trim() && styles.sendDisabled,
                  ]}
                >
                  {commentBusy ? '…' : 'Send'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.canvas, padding: spacing.md },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 1.4,
    color: colors.blue,
    fontWeight: '900',
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    color: colors.ink,
    letterSpacing: -1.1,
  },
  subtitle: { fontSize: 12, color: colors.muted, marginTop: 3 },
  create: {
    backgroundColor: colors.ink,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...shadow,
  },
  createText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  list: { paddingBottom: 110 },
  card: {
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: '#111827',
    ...shadow,
  },
  videoWrap: { height: reelHeight, position: 'relative' },
  video: { width: '100%', height: '100%' },
  videoTap: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  play: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  playText: { color: '#fff', fontSize: 22, fontWeight: '900' },
  actionRail: {
    position: 'absolute',
    right: spacing.md,
    bottom: 90,
    alignItems: 'center',
    gap: spacing.md,
  },
  reelAction: { alignItems: 'center' },
  reelActionIcon: {
    color: '#fff',
    fontSize: 27,
    fontWeight: '900',
    textShadowColor: '#000',
    textShadowRadius: 5,
  },
  liked: { color: '#ff3b6b' },
  reelActionText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
    marginTop: 2,
    textShadowColor: '#000',
    textShadowRadius: 4,
  },
  overlay: {
    position: 'absolute',
    left: spacing.md,
    right: 70,
    bottom: spacing.md,
  },
  author: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  authorName: { color: '#fff', fontWeight: '900', fontSize: 14 },
  handle: { color: 'rgba(255,255,255,.75)', fontSize: 11, marginTop: 2 },
  caption: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600',
    marginTop: spacing.md,
  },
  stats: {
    color: 'rgba(255,255,255,.85)',
    fontSize: 11,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  viewed: {
    color: 'rgba(255,255,255,.75)',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 4,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.canvas,
  },
  muted: { color: colors.muted, fontSize: 13, marginTop: spacing.sm },
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 100 },
  emptyIcon: { fontSize: 35, color: colors.blue },
  emptyTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: colors.ink,
    marginTop: spacing.sm,
  },
  retry: { color: colors.blue, fontWeight: '900', marginTop: spacing.md },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15,23,42,.45)',
  },
  dismissArea: { flex: 1 },
  sheet: {
    maxHeight: '78%',
    minHeight: 350,
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#d5dbea',
    marginBottom: spacing.sm,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#edf0f6',
  },
  sheetTitle: { fontSize: 21, fontWeight: '900', color: colors.ink },
  close: { fontSize: 30, color: colors.muted, lineHeight: 30 },
  commentList: { flex: 1 },
  commentContent: { paddingVertical: spacing.md, gap: spacing.md },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  commentBubble: {
    flex: 1,
    backgroundColor: '#f4f6fb',
    borderRadius: 18,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  commentAuthor: { fontSize: 13, fontWeight: '900', color: colors.ink },
  commentHandle: { fontSize: 11, fontWeight: '600', color: colors.muted },
  commentBody: {
    fontSize: 14,
    color: colors.ink,
    lineHeight: 20,
    marginTop: 3,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#edf0f6',
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 90,
    borderRadius: 22,
    backgroundColor: '#f4f6fb',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    color: colors.ink,
    fontSize: 14,
  },
  send: {
    color: colors.blue,
    fontSize: 15,
    fontWeight: '900',
    paddingBottom: 12,
  },
  sendDisabled: { opacity: 0.45 },
});
