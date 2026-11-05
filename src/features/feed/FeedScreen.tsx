// @ts-nocheck
import React from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Video from 'react-native-video';
import { Avatar } from '../../components/common/Avatar';
import { PostCard } from '../../components/posts/PostCard';
import { apiRequest } from '../../services/api/client';
import {
  colors,
  radius,
  shadow,
  shadowLarge,
  spacing,
} from '../../theme/tokens';
import { Post } from '../../types/social';

type FeedMode =
  | 'for-you'
  | 'following'
  | 'latest'
  | 'groups'
  | 'saved';
type ApiPost = {
  _id: string;
  body: string;
  audience?: Post['audience']; location?: string; hashtags?: string[]; accessibilityText?: string;
  createdAt: string;
  reactionCount: number;
  commentCount: number;
  shareCount: number;
  pinned?: boolean;
  viewerReaction?: Post['viewerReaction'] | null;
  viewerSaved?: boolean;
  recommendationReason?: string;
  contentWarning?: string;
  poll?: { question?: string; options?: { _id: string; label: string; votes?: number }[]; endsAt?: string };
  interactive?: Post['interactive'];
  groupId?: { _id: string; name: string; visibility?: string; coverUrl?: string; memberCount?: number } | null;
  media?: Post['media'];
  repostOf?: { _id: string; body: string; createdAt: string; media?: Post['media']; authorId: { _id: string; name: string; username: string; avatarUrl?: string } | null } | null;
  authorId: {
    _id: string;
    name: string;
    username: string;
    avatarUrl?: string;
  } | null;
};
type SavedPost = { postId: ApiPost | null };
type Story = {
  _id: string;
  authorId: { name: string; username: string; avatarUrl?: string } | null;
  body?: string;
  media: { url: string; type: 'image' | 'video' }[];
};
function FeedSkeleton() {
  return <View accessibilityLabel="Loading feed" style={styles.skeletonWrap}>
    {[0, 1, 2].map(item => <View key={item} style={styles.skeletonCard}><View style={styles.skeletonHeader}><View style={styles.skeletonAvatar} /><View style={styles.skeletonLines}><View style={styles.skeletonLineShort} /><View style={styles.skeletonLineLong} /></View></View><View style={styles.skeletonBody} /></View>)}
  </View>;
}
const modes: { key: FeedMode; label: string }[] = [
  { key: 'for-you', label: 'For you' },
  { key: 'following', label: 'Following' },
  { key: 'latest', label: 'Latest' },
  { key: 'groups', label: 'Groups' },
  { key: 'saved', label: 'Saved' },
];

