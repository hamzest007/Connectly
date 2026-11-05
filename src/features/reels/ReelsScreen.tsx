import React from 'react';
import {
  ActivityIndicator,
  AppState,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  viewerSaved?: boolean;
};
type ReelComment = {
  _id: string;
  body: string;
  createdAt: string;
  authorId: { name: string; username: string; avatarUrl?: string };
  parentId?: string;
};
export function ReelsScreen({
  accessToken,
  onCreate,
}: {
  accessToken: string;
  onCreate: () => void;
}) {
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // Keep the reel content above the persistent app navigation so captions and
  // creator information are never hidden behind the tab bar.
  const reelHeight = Math.max(420, windowHeight - insets.top - insets.bottom - 88);
  const compact = windowWidth < 360;
  const [items, setItems] = React.useState<Reel[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [feed, setFeed] = React.useState<'reels' | 'following'>('reels');
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
  const [saved, setSaved] = React.useState<Record<string, boolean>>({});
  const [replyTarget, setReplyTarget] = React.useState<ReelComment | null>(null);
  const [moreTarget, setMoreTarget] = React.useState<Reel | null>(null);
  const [appActive, setAppActive] = React.useState(true);
  const cursorRef = React.useRef<string | null>(null);
  const requestRef = React.useRef(false);
  const interactionRef = React.useRef<Record<string, boolean>>({});
  const load = React.useCallback(async (reset = false) => {
    if (requestRef.current) return;
    requestRef.current = true;
    if (reset) setRefreshing(true); else setLoading(true);
    setError('');
    try {
      const before = reset ? '' : cursorRef.current ? `&before=${encodeURIComponent(cursorRef.current)}` : '';
      const result = await apiRequest<{ items: Reel[]; nextCursor: string | null }>(
        `/posts?feed=${feed}&limit=8${before}`,
        {},
        accessToken,
      );
      const reels = result.items.filter(
        item => item.media?.[0]?.type === 'video',
      );
      cursorRef.current = result.nextCursor;
      setItems(current => reset ? reels : [...current, ...reels.filter(item => !current.some(existing => existing._id === item._id))]);
      if (reset) setActive(reels[0]?._id ?? null);
      setLiked(current => ({ ...current, ...Object.fromEntries(reels.map(item => [item._id, Boolean(item.viewerReaction)])) }));
      setSaved(current => ({ ...current, ...Object.fromEntries(reels.map(item => [item._id, Boolean(item.viewerSaved)]) ) }));
      setLikeCounts(current => ({ ...current, ...Object.fromEntries(reels.map(item => [item._id, item.reactionCount])) }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load reels.');
    } finally {
      setLoading(false); setRefreshing(false); requestRef.current = false;
    }
  }, [accessToken, feed]);
  React.useEffect(() => {
    cursorRef.current = null;
    setItems([]);
    void load(true);
    void loadReelHistory().then(setHistory);
  }, [load]);
  React.useEffect(() => {
    const subscription = AppState.addEventListener('change', state => setAppActive(state === 'active'));
    return () => subscription.remove();
  }, []);
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
    if (interactionRef.current[`save:${item._id}`]) return;
    interactionRef.current[`save:${item._id}`] = true;
    const wasSaved = Boolean(saved[item._id]);
    setSaved(current => ({ ...current, [item._id]: !wasSaved }));
    try {
      await apiRequest(
        `/posts/${item._id}/save`,
        { method: wasSaved ? 'DELETE' : 'POST' },
        accessToken,
      );
    } catch { setSaved(current => ({ ...current, [item._id]: wasSaved })); }
    finally { interactionRef.current[`save:${item._id}`] = false; }
  };
  const shareReel = async (item: Reel) => {
    try {
      const result = await apiRequest<{shareCount: number}>(
        `/posts/${item._id}/share`,
        { method: 'POST' },
        accessToken,
      );
      setItems(current => current.map(value => value._id === item._id ? {...value, shareCount: result.shareCount} : value));
      await Share.share({ message: `Watch this reel on Connectly: connectly://post/${item._id}` });
    } catch (e) { if (e instanceof Error && e.message !== 'User did not share') Alert.alert('Unable to share', e.message); }
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
  const blockCreator = async (item: Reel) => {
    try {
      await apiRequest(`/blocks/${item.authorId._id}`, { method: 'POST' }, accessToken);
      setItems(current => current.filter(reel => reel.authorId._id !== item.authorId._id));
      Alert.alert('Creator blocked', 'You will no longer see this creator in your feeds.');
    } catch (e) { Alert.alert('Unable to block creator', e instanceof Error ? e.message : 'Please try again later.'); }
  };
  const toggleLike = async (item: Reel) => {
    if (interactionRef.current[`like:${item._id}`]) return;
    interactionRef.current[`like:${item._id}`] = true;
    const isLiked = Boolean(liked[item._id]);
    const previousCount = likeCounts[item._id] ?? item.reactionCount;
    setLiked(current => ({ ...current, [item._id]: !isLiked }));
    setLikeCounts(current => ({ ...current, [item._id]: Math.max(0, previousCount + (isLiked ? -1 : 1)) }));
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
      setLikeCounts(current => ({ ...current, [item._id]: result.count }));
    } catch { setLiked(current => ({ ...current, [item._id]: isLiked })); setLikeCounts(current => ({ ...current, [item._id]: previousCount })); }
    finally { interactionRef.current[`like:${item._id}`] = false; }
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
        { method: 'POST', body: JSON.stringify({ body: commentText.trim(), parentId: replyTarget?._id }) },
        accessToken,
      );
      setCommentText('');
      setReplyTarget(null);
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
  if (loading && !items.length)
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.blue} />
        <Text style={styles.muted}>Loading reels…</Text>
      </View>
    );
  return (
    <View style={[styles.page, !items.length && styles.emptyPage]}>
      <View style={[styles.header, { paddingTop: spacing.sm }, !items.length && styles.emptyHeader]}>
        <View style={styles.headerTop}><Text style={[styles.title, !items.length && styles.emptyHeaderTitle]}>Reels</Text><Pressable style={styles.create} onPress={onCreate} accessibilityLabel="Create reel"><Text style={styles.createText}>＋</Text></Pressable></View>
        <View style={styles.feedTabs}>
          <Pressable onPress={() => setFeed('reels')} style={[styles.feedTab, compact && styles.feedTabCompact, feed === 'reels' && styles.feedTabActive]}><Text style={[styles.feedTabText, !items.length && styles.emptyTabText, feed === 'reels' && styles.feedTabTextActive]}>For You</Text></Pressable>
          <Pressable onPress={() => setFeed('following')} style={[styles.feedTab, compact && styles.feedTabCompact, feed === 'following' && styles.feedTabActive]}><Text style={[styles.feedTabText, !items.length && styles.emptyTabText, feed === 'following' && styles.feedTabTextActive]}>Following</Text></Pressable>
        </View>
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
          onRefresh={() => void load(true)}
          onEndReached={() => { if (cursorRef.current) void load(); }}
          onEndReachedThreshold={0.7}
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
            <View style={[styles.empty, styles.emptyState]}>
              <Text style={styles.emptyIcon}>▶</Text>
              <Text style={styles.emptyTitle}>No reels yet</Text>
              <Text style={styles.emptyText}>Be the first to share a moment with your community.</Text>
              <Pressable style={styles.emptyCreate} onPress={onCreate}><Text style={styles.emptyCreateText}>Create your first reel</Text></Pressable>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={[styles.videoWrap, { height: reelHeight }]}>
                <Video
                  source={{ uri: item.media[0].url }}
                  style={styles.video}
                  resizeMode="cover"
                  paused={active !== item._id || !appActive}
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
                    <Text style={styles.reelActionText}>{saved[item._id] ? 'Saved' : 'Save'}</Text>
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
                  <Pressable
                    style={styles.reelAction}
                    onPress={() => setMoreTarget(item)}
                  >
                    <Text style={styles.reelActionIcon}>•••</Text>
                    <Text style={styles.reelActionText}>More</Text>
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
                  <Text style={styles.audio}>♫ Original audio · Connectly</Text>
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
                      <Pressable onPress={() => setReplyTarget(comment)}><Text style={styles.replyButton}>Reply</Text></Pressable>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
            <View style={styles.composer}>
              {replyTarget ? <View style={styles.replying}><Text style={styles.replyingText}>Replying to @{replyTarget.authorId.username}</Text><Pressable onPress={() => setReplyTarget(null)}><Text style={styles.close}>×</Text></Pressable></View> : null}
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
      <Modal visible={Boolean(moreTarget)} transparent animationType="slide" onRequestClose={() => setMoreTarget(null)}>
        <View style={styles.modalBackdrop}><Pressable style={styles.dismissArea} onPress={() => setMoreTarget(null)} /><View style={styles.optionsSheet}><View style={styles.sheetHandle} /><Text style={styles.sheetTitle}>Reel options</Text>{moreTarget ? <><Pressable style={styles.option} onPress={() => { void feedback(moreTarget, 'not-interested'); setMoreTarget(null); }}><Text style={styles.optionText}>Not interested</Text></Pressable><Pressable style={styles.option} onPress={() => { void reportReel(moreTarget); setMoreTarget(null); }}><Text style={styles.optionText}>Report reel</Text></Pressable><Pressable style={styles.option} onPress={() => { void Share.share({message: `Watch this reel on Connectly: connectly://post/${moreTarget._id}`}); setMoreTarget(null); }}><Text style={styles.optionText}>Share link</Text></Pressable><Pressable style={styles.option} onPress={() => { void blockCreator(moreTarget); setMoreTarget(null); }}><Text style={[styles.optionText, styles.danger]}>Block creator</Text></Pressable></> : null}<Pressable style={styles.cancelOption} onPress={() => setMoreTarget(null)}><Text style={styles.cancelOptionText}>Cancel</Text></Pressable></View></View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#05070B' },
  emptyPage: { backgroundColor: colors.canvas },
  header: {
    flexDirection: 'column',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 5,
    paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.md,
    backgroundColor: 'rgba(5,7,11,.62)',
  },
  emptyHeader: { backgroundColor: colors.canvas, position: 'relative' },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#fff', letterSpacing: -0.5,
  },
  emptyHeaderTitle: { color: colors.ink },
  feedTabs: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, alignSelf: 'flex-start' },
  feedTab: { minHeight: 42, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  feedTabActive: { backgroundColor: colors.blue },
  feedTabText: { color: 'rgba(255,255,255,.72)', fontSize: 12, fontWeight: '800' },
  emptyTabText: { color: colors.muted },
  feedTabCompact: { paddingHorizontal: spacing.sm },
  feedTabTextActive: { color: '#fff' },
  create: {
    backgroundColor: colors.blue,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...shadow,
  },
  createText: { color: '#fff', fontWeight: '900', fontSize: 22 },
  list: { paddingBottom: 0 },
  card: {
    marginBottom: 0,
    borderRadius: 0,
    overflow: 'hidden',
    backgroundColor: '#111827',
    ...shadow,
  },
  videoWrap: { position: 'relative', backgroundColor: '#05070B' },
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
  audio: { color: 'rgba(255,255,255,.78)', fontSize: 11, marginTop: spacing.xs, fontWeight: '700' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.canvas,
  },
  muted: { color: colors.muted, fontSize: 13, marginTop: spacing.sm },
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 100 },
  emptyState: { alignSelf: 'center', width: '92%', maxWidth: 440, minHeight: 330, marginTop: spacing.lg, padding: spacing.xl, paddingTop: spacing.xxl, borderRadius: 28, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, ...shadow },
  emptyIcon: { fontSize: 35, color: colors.blue },
  emptyTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: colors.ink,
    marginTop: spacing.sm,
  },
  retry: { color: colors.blue, fontWeight: '900', marginTop: spacing.md },
  emptyText: { color: colors.muted, fontSize: 14, lineHeight: 21, textAlign: 'center', maxWidth: 260, marginTop: spacing.sm },
  emptyCreate: { marginTop: spacing.lg, backgroundColor: colors.blue, borderRadius: radius.pill, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  emptyCreateText: { color: '#fff', fontSize: 13, fontWeight: '900' },
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
  replyButton: { color: colors.blue, fontSize: 11, fontWeight: '800', marginTop: 6 },
  replying: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flex: 1, backgroundColor: colors.blueSoft, paddingHorizontal: spacing.sm, borderRadius: radius.sm, minHeight: 32 },
  replyingText: { color: colors.blue, fontSize: 10, fontWeight: '800' },
  optionsSheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: spacing.md, paddingBottom: spacing.xl },
  option: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: '#edf0f6' },
  optionText: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  danger: { color: colors.danger },
  cancelOption: { alignItems: 'center', paddingVertical: spacing.md, marginTop: spacing.sm, backgroundColor: '#f4f6fb', borderRadius: radius.md },
  cancelOptionText: { color: colors.ink, fontWeight: '900' },
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
