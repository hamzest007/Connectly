import React, { useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  Share,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Avatar } from '../common/Avatar';
import {
  colors,
  radius,
  shadow,
  shadowLarge,
  spacing,
} from '../../theme/tokens';
import { Post } from '../../types/social';
import { apiRequest } from '../../services/api/client';
import Video from 'react-native-video';

type Comment = {
  _id: string;
  body: string;
  authorId: { name: string; username?: string; avatarUrl?: string } | null;
  createdAt: string;
};
export function PostCard({
  post,
  accessToken,
  canDelete,
  onHidden,
  onOpenProfile,
  initialSaved,
  onSaved,
  onEdited,
  onReposted,
  initialShowComments,
}: {
  post: Post;
  accessToken: string;
  canDelete?: boolean;
  onHidden?: (id: string) => void;
  onOpenProfile?: (user: {
    id?: string;
    name: string;
    username: string;
  }) => void;
  initialSaved?: boolean;
  onSaved?: (id: string, saved: boolean) => void;
  onEdited?: (id: string) => void;
  onReposted?: () => void;
  initialShowComments?: boolean;
}) {
  const [liked, setLiked] = useState(Boolean(post.viewerReaction));
  const [count, setCount] = useState(post.reactions);
  const [commentCount, setCommentCount] = useState(post.comments);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [showComments, setShowComments] = useState(Boolean(initialShowComments));
  const [showMenu, setShowMenu] = useState(false);
  const [busy, setBusy] = useState(false);
  const [shares, setShares] = useState(post.shares);
  const [saved, setSaved] = useState(Boolean(initialSaved));
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const [pinned, setPinned] = useState(Boolean(post.pinned));
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editBody, setEditBody] = useState(post.body);
  const [editing, setEditing] = useState(false);
  React.useEffect(() => {
    setSaved(Boolean(initialSaved));
  }, [initialSaved, post.id]);
  const emojis = [
    '😀',
    '😂',
    '😍',
    '🥰',
    '😎',
    '🤩',
    '😢',
    '😮',
    '😡',
    '👍',
    '👏',
    '🔥',
    '❤️',
    '💙',
    '💯',
    '🎉',
    '🙌',
    '✨',
    '🤣',
    '😊',
    '🤔',
    '😅',
    '🙏',
    '🚀',
  ];

  const toggleLike = async () => {
    try {
      const result = liked
        ? await apiRequest<{ count: number }>(
            `/posts/${post.id}/reaction`,
            { method: 'DELETE' },
            accessToken,
          )
        : await apiRequest<{ count: number }>(
            `/posts/${post.id}/reaction`,
            { method: 'PUT', body: JSON.stringify({ type: 'Like' }) },
            accessToken,
          );
      setLiked(!liked);
      setCount(result.count);
    } catch {
      /* keep server state unchanged */
    }
  };
  const loadComments = async () => {
    setShowComments(true);
    try {
      const result = await apiRequest<Comment[]>(
        `/posts/${post.id}/comments`,
        {},
        accessToken,
      );
      setComments(result);
    } catch {
      setComments([]);
    }
  };
  React.useEffect(() => {
    if (initialShowComments) void loadComments();
  }, [initialShowComments]);
  const addComment = async () => {
    if (!comment.trim() || busy) return;
    setBusy(true);
    try {
      await apiRequest<Comment>(
        `/posts/${post.id}/comments`,
        { method: 'POST', body: JSON.stringify({ body: comment.trim() }) },
        accessToken,
      );
      setComment('');
      setCommentCount(value => value + 1);
      await loadComments();
    } finally {
      setBusy(false);
    }
  };
  const share = async () => {
    try {
      const result = await apiRequest<{ shareCount: number }>(
        `/posts/${post.id}/share`,
        { method: 'POST' },
        accessToken,
      );
      setShares(result.shareCount);
    } catch {}
  };
  const hide = async () => {
    try {
      await apiRequest(
        `/posts/${post.id}/hide`,
        { method: 'POST' },
        accessToken,
      );
      onHidden?.(post.id);
    } catch {}
  };
  const notInterested = async () => {
    try {
      await apiRequest(
        `/posts/${post.id}/recommendation-feedback`,
        { method: 'POST', body: JSON.stringify({ type: 'not-interested' }) },
        accessToken,
      );
      setShowMenu(false);
      onHidden?.(post.id);
    } catch {
      Alert.alert('Unable to update preferences', 'Please try again later.');
    }
  };
  const snooze = async () => {
    try {
      await apiRequest(
        `/posts/${post.id}/snooze`,
        { method: 'POST', body: JSON.stringify({ days: 30 }) },
        accessToken,
      );
      onHidden?.(post.id);
    } catch {}
  };
  const remove = async () => {
    try {
      await apiRequest(`/posts/${post.id}`, { method: 'DELETE' }, accessToken);
      onHidden?.(post.id);
    } catch {}
  };
  const toggleSave = async () => {
    try {
      const next = !saved;
      await apiRequest(
        `/posts/${post.id}/save`,
        { method: next ? 'POST' : 'DELETE' },
        accessToken,
      );
      setSaved(next);
      onSaved?.(post.id, next);
    } catch {}
  };
  const togglePin = async () => {
    try {
      const next = !pinned;
      await apiRequest(
        `/posts/${post.id}/pin`,
        { method: next ? 'POST' : 'DELETE' },
        accessToken,
      );
      setPinned(next);
      setShowMenu(false);
    } catch {}
  };
  const repost = async () => {
    try {
      await apiRequest(
        `/posts/${post.id}/repost`,
        { method: 'POST', body: JSON.stringify({ body: '' }) },
        accessToken,
      );
      setShowMenu(false);
      onReposted?.();
    } catch {}
  };
  const sharePostLink = async () => {
    try {
      const result = await apiRequest<{url: string}>(
        `/posts/${post.id}/share-link`,
        {},
        accessToken,
      );
      setShowMenu(false);
      await Share.share({message: result.url});
    } catch {}
  };
  const reportPost = async () => {
    try {
      await apiRequest(
        '/reports',
        {method: 'POST', body: JSON.stringify({targetType: 'post', targetId: post.id, reason: 'Inappropriate or abusive content'})},
        accessToken,
      );
      setShowMenu(false);
      Alert.alert('Report submitted', 'Thanks for helping keep Connectly safe.');
    } catch {
      Alert.alert('Unable to report', 'Please try again later.');
    }
  };
  const archive = async () => {
    try {
      await apiRequest(
        `/posts/${post.id}/archive`,
        { method: 'POST' },
        accessToken,
      );
      onHidden?.(post.id);
    } catch {}
  };
  const editPost = async () => {
    if (!editBody.trim()) return;
    setEditing(true);
    try {
      await apiRequest(
        `/posts/${post.id}`,
        { method: 'PATCH', body: JSON.stringify({ body: editBody.trim() }) },
        accessToken,
      );
      setShowEditModal(false);
      setShowMenu(false);
      onEdited?.(post.id);
    } catch {
    } finally {
      setEditing(false);
    }
  };


  return (
    <>
      <View style={styles.card}>
        <View style={styles.header}>
          <Pressable
            onPress={() =>
              onOpenProfile?.({
                id: post.author.id,
                name: post.author.name,
                username: post.author.username,
              })
            }
          >
            <Avatar
              initials={post.author.initials}
              color={post.author.accent}
              avatarUrl={post.author.avatarUrl}
            />
          </Pressable>
          <Pressable
            style={styles.author}
            onPress={() =>
              onOpenProfile?.({
                id: post.author.id,
                name: post.author.name,
                username: post.author.username,
              })
            }
          >
            <Text style={styles.name}>{post.author.name}</Text>
            <Text style={styles.meta}>
              @{post.author.username} · {post.createdAt}
            </Text>
          </Pressable>
          <Pressable onPress={() => setShowMenu(value => !value)}>
            <Text style={styles.more}>•••</Text>
          </Pressable>
        </View>
        {showMenu && (
          <View style={styles.menu}>
            <Text style={styles.menuTitle}>More options</Text>
            {canDelete ? (
              <>
                <Pressable onPress={() => void togglePin()}>
                  <Text style={styles.menuItem}>
                    {pinned ? 'Unpin from profile' : 'Pin to profile'}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setEditBody(post.body);
                    setShowEditModal(true);
                    setShowMenu(false);
                  }}
                >
                  <Text style={styles.menuItem}>Edit post</Text>
                </Pressable>
                <Pressable onPress={() => void archive()}>
                  <Text style={styles.menuItem}>Archive post</Text>
                </Pressable>
                <Pressable onPress={() => void remove()}>
                  <Text style={[styles.menuItem, styles.deleteItem]}>
                    Delete your post
                  </Text>
                </Pressable>
              </>
            ) : (
              <Pressable onPress={() => void hide()}>
                <Text style={styles.menuItem}>Hide this post</Text>
              </Pressable>
            )}
            {!canDelete ? (
              <Pressable onPress={() => void notInterested()}>
                <Text style={styles.menuItem}>Not interested</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={() => void repost()}>
              <Text style={styles.menuItem}>Repost</Text>
            </Pressable>
            <Pressable onPress={() => void snooze()}>
              <Text style={styles.menuItem}>
                Snooze this person for 30 days
              </Text>
            </Pressable>
            <Pressable onPress={() => { void toggleSave(); setShowMenu(false); }}>
              <Text style={styles.menuItem}>{saved ? 'Remove from saved' : 'Save post'}</Text>
            </Pressable>
            <Pressable onPress={() => void sharePostLink()}>
              <Text style={styles.menuItem}>Share post link</Text>
            </Pressable>
            {!canDelete ? (
              <Pressable onPress={() => void reportPost()}>
                <Text style={[styles.menuItem, styles.reportItem]}>Report post</Text>
              </Pressable>
            ) : null}
          </View>
        )}
        {pinned ? (
          <View style={styles.pinned}>
            <Text style={styles.pinnedText}>✦ Pinned post</Text>
          </View>
        ) : null}
        {post.body ? <Text style={styles.body}>{post.body}</Text> : null}
        {post.repostOf ? (
          <View style={styles.repost}>
            <Text style={styles.repostLabel}>↻ Reposted from @{post.repostOf.author.username}</Text>
            <View style={styles.repostContent}>
              <View style={styles.repostHeader}>
                <Avatar initials={post.repostOf.author.initials} color={post.repostOf.author.accent} avatarUrl={post.repostOf.author.avatarUrl} size={32} />
                <View style={styles.repostAuthor}>
                  <Text style={styles.repostName}>{post.repostOf.author.name}</Text>
                  <Text style={styles.repostMeta}>@{post.repostOf.author.username} · {post.repostOf.createdAt}</Text>
                </View>
              </View>
              {post.repostOf.body ? <Text style={styles.repostBody}>{post.repostOf.body}</Text> : null}
              {post.repostOf.media?.length ? <Image source={{uri: post.repostOf.media[0].url}} style={styles.repostImage} /> : null}
            </View>
          </View>
        ) : null}
        {post.media?.length ? (
          <View style={styles.mediaGrid}>
            {post.media.slice(0, 4).map((media, index) => (
              <View
                style={[
                  styles.mediaTile,
                  post.media && post.media.length === 1 && styles.mediaSingle,
                ]}
                key={`${media.url}-${index}`}
              >
                {media.type === 'image' ? (
                  <Image
                    source={{ uri: media.url }}
                    style={styles.mediaImage}
                  />
                ) : (
                  <Pressable
                    style={styles.videoTile}
                    onPress={() =>
                      setPlayingVideo(value =>
                        value === media.url ? null : media.url,
                      )
                    }
                  >
                    <Video
                      source={{ uri: media.url }}
                      style={styles.video}
                      resizeMode="cover"
                      paused={playingVideo !== media.url}
                      repeat
                      muted
                      controls={false}
                      poster={media.thumbnailUrl}
                    />
                    <View style={styles.videoOverlay}>
                      <Text style={styles.play}>
                        {playingVideo === media.url ? 'Ⅱ' : '▶'}
                      </Text>
                      <Text style={styles.videoText}>
                        {playingVideo === media.url ? 'Playing' : 'Tap to play'}
                      </Text>
                    </View>
                  </Pressable>
                )}
                {post.media && post.media.length > 4 && index === 3 ? (
                  <View style={styles.mediaCount}>
                    <Text style={styles.mediaCountText}>
                      +{post.media.length - 4}
                    </Text>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}
        <View style={styles.stats}>
          <Text style={styles.stat}>
            {liked ? '💙' : '🤍'} {count}
          </Text>
          <Text style={styles.stat}>
            {commentCount} comments · {shares} shares
          </Text>
        </View>
        <View style={styles.actions}>
          <Pressable onPress={toggleLike} style={styles.action}>
            <Text style={[styles.actionText, liked && styles.active]}>
              ♡ Like
            </Text>
          </Pressable>
          <Pressable
            onPress={() => void loadComments()}
            style={styles.action}
            hitSlop={8}
          >
            <Text style={styles.actionText}>◯ Comment</Text>
          </Pressable>
          <Pressable onPress={() => void share()} style={styles.action}>
            <Text style={styles.actionText}>↗ Share</Text>
          </Pressable>
          <Pressable onPress={() => void toggleSave()} style={styles.action}>
            <Text style={[styles.actionText, saved && styles.active]}>
              ▱ {saved ? 'Saved' : 'Save'}
            </Text>
          </Pressable>
        </View>
        <Modal
          visible={showComments}
          transparent
          animationType="slide"
          onRequestClose={() => setShowComments(false)}
        >
          <View style={styles.sheetBackdrop}>
            <Pressable
              style={styles.sheetDismiss}
              onPress={() => setShowComments(false)}
            />
            <View style={styles.sheet}>
              <View style={styles.sheetHandle} />
              <View style={styles.sheetHeader}>
                <View>
                  <Text style={styles.commentsTitle}>Comments</Text>
                  <Text style={styles.commentsHint}>
                    {commentCount} total · join the conversation
                  </Text>
                </View>
                <Pressable
                  onPress={() => setShowComments(false)}
                  style={styles.sheetClose}
                >
                  <Text style={styles.sheetCloseText}>×</Text>
                </Pressable>
              </View>
              <ScrollView
                style={styles.sheetList}
                contentContainerStyle={styles.sheetListContent}
                keyboardShouldPersistTaps="handled"
              >
                {comments.length ? (
                  comments.map(item => {
                    const author = item.authorId ?? {
                      name: 'Connectly member',
                      username: 'member',
                      avatarUrl: undefined,
                    };
                    return (
                      <View style={styles.comment} key={item._id}>
                        <Avatar
                          initials={author.name
                            .split(' ')
                            .map(part => part[0])
                            .join('')
                            .slice(0, 2)}
                          size={34}
                          avatarUrl={author.avatarUrl}
                        />
                        <View style={styles.commentBubble}>
                          <Text style={styles.commentText}>
                            <Text style={styles.commentAuthor}>
                              {author.name}
                            </Text>
                            {author.username ? (
                              <Text style={styles.commentHandle}>
                                {' '}
                                @{author.username}
                              </Text>
                            ) : null}
                          </Text>
                          <Text style={styles.commentBody}>{item.body}</Text>
                          <Text style={styles.commentTime}>
                            {new Date(item.createdAt).toLocaleDateString()}
                          </Text>
                        </View>
                      </View>
                    );
                  })
                ) : (
                  <View style={styles.noComments}>
                    <Text style={styles.noCommentsIcon}>✦</Text>
                    <Text style={styles.noCommentsTitle}>
                      Start the conversation
                    </Text>
                    <Text style={styles.noCommentsText}>
                      Be the first person to share a thought.
                    </Text>
                  </View>
                )}
                {showEmojiPicker ? (
                  <View style={styles.emojiPicker}>
                    {emojis.map(emoji => (
                      <Pressable
                        key={emoji}
                        onPress={() => setComment(value => value + emoji)}
                        style={styles.emojiPickerButton}
                      >
                        <Text style={styles.emojiPickerText}>{emoji}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </ScrollView>
              <View style={styles.emojiQuick}>
                {emojis.slice(0, 8).map(emoji => (
                  <Pressable
                    key={emoji}
                    onPress={() => setComment(value => value + emoji)}
                    style={styles.emojiButton}
                  >
                    <Text style={styles.emoji}>{emoji}</Text>
                  </Pressable>
                ))}
                <Pressable
                  onPress={() => setShowEmojiPicker(value => !value)}
                  style={styles.moreEmoji}
                >
                  <Text style={styles.moreEmojiText}>
                    {showEmojiPicker ? '−' : '+'}
                  </Text>
                </Pressable>
              </View>
              <View style={styles.commentComposer}>
                <Avatar initials="ME" size={32} />
                <View style={styles.inputWrap}>
                  <TextInput
                    value={comment}
                    onChangeText={setComment}
                    placeholder="Share your thoughts…"
                    placeholderTextColor={colors.muted}
                    style={styles.commentInput}
                  />
                  <Pressable
                    onPress={() => setShowEmojiPicker(value => !value)}
                  >
                    <Text style={styles.inputEmoji}>☺</Text>
                  </Pressable>
                </View>
                <Pressable
                  onPress={addComment}
                  disabled={!comment.trim() || busy}
                  style={styles.sendButton}
                >
                  <Text style={[styles.send, busy && styles.sendDisabled]}>
                    Send
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
      <Modal
        visible={showEditModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.editBackdrop}>
          <Pressable
            style={styles.editDismiss}
            onPress={() => setShowEditModal(false)}
          />
          <View style={styles.editModal}>
            <View style={styles.editHeader}>
              <Text style={styles.editTitle}>Edit post</Text>
              <Pressable
                onPress={() => setShowEditModal(false)}
                style={styles.editClose}
              >
                <Text style={styles.editCloseText}>×</Text>
              </Pressable>
            </View>
            <TextInput
              style={styles.editInput}
              placeholder="What's on your mind?"
              placeholderTextColor={colors.muted}
              value={editBody}
              onChangeText={setEditBody}
              multiline
              autoFocus
              maxLength={5000}
            />
            <View style={styles.editActions}>
              <Pressable
                onPress={() => setShowEditModal(false)}
                style={styles.editCancel}
              >
                <Text style={styles.editCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={editPost}
                disabled={editing || !editBody.trim()}
                style={[
                  styles.editSave,
                  (editing || !editBody.trim()) && styles.editSaveDisabled,
                ]}
              >
                <Text style={styles.editSaveText}>
                  {editing ? 'Saving...' : 'Save'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 0,
    ...shadowLarge,
  },
  menu: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    ...shadowLarge,
  },
  menuItem: {
    color: colors.ink,
    fontWeight: '600',
    fontSize: 13,
    paddingVertical: spacing.sm,
  },
  menuTitle: { color: colors.muted, fontSize: 10, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase', paddingHorizontal: spacing.xs, paddingVertical: spacing.xs },
  reportItem: { color: colors.danger },
  deleteItem: { color: colors.danger },
  pinned: {
    backgroundColor: colors.lavender,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    marginTop: spacing.sm,
  },
  pinnedText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  header: { flexDirection: 'row', alignItems: 'center' },
  author: { flex: 1, marginLeft: spacing.md },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
  },
  meta: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
    fontWeight: '500',
  },
  more: {
    color: colors.muted,
    fontWeight: '700',
    letterSpacing: 1,
    fontSize: 18,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.ink,
    marginVertical: spacing.lg,
    letterSpacing: 0,
  },
  repost: { marginBottom: spacing.lg },
  repostLabel: { color: colors.muted, fontSize: 12, fontWeight: '700', marginBottom: spacing.xs },
  repostContent: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md },
  repostHeader: { flexDirection: 'row', alignItems: 'center' },
  repostAuthor: { marginLeft: spacing.sm },
  repostName: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  repostMeta: { color: colors.muted, fontSize: 11, marginTop: 2 },
  repostBody: { color: colors.ink, fontSize: 14, lineHeight: 20, marginTop: spacing.sm },
  repostImage: { width: '100%', height: 230, borderRadius: radius.md, marginTop: spacing.sm },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  mediaTile: {
    width: '48%',
    height: 150,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.canvas,
    position: 'relative',
  },
  mediaSingle: { width: '100%', height: 230 },
  mediaImage: { width: '100%', height: '100%' },
  videoTile: { flex: 1, backgroundColor: '#172039' },
  video: { width: '100%', height: '100%' },
  videoOverlay: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(17,24,39,.18)',
  },
  play: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.blue,
    color: '#fff',
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 17,
    paddingLeft: 3,
  },
  videoText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  mediaCount: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(17,24,39,.48)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaCountText: { color: '#fff', fontSize: 22, fontWeight: '900' },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
  },
  stat: { fontSize: 12, color: colors.muted, fontWeight: '700' },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
  },
  action: { paddingVertical: spacing.xs },
  actionText: { fontSize: 12, fontWeight: '900', color: colors.muted },
  active: { color: colors.blue },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,.42)',
    justifyContent: 'flex-end',
  },
  sheetDismiss: { flex: 1 },
  sheet: {
    maxHeight: '82%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    shadowColor: '#111827',
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -8 },
    elevation: 12,
  },
  sheetHandle: {
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sheetClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetCloseText: { fontSize: 22, color: colors.muted, lineHeight: 24 },
  sheetList: { flexGrow: 0 },
  sheetListContent: { paddingVertical: spacing.sm },
  comments: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.sm,
    paddingTop: spacing.md,
  },
  commentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  commentsTitle: { fontSize: 18, fontWeight: '900', color: colors.ink },
  commentsHint: { fontSize: 11, color: colors.muted, fontWeight: '700' },
  comment: {
    paddingVertical: spacing.xs,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  commentBubble: {
    flex: 1,
    backgroundColor: colors.canvas,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  commentText: { color: colors.ink, fontSize: 13, lineHeight: 18 },
  commentAuthor: { fontWeight: '900' },
  commentHandle: { color: colors.muted, fontSize: 11 },
  commentBody: {
    color: colors.ink,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 2,
  },
  commentTime: { fontSize: 10, color: colors.muted, marginTop: 4 },
  noComments: { alignItems: 'center', paddingVertical: spacing.xl },
  noCommentsIcon: { fontSize: 30, color: colors.blue },
  noCommentsTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.ink,
    marginTop: spacing.sm,
  },
  noCommentsText: { fontSize: 12, color: colors.muted, marginTop: 4 },
  emojiQuick: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
  },
  emojiButton: { paddingHorizontal: 3 },
  emoji: { fontSize: 20 },
  moreEmoji: {
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: colors.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
  },
  moreEmojiText: { color: colors.blue, fontSize: 18, fontWeight: '900' },
  emojiPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.xs,
    marginBottom: spacing.xs,
  },
  emojiPickerButton: {
    width: '12.5%',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  emojiPickerText: { fontSize: 22 },
  commentComposer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  inputWrap: {
    flex: 1,
    backgroundColor: colors.canvas,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentInput: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.ink,
    minHeight: 42,
  },
  inputEmoji: { fontSize: 20, color: colors.blue, paddingRight: spacing.md },
  sendButton: { paddingHorizontal: spacing.xs },
  send: { color: colors.blue, fontWeight: '900' },
  sendDisabled: { color: colors.muted },
  editBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,.42)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editDismiss: { position: 'absolute', inset: 0 },
  editModal: {
    width: '85%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow,
  },
  editHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  editTitle: { fontSize: 18, fontWeight: '900', color: colors.ink },
  editClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editCloseText: { fontSize: 22, color: colors.muted, fontWeight: '700' },
  editInput: {
    backgroundColor: colors.canvas,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.ink,
    minHeight: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.border,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.md,
  },
  editCancel: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
  },
  editCancelText: { fontSize: 14, fontWeight: '800', color: colors.muted },
  editSave: {
    backgroundColor: colors.blue,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  editSaveDisabled: { backgroundColor: colors.canvas },
  editSaveText: { fontSize: 14, fontWeight: '900', color: '#fff' },
});