export function FeedScreen({
  onCreatePost,
  onOpenSearch,
  onOpenMessages,
  announcement,
  maintenanceMode,
  accessToken,
  refreshKey,
  focusPostId,
  focusComments = false,
  onFocusHandled,
  user,
  onOpenProfile,
  onOpenGroup,
  initialMode = 'for-you',
}: {
  onCreatePost: () => void;
  onOpenSearch?: () => void;
  onOpenMessages?: () => void;
  announcement?: string;
  maintenanceMode?: boolean;
  accessToken: string;
  refreshKey: number;
  focusPostId?: string;
  focusComments?: boolean;
  onFocusHandled?: () => void;
  user: { id: string; name: string; avatarUrl?: string };
  onOpenProfile?: (target: {
    id?: string;
    name: string;
    username: string;
  }) => void;
  onOpenGroup?: (groupId: string) => void;
  initialMode?: FeedMode;
}) {
  const [posts, setPosts] = React.useState<Post[]>([]);
  const [stories, setStories] = React.useState<Story[]>([]);
  const [mode, setMode] = React.useState<FeedMode>(initialMode);
  const [cursor, setCursor] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [error, setError] = React.useState('');
  const [selectedStory, setSelectedStory] = React.useState<Story | null>(null);
  const [selectedStoryIndex, setSelectedStoryIndex] = React.useState(0);
  const [videoPaused, setVideoPaused] = React.useState(false);
  const [recommendationPreferences, setRecommendationPreferences] = React.useState({chronological: false, showReasons: true});
  const storyProgress = React.useRef(new Animated.Value(0)).current;
  const suppressNextFeedLoad = React.useRef(false);
  const initials = user.name
    .split(' ')
    .map(part => part[0])
    .join('')
    .slice(0, 2);
  const mapPost = (item: ApiPost): Post => {
    const author = item.authorId ?? {
      _id: 'unknown',
      name: 'Connectly member',
      username: 'member',
      avatarUrl: undefined,
    };
    const repost = item.repostOf;
    const repostAuthor = repost?.authorId;
    return {
      id: item._id,
      body: item.body,
      createdAt: new Date(item.createdAt).toLocaleDateString(),
      reactions: item.reactionCount,
      comments: item.commentCount,
      shares: item.shareCount,
      pinned: item.pinned,
      recommendationReason: item.recommendationReason,
      contentWarning: item.contentWarning,
      audience: item.audience, location: item.location, hashtags: item.hashtags, accessibilityText: item.accessibilityText, interactive: item.interactive,
      poll: item.poll?.question && item.poll.options?.length ? { question: item.poll.question, options: item.poll.options.map(option => ({ _id: option._id, label: option.label, votes: option.votes ?? 0 })), endsAt: item.poll.endsAt } : undefined,
      group: item.groupId && typeof item.groupId === 'object' && item.groupId.name ? {id: item.groupId._id, name: item.groupId.name, visibility: item.groupId.visibility, coverUrl: item.groupId.coverUrl, memberCount: item.groupId.memberCount} : undefined,
      viewerReaction: item.viewerReaction ?? undefined,
      viewerSaved: item.viewerSaved,
      media: item.media,
      author: {
        id: author._id,
        name: author.name,
        username: author.username,
        avatarUrl: author.avatarUrl,
        initials: author.name
          .split(' ')
          .map(part => part[0])
          .join('')
          .slice(0, 2),
        accent: colors.blue,
      },
      repostOf: repost && repostAuthor ? {
        id: repost._id,
        body: repost.body,
        createdAt: new Date(repost.createdAt).toLocaleDateString(),
        media: repost.media,
        author: {id: repostAuthor._id, name: repostAuthor.name, username: repostAuthor.username, avatarUrl: repostAuthor.avatarUrl, initials: repostAuthor.name.split(' ').map(part => part[0]).join('').slice(0, 2), accent: colors.blue},
      } : undefined,
    };
  };
  const load = React.useCallback(
    async (reset = true) => {
      if (reset) setLoading(true);
      else setLoadingMore(true);
      setError('');
      try {
        if (reset)
          setStories(await apiRequest<Story[]>('/stories', {}, accessToken));
        if (mode === 'saved') {
          const result = await apiRequest<SavedPost[]>(
            '/posts/saved',
            {},
            accessToken,
          );
          setPosts(
            result
              .map(item => item.postId)
              .filter((item): item is ApiPost => Boolean(item))
              .map(mapPost),
          );
          setCursor(null);
          return;
        }
        if (reset && focusPostId) {
          const focused = await apiRequest<ApiPost>(`/posts/${focusPostId}`, {}, accessToken);
          setPosts([mapPost(focused)]);
          suppressNextFeedLoad.current = true;
          setCursor(null);
          onFocusHandled?.();
          return;
        }
        if (reset && !focusPostId && suppressNextFeedLoad.current) {
          suppressNextFeedLoad.current = false;
          return;
        }
        const query = `/posts?feed=${mode}&limit=12${recommendationPreferences.chronological ? '&chronological=true' : ''}${!reset && cursor ? `&before=${encodeURIComponent(cursor)}` : ''
          }`;
        const result = await apiRequest<{
          items: ApiPost[];
          nextCursor: string | null;
        }>(query, {}, accessToken);
        setPosts(current =>
          reset
            ? result.items.map(mapPost)
            : [...current, ...result.items.map(mapPost)],
        );
        setCursor(result.nextCursor);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unable to load your feed.');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [accessToken, mode, cursor, focusPostId, onFocusHandled, recommendationPreferences.chronological],
  );
  React.useEffect(() => {
    void apiRequest<{chronological:boolean; showReasons:boolean}>('/users/me/recommendation-preferences', {}, accessToken).then(setRecommendationPreferences).catch(() => undefined);
  }, [accessToken]);
  React.useEffect(() => {
    setCursor(null);
    void load(true);
  }, [mode, refreshKey]);
  React.useEffect(() => {
    if (selectedStory) {
      setVideoPaused(false);
    }
  }, [selectedStory]);
  const closeStory = React.useCallback(() => {
    setSelectedStory(null);
    setSelectedStoryIndex(0);
    setVideoPaused(true);
  }, []);
  const openStory = React.useCallback((index: number) => {
    const story = stories[index];
    if (!story) return;
    setSelectedStoryIndex(index);
    setSelectedStory(story);
    setVideoPaused(false);
    void apiRequest(`/stories/${story._id}/view`, {method: 'POST'}, accessToken).catch(() => undefined);
  }, [accessToken, stories]);
  React.useEffect(() => {
    if (!selectedStory) return;
    const timer = setTimeout(() => {
      const nextIndex = selectedStoryIndex + 1;
      if (nextIndex < stories.length) openStory(nextIndex);
      else closeStory();
    }, 3000);
    return () => clearTimeout(timer);
  }, [closeStory, openStory, selectedStory, selectedStoryIndex, stories.length]);
  React.useEffect(() => {
    if (!selectedStory) return;
    storyProgress.setValue(0);
    const animation = Animated.timing(storyProgress, {
      toValue: 1,
      duration: 3000,
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [selectedStory, selectedStoryIndex, storyProgress]);
  const selectMode = (next: FeedMode) => {
    if (next !== mode) {
      setPosts([]);
      setMode(next);
    }
  };
  const header = (
    <View>
      <View style={styles.appBar}>
        <Text style={styles.logo}>connectly</Text>
        <View style={styles.headerActions}>
          <Pressable onPress={onOpenSearch} style={styles.headerButton} accessibilityLabel="Search">
            <Text style={styles.headerButtonText}>⌕</Text>
          </Pressable>
          <Pressable onPress={onOpenMessages} style={styles.headerButton} accessibilityLabel="Messages">
            <Text style={styles.headerButtonText}>✉</Text>
          </Pressable>
        </View>
      </View>
      <Pressable style={styles.composer} onPress={onCreatePost}>
        <Avatar initials={initials} avatarUrl={user.avatarUrl} size={40} />
        <View style={styles.composerCopy}>
          <Text style={styles.composerTitle}>What are you thinking?</Text>
          <Text style={styles.composerHint}>
            Share a post, photo, video or reel
          </Text>
        </View>
        <View style={styles.composerAdd}>
          <Text style={styles.composerAddText}>＋</Text>
        </View>
      </Pressable>
      <View style={styles.storyCard}>
        <View style={styles.storyCardHeader}>
          <Text style={[styles.sectionTitle, styles.storyCardTitle]}>Stories</Text>
          <Text style={styles.storyHint}>{stories.length ? `${stories.length} active` : 'Your story'}</Text>
        </View>
        {stories.length ? (
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={stories}
            keyExtractor={item => item._id}
            contentContainerStyle={styles.storyList}
            renderItem={({ item, index }) => {
              const author = item.authorId ?? { name: 'Member', username: 'member', avatarUrl: undefined };
              return (
                <Pressable style={styles.storyItem} onPress={() => openStory(index)}>
                  <View style={styles.storyRing}>
                    <Avatar
                      initials={author.name.split(' ').map(part => part[0]).join('').slice(0, 2)}
                      avatarUrl={author.avatarUrl}
                      size={44}
                    />
                  </View>
                  <Text numberOfLines={1} style={styles.storyName}>{author.name}</Text>
                </Pressable>
              );
            }}
          />
        ) : (
          <Pressable onPress={onCreatePost} style={styles.emptyStory}>
            <View style={styles.addStory}><Text style={styles.addStoryText}>＋</Text></View>
            <View>
              <Text style={styles.emptyStoryTitle}>Add to your story</Text>
              <Text style={styles.emptyStoryText}>Share a photo or thought for 24 hours</Text>
            </View>
          </Pressable>
        )}
      </View>
      <View style={styles.feedHeading}>
        <View>
          <Text style={styles.sectionTitle}>
            {mode === 'saved' ? 'Your bookmarks' : 'Discover updates'}
          </Text>
          <Text style={styles.feedSubtitle}>
            {mode === 'saved'
              ? 'Private collection'
              : 'Fresh from your community'}
          </Text>
        </View>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={modes.filter(item => item.key !== 'saved' || mode === 'saved')}
        keyExtractor={item => item.key}
        contentContainerStyle={styles.modeRow}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => selectMode(item.key)}
            style={[
              styles.modeChip,
              mode === item.key && styles.modeChipActive,
            ]}
          >
            <Text
              style={[
                styles.modeText,
                mode === item.key && styles.modeTextActive,
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
  return (
    <>
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.content}
        data={posts}
        keyExtractor={item => item.id}
        ListHeaderComponent={header}
        onEndReached={() => {
          if (cursor && !loading && !loadingMore) void load(false);
        }}
        onEndReachedThreshold={0.45}
        refreshControl={
          <RefreshControl
            refreshing={loading && posts.length > 0}
            onRefresh={() => {
              setCursor(null);
              void load(true);
            }}
            tintColor={colors.blue}
          />
        }
        renderItem={({ item }) => (
          <PostCard
            post={item}
            accessToken={accessToken}
            canDelete={item.author.id === user.id}
            initialSaved={mode === 'saved' || item.viewerSaved}
            initialShowComments={focusComments && item.id === focusPostId}
            recommendationReason={recommendationPreferences.showReasons ? item.recommendationReason : undefined}
            onOpenProfile={onOpenProfile}
            onOpenGroup={onOpenGroup}
            onHidden={id =>
              setPosts(current => current.filter(post => post.id !== id))
            }
            onSaved={(id, isSaved) => {
              if (mode === 'saved' && !isSaved)
                setPosts(current => current.filter(post => post.id !== id));
              else
                setPosts(current =>
                  current.map(post =>
                    post.id === id ? { ...post, viewerSaved: isSaved } : post,
                  ),
                );
            }}
            onEdited={() => void load(true)}
            onReposted={() => void load(true)}
          />
        )}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator color={colors.blue} style={styles.footer} />
          ) : (
            <View />
          )
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>
              {error ? '!' : mode === 'saved' ? '▱' : '✦'}
            </Text>
            <Text style={styles.emptyTitle}>
              {error
                ? 'Could not load your feed'
                : mode === 'saved'
                  ? 'No bookmarks yet'
                  : 'Nothing here yet'}
            </Text>
            <Text style={styles.emptyText}>
              {error ||
                (loading
                  ? 'Loading your feed…'
                  : mode === 'following'
                    ? 'Follow people to see updates here.'
                    : mode === 'groups'
                      ? 'Join a group to see conversations from your communities.'
                      : mode === 'saved'
                        ? 'Save posts to find them here.'
                        : 'Create the first update for your community.')}
            </Text>
            {error ? (
              <Pressable onPress={() => void load(true)}>
                <Text style={styles.retry}>Try again</Text>
              </Pressable>
            ) : loading ? <FeedSkeleton /> : null}
          </View>
        }
      />
      <Modal
        visible={Boolean(selectedStory)}
        transparent
        animationType="slide"
        onRequestClose={() => {
          closeStory();
        }}
      >
        <View style={styles.storyViewer}>
          {/* Progress Bar */}
          <View style={styles.storyProgress}>
            <Animated.View
              style={[
                styles.storyProgressFill,
                {
                  width: storyProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>

          {/* Header */}
          <View style={styles.storyHeader}>
            <View style={styles.storyAuthor}>
              <Avatar
                initials={
                  selectedStory?.authorId?.name
                    .split(' ')
                    .map(part => part[0])
                    .join('')
                    .slice(0, 2) || 'U'
                }
                avatarUrl={selectedStory?.authorId?.avatarUrl}
                size={40}
              />
              <View style={styles.storyAuthorInfo}>
                <Text style={styles.storyAuthorName}>
                  {selectedStory?.authorId?.name}
                </Text>
                <Text style={styles.storyAuthorTime}>2h ago</Text>
              </View>
            </View>
            <Pressable
              onPress={() => {
                closeStory();
              }}
              style={styles.storyClose}
            >
              <Text style={styles.storyCloseText}>✕</Text>
            </Pressable>
          </View>

          {/* Content */}
          <View style={styles.storyContent}>
            {selectedStory?.media?.[0]?.type === 'image' ? (
              <Image
                source={{ uri: selectedStory.media[0].url }}
                style={styles.storyImage}
                resizeMode="cover"
              />
            ) : selectedStory?.media?.[0]?.type === 'video' ? (
              <Video
                source={{ uri: selectedStory?.media?.[0]?.url }}
                style={styles.storyVideo}
                resizeMode="cover"
                paused={videoPaused}
                repeat
                muted={false}
                controls={false}
                onPlaybackStatusUpdate={status => {
                  if (status.isLoaded) {
                    setVideoPaused(false);
                  }
                }}
              />
            ) : (
              <View style={styles.storyTextContainer}>
                <Text style={styles.storyTextType}>TEXT STORY</Text>
                <Text style={styles.storyText}>{selectedStory?.body}</Text>
              </View>
            )}
          </View>

          {/* Swipe Indicators */}
          <View style={styles.storyIndicators}>
            {stories.map((story, index) => (
              <View
                key={story._id}
                style={[
                  styles.storyIndicator,
                  index === selectedStoryIndex && styles.storyIndicatorActive,
                ]}
              />
            ))}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: 120 },
  appBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing.sm, paddingBottom: spacing.md },
  logo: { color: colors.ink, fontSize: 24, fontWeight: '900', letterSpacing: -1 },
  headerActions: { flexDirection: 'row', gap: spacing.sm },
  headerButton: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  headerButtonText: { color: colors.ink, fontSize: 21, fontWeight: '800' },
  skeletonWrap: { width: '100%', marginTop: spacing.md },
  skeletonCard: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  skeletonHeader: { flexDirection: 'row', alignItems: 'center' },
  skeletonAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.surfaceAlt },
  skeletonLines: { flex: 1, marginLeft: spacing.sm },
  skeletonLineShort: { width: '38%', height: 10, borderRadius: 5, backgroundColor: colors.surfaceAlt },
  skeletonLineLong: { width: '64%', height: 8, borderRadius: 4, backgroundColor: colors.surfaceAlt, marginTop: 8 },
  skeletonBody: { height: 140, borderRadius: radius.sm, backgroundColor: colors.surfaceAlt, marginTop: spacing.md },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  homeSearch: {
    height: 52,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  homeSearchIcon: { fontSize: 23, color: colors.blue, marginRight: spacing.sm },
  homeSearchInput: { flex: 1, color: colors.ink, fontSize: 14, padding: 0 },
  platformNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.blueSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.lavender,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  platformNoticeIcon: { color: colors.blue, fontSize: 18, marginRight: spacing.sm },
  platformNoticeCopy: { flex: 1 },
  platformNoticeTitle: { color: colors.ink, fontSize: 13, fontWeight: '900' },
  platformNoticeText: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 2 },
  kicker: {
    fontSize: 11,
    letterSpacing: 2.5,
    color: colors.primary,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  greeting: {
    fontSize: 15,
    color: colors.muted,
    fontWeight: '600',
    marginTop: 4,
  },
  profileButton: { position: 'relative' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  chatButton: { width: 48, height: 48, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, ...shadow },
  chatGlyph: { width: 28, height: 23, borderRadius: 10, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center', borderBottomLeftRadius: 4 },
  chatDots: { color: colors.blue, fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  onlineDot: {
    position: 'absolute',
    right: -1,
    bottom: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.canvas,
  },
  hero: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadowLarge,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -1,
  },
  heroSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 6,
    fontWeight: '500',
  },
  heroMark: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroMarkText: { fontSize: 28, color: '#fff' },
  storyCard: { marginTop: spacing.sm, marginBottom: spacing.md, zIndex: 1 },
  storyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  storyCardTitle: {
    fontSize: 18,
    marginVertical: 0,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.ink,
    letterSpacing: -0.5,
    marginVertical: spacing.md,
  },
  storyHint: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '700',
  },
  storyItem: {
    width: 70,
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  storyRing: {
    borderWidth: 2.5,
    borderColor: colors.primary,
    borderRadius: 30,
    padding: 2,
  },
  storyName: {
    fontSize: 10,
    color: colors.muted,
    fontWeight: '600',
    marginTop: 6,
    maxWidth: 70,
    textAlign: 'center',
  },
  storyList: {
    paddingHorizontal: 0,
  },
  emptyStory: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  addStory: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.lavender,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addStoryText: { fontSize: 28, color: colors.primary },
  emptyStoryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
    marginLeft: spacing.md,
  },
  emptyStoryText: {
    fontSize: 11,
    color: colors.muted,
    marginLeft: spacing.md,
    marginTop: 2,
  },
  composer: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
  },
  composerCopy: { flex: 1, marginLeft: spacing.md },
  composerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.ink,
  },
  composerHint: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  composerAdd: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.lavender,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerAddText: { fontSize: 23, color: colors.primary },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
    marginTop: spacing.md,
  },
  quickAction: { alignItems: 'center', padding: spacing.sm },
  quickIcon: { fontSize: 18, color: colors.primary },
  quickLabel: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: '600',
    marginTop: 4,
  },
  feedHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  feedSubtitle: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 3,
    fontWeight: '500',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.mint,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
    marginRight: 4,
  },
  liveText: {
    fontSize: 10,
    color: colors.success,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  modeRow: { paddingBottom: spacing.sm },
  modeChip: {
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: 11,
    marginRight: spacing.sm,
    borderWidth: 0,
  },
  modeChipActive: {
    backgroundColor: colors.primary,
  },
  modeText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.muted,
  },
  modeTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  footer: { paddingVertical: spacing.lg },
  empty: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  emptyIcon: { fontSize: 36, color: colors.primary },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
    marginTop: spacing.md,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.muted,
    lineHeight: 22,
    fontSize: 14,
    marginTop: spacing.sm,
  },
  retry: {
    color: colors.primary,
    fontWeight: '700',
    marginTop: spacing.lg,
  },
});
Object.assign(styles, {
  storyViewer: {
    flex: 1,
    backgroundColor: '#000',
  },
  storyProgress: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    zIndex: 10,
  },
  storyProgressFill: {
    width: '0%',
    height: '100%',
    backgroundColor: colors.blue,
  },
  storyHeader: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  storyAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storyAuthorInfo: {
    marginLeft: spacing.md,
  },
  storyAuthorName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  storyAuthorTime: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  storyClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyCloseText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '600',
  },
  storyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyImage: {
    width: '100%',
    height: '100%',
  },
  storyVideo: {
    width: '100%',
    height: '100%',
  },
  storyTextContainer: {
    width: '88%',
    minHeight: 280,
    padding: spacing.xxl,
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: {width: 0, height: 12},
    elevation: 12,
  },
  storyTextType: {
    color: 'rgba(255, 255, 255, 0.72)',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  storyText: {
    fontSize: 32,
    color: '#fff',
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 44,
  },
  storyIndicators: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    zIndex: 10,
  },
  storyIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  preferenceHint: { marginTop: -spacing.sm, marginBottom: spacing.md },
  preferenceHintText: { color: colors.muted, fontSize: 11 },
  storyIndicatorActive: {
    backgroundColor: '#fff',
    width: 24,
  },
});
// @ts-nocheck
