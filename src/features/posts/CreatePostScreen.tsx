import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Avatar } from '../../components/common/Avatar';
import { colors, radius, shadow, spacing } from '../../theme/tokens';
import { Asset } from 'react-native-image-picker';
import { pickMedia, uploadMedia } from '../../services/media/cloudinary';
import { apiRequest } from '../../services/api/client';

type Mode = 'post' | 'reel' | 'story';
type Audience = 'Public' | 'Friends' | 'Only me';

export function CreatePostScreen({
  onClose,
  accessToken,
  onPublished,
  user,
}: {
  onClose: () => void;
  accessToken: string;
  onPublished: () => void;
  user: { name: string; avatarUrl?: string };
}) {
  const [mode, setMode] = useState<Mode>('post');
  const [text, setText] = useState('');
  const [audience, setAudience] = useState<Audience>('Friends');
  const [location, setLocation] = useState('');
  const [accessibilityText, setAccessibilityText] = useState('');
  const [scheduledFor, setScheduledFor] = useState<Date | null>(null);
  const [media, setMedia] = useState<Asset[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const initials = user.name
    .split(' ')
    .map(part => part[0])
    .join('')
    .slice(0, 2);
  const tags = useMemo(
    () =>
      Array.from(text.matchAll(/#[a-z0-9_]+/gi), match =>
        match[0].toLowerCase(),
      ),
    [text],
  );
  const mentions = useMemo(
    () =>
      Array.from(text.matchAll(/@[a-z0-9_.]+/gi), match =>
        match[0].slice(1).toLowerCase(),
      ),
    [text],
  );
  const canPublish =
    Boolean(text.trim() || media.length) &&
    !busy &&
    (mode !== 'reel' ||
      (media.length === 1 && media[0].type?.startsWith('video')));
  const audienceValue =
    audience === 'Only me' ? 'private' : audience.toLowerCase();

  const choose = async (type: 'photo' | 'video') => {
    try {
      setError('');
      const selected = await pickMedia(type);
      setMedia(items =>
        [...items, ...selected].slice(0, mode === 'reel' ? 1 : 10),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to select media.');
    }
  };
  const saveDraft = async () => {
    if (!text.trim() && !media.length) {
      setError('Add text or media before saving a draft.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const uploaded = await Promise.all(
        media.map(item => uploadMedia(item, accessToken)),
      );
      await apiRequest(
        '/posts',
        {
          method: 'POST',
          body: JSON.stringify({
            body: text,
            audience: audienceValue,
            location,
            media: uploaded,
            hashtags: tags,
            mentions,
            isReel: mode === 'reel',
            status: 'draft',
            accessibilityText,
          }),
        },
        accessToken,
      );
      Alert.alert(
        'Draft saved',
        'You can continue editing it from your drafts.',
      );
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save draft.');
    } finally {
      setBusy(false);
    }
  };
  const publish = async () => {
    if (!canPublish) return;
    setBusy(true);
    setError('');
    try {
      const uploaded = await Promise.all(
        media.map(item => uploadMedia(item, accessToken)),
      );
      const payload = {
        body: text,
        audience: mode === 'reel' ? 'public' : audienceValue,
        location,
        media: uploaded,
        hashtags: tags,
        mentions,
        isReel: mode === 'reel',
        status: scheduledFor ? 'scheduled' : 'published',
        scheduledFor: scheduledFor?.toISOString() ?? null,
        accessibilityText,
      };
      if (mode === 'story')
        await apiRequest(
          '/stories',
          {
            method: 'POST',
            body: JSON.stringify({
              body: text,
              audience: audienceValue,
              media: uploaded,
            }),
          },
          accessToken,
        );
      else
        await apiRequest(
          '/posts',
          { method: 'POST', body: JSON.stringify(payload) },
          accessToken,
        );
      onPublished();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to publish.');
    } finally {
      setBusy(false);
    }
  };
  const setModeAndReset = (next: Mode) => {
    setMode(next);
    setMedia([]);
    setScheduledFor(null);
    if (next !== 'post') setAudience('Public');
  };
  const scheduleTomorrow = () => {
    const next = new Date();
    next.setDate(next.getDate() + 1);
    next.setHours(9, 0, 0, 0);
    setScheduledFor(next);
  };
  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <Pressable style={styles.closeButton} onPress={onClose}>
          <Text style={styles.cancel}>×</Text>
        </Pressable>
        <View>
          <Text style={styles.eyebrow}>
            {mode === 'story'
              ? '24 HOURS'
              : mode === 'reel'
              ? 'SHORT-FORM VIDEO'
              : 'SHARE WITH YOUR CIRCLE'}
          </Text>
          <Text style={styles.title}>
            {mode === 'story'
              ? 'Create story'
              : mode === 'reel'
              ? 'Create reel'
              : 'Create post'}
          </Text>
        </View>
        <Pressable
          style={styles.publishButton}
          onPress={publish}
          disabled={!canPublish}
        >
          <Text style={[styles.post, !canPublish && styles.disabled]}>
            {busy
              ? 'Working…'
              : scheduledFor
              ? 'Schedule'
              : mode === 'story'
              ? 'Share'
              : 'Publish'}
          </Text>
        </Pressable>
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.author}>
          <Avatar initials={initials} avatarUrl={user.avatarUrl} />
          <View>
            <Text style={styles.name}>{user.name}</Text>
            <Pressable
              onPress={() =>
                setAudience(
                  audience === 'Public'
                    ? 'Friends'
                    : audience === 'Friends'
                    ? 'Only me'
                    : 'Public',
                )
              }
            >
              <Text style={styles.audience}>
                {mode === 'reel' ? 'Public' : audience} ▾
              </Text>
            </Pressable>
          </View>
        </View>
        <View style={styles.modeSwitch}>
          {(['post', 'reel', 'story'] as Mode[]).map(item => (
            <Pressable
              key={item}
              onPress={() => setModeAndReset(item)}
              style={[styles.modeButton, mode === item && styles.modeActive]}
            >
              <Text
                style={[
                  styles.modeText,
                  mode === item && styles.modeActiveText,
                ]}
              >
                {item[0].toUpperCase() + item.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          autoFocus
          multiline
          value={text}
          onChangeText={setText}
          placeholder={
            mode === 'reel'
              ? 'Add a caption to your reel…'
              : mode === 'story'
              ? 'Add a thought to your story…'
              : "What's on your mind? Use #hashtags or @mentions"
          }
          placeholderTextColor={colors.muted}
          style={styles.input}
          textAlignVertical="top"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {media.length > 0 && (
          <ScrollView horizontal style={styles.previewRow}>
            {media.map((item, index) => (
              <View style={styles.preview} key={`${item.uri}-${index}`}>
                {item.type?.startsWith('image') ? (
                  <Image
                    source={{ uri: item.uri }}
                    style={styles.previewImage}
                  />
                ) : (
                  <View style={styles.videoPreview}>
                    <Text style={styles.videoIcon}>▶</Text>
                    <Text style={styles.videoLabel}>Video</Text>
                  </View>
                )}
                <Pressable
                  style={styles.remove}
                  onPress={() =>
                    setMedia(items => items.filter((_, i) => i !== index))
                  }
                >
                  <Text style={styles.removeText}>×</Text>
                </Pressable>
              </View>
            ))}
          </ScrollView>
        )}
        <View style={styles.attachment}>
          <Pressable onPress={() => void choose('photo')}>
            <Text style={styles.attachmentIcon}>▣</Text>
            <Text style={styles.attachmentTitle}>
              {media.length > 0 ? 'Carousel' : 'Photo'}
            </Text>
          </Pressable>
          <Pressable onPress={() => void choose('video')}>
            <Text style={styles.attachmentIcon}>▶</Text>
            <Text style={styles.attachmentTitle}>Video</Text>
          </Pressable>
          <Pressable
            onPress={() => setLocation(location ? '' : 'Current location')}
          >
            <Text style={styles.attachmentIcon}>⌖</Text>
            <Text style={styles.attachmentTitle}>Location</Text>
          </Pressable>
        </View>
        <Text style={styles.mediaMeta}>
          {media.length
            ? `${media.length} media item${
                media.length > 1 ? 's' : ''
              } selected`
            : 'Attach photos, videos, or a carousel'}
        </Text>
        {mode !== 'story' && (
          <TextInput
            value={location}
            onChangeText={setLocation}
            placeholder="Add a location (optional)"
            placeholderTextColor={colors.muted}
            style={styles.location}
          />
        )}
        {mode === 'post' && (
          <>
            <TextInput
              value={accessibilityText}
              onChangeText={setAccessibilityText}
              placeholder="Accessibility description (optional)"
              placeholderTextColor={colors.muted}
              style={styles.location}
            />
            <View style={styles.scheduleRow}>
              <Text style={styles.scheduleText}>
                {scheduledFor
                  ? `Scheduled for ${scheduledFor.toLocaleString()}`
                  : 'Publish now'}
              </Text>
              <Pressable
                onPress={() =>
                  scheduledFor ? setScheduledFor(null) : scheduleTomorrow()
                }
              >
                <Text style={styles.scheduleAction}>
                  {scheduledFor ? 'Clear' : 'Schedule tomorrow'}
                </Text>
              </Pressable>
            </View>
            <Pressable
              style={styles.draftButton}
              onPress={() => void saveDraft()}
              disabled={busy}
            >
              <Text style={styles.draftText}>Save as draft</Text>
            </Pressable>
          </>
        )}
        {mode === 'reel' && (
          <Text style={styles.reelHint}>
            Reels are public and use one video. Vertical videos look best.
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.canvas, padding: spacing.md },
  content: { paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.ink,
    textAlign: 'center',
  },
  eyebrow: {
    fontSize: 8,
    letterSpacing: 1.1,
    color: colors.blue,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 3,
  },
  cancel: { color: colors.muted, fontSize: 25, lineHeight: 25 },
  publishButton: {
    backgroundColor: colors.blue,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...shadow,
  },
  post: { color: '#fff', fontSize: 13, fontWeight: '900' },
  disabled: { color: '#B7A9E8' },
  modeSwitch: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    padding: 3,
    marginBottom: spacing.md,
  },
  modeButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radius.pill,
  },
  modeActive: { backgroundColor: colors.blue },
  modeText: { fontSize: 12, fontWeight: '800', color: colors.muted },
  modeActiveText: { color: '#fff' },
  author: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
    gap: spacing.sm,
    ...shadow,
  },
  name: { fontWeight: '900', color: colors.ink },
  audience: {
    fontSize: 12,
    color: colors.blue,
    marginTop: 3,
    fontWeight: '700',
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    minHeight: 210,
    padding: spacing.md,
    fontSize: 20,
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.border,
  },
  attachment: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: spacing.md,
    ...shadow,
  },
  attachmentIcon: { fontSize: 24, color: colors.blue, textAlign: 'center' },
  attachmentTitle: {
    fontWeight: '800',
    color: colors.ink,
    textAlign: 'center',
    marginTop: 4,
    fontSize: 12,
  },
  location: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.ink,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mediaMeta: {
    fontSize: 12,
    color: colors.muted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  reelHint: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  error: { color: colors.danger, fontSize: 12, marginTop: spacing.sm },
  previewRow: { marginTop: spacing.md },
  preview: {
    width: 112,
    height: 112,
    borderRadius: radius.md,
    overflow: 'hidden',
    marginRight: spacing.sm,
    backgroundColor: colors.surface,
    position: 'relative',
  },
  previewImage: { width: '100%', height: '100%' },
  videoPreview: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  videoIcon: { fontSize: 28, color: colors.blue },
  videoLabel: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  remove: {
    position: 'absolute',
    right: 6,
    top: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(17,24,39,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: { color: '#fff', fontSize: 18, lineHeight: 21 },
  scheduleRow: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scheduleText: { color: colors.ink, fontSize: 12, fontWeight: '700', flex: 1 },
  scheduleAction: { color: colors.blue, fontWeight: '900', fontSize: 12 },
  draftButton: { alignItems: 'center', padding: spacing.md },
  draftText: { color: colors.blue, fontWeight: '900' },
});
