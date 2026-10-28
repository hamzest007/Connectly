import React from 'react';
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Avatar } from '../../components/common/Avatar';
import { apiRequest } from '../../services/api/client';
import { colors, radius, shadow, spacing } from '../../theme/tokens';
import { pickMedia, uploadMedia } from '../../services/media/cloudinary';
import { PostCard } from '../../components/posts/PostCard';
import { Post } from '../../types/social';

type ProfileData = {
  _id: string;
  name: string;
  username: string;
  email?: string;
  bio?: string;
  avatarUrl?: string;
  coverUrl?: string;
  website?: string;
  location?: string;
  country?: string;
  education?: string;
  maritalStatus?: string;
  privateAccount?: boolean;
  accountType?: 'user' | 'page';
  isVerified?: boolean;
  followersCount: number;
  followingCount: number;
  postCount: number;
  isFollowing: boolean;
  friendStatus?: 'none' | 'pending' | 'accepted' | 'declined';
};
type User = {
  id: string;
  name: string;
  username: string;
  email: string;
  avatarUrl?: string;
};
type ProfilePost = {
  _id: string;
  body: string;
  createdAt: string;
  reactionCount: number;
  commentCount: number;
  shareCount: number;
  media?: Post['media'];
  authorId: { _id: string; name: string; username: string; avatarUrl?: string };
};

export function ProfileScreen({
  onSettings,
  onBack,
  accessToken,
  user,
  profileUser,
}: {
  onSettings: () => void;
  onBack?: () => void;
  accessToken: string;
  user: User;
  profileUser?: { name: string; username: string };
}) {
  const isSelf = !profileUser;
  const username = profileUser?.username ?? user.username;
  const [profile, setProfile] = React.useState<ProfileData | null>(null);
  const [posts, setPosts] = React.useState<Post[]>([]);
  const [profileTab, setProfileTab] = React.useState<
    'posts' | 'reels' | 'media' | 'tagged'
  >('posts');
  const [loading, setLoading] = React.useState(true);
  const [followBusy, setFollowBusy] = React.useState(false);
  const [photoBusy, setPhotoBusy] = React.useState(false);
  const [coverBusy, setCoverBusy] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [profileSetupVisible, setProfileSetupVisible] = React.useState(false);
  const [name, setName] = React.useState('');
  const [bio, setBio] = React.useState('');
  const [privateAccount, setPrivateAccount] = React.useState(false);
  const [country, setCountry] = React.useState('');
  const [education, setEducation] = React.useState('');
  const [maritalStatus, setMaritalStatus] = React.useState('');
  const [location, setLocation] = React.useState('');
  const [error, setError] = React.useState('');
  const load = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [data, items] = await Promise.all([
        apiRequest<ProfileData>(
          `/users/${encodeURIComponent(username)}`,
          {},
          accessToken,
        ),
        apiRequest<ProfilePost[]>(
          `/users/${encodeURIComponent(username)}/posts`,
          {},
          accessToken,
        ),
      ]);
      setProfile(data);
      setName(data.name);
      setBio(data.bio ?? '');
      setPrivateAccount(Boolean(data.privateAccount));
      setCountry(data.country ?? '');
      setEducation(data.education ?? '');
      setMaritalStatus(data.maritalStatus ?? '');
      setLocation(data.location ?? '');
      setProfileSetupVisible(
        isSelf && !data.bio?.trim() && !data.country?.trim() && !data.location?.trim(),
      );
      setPosts(
        items.map(item => ({
          id: item._id,
          body: item.body,
          createdAt: new Date(item.createdAt).toLocaleDateString(),
          reactions: item.reactionCount,
          comments: item.commentCount,
          shares: item.shareCount,
          media: item.media,
          author: {
            id: item.authorId._id,
            name: item.authorId.name,
            username: item.authorId.username,
            avatarUrl: item.authorId.avatarUrl,
            initials: item.authorId.name
              .split(' ')
              .map(part => part[0])
              .join('')
              .slice(0, 2),
            accent: colors.blue,
          },
        })),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load this profile.');
      setProfile(null);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken, username]);
  React.useEffect(() => {
    void load();
  }, [load]);
  const toggleFollow = async () => {
    if (!profile || followBusy || isSelf) return;
    setFollowBusy(true);
    try {
      if (profile.accountType !== 'page') {
        if (profile.friendStatus === 'none' || profile.friendStatus === 'declined') {
          await apiRequest(`/friends/${profile._id}`, {method: 'POST'}, accessToken);
          setProfile(current => current ? {...current, friendStatus: 'pending'} : current);
        }
      } else if (profile.isFollowing) {
        await apiRequest(
          `/follows/${profile._id}`,
          { method: 'DELETE' },
          accessToken,
        );
      } else {
        await apiRequest(
          `/follows/${profile._id}`,
          { method: 'POST' },
          accessToken,
        );
      }
      setProfile(current =>
        current
          ? {
              ...current,
              isFollowing: !current.isFollowing,
              followersCount: Math.max(
                0,
                current.followersCount + (current.isFollowing ? -1 : 1),
              ),
            }
          : current,
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Unable to update follow status.',
      );
    } finally {
      setFollowBusy(false);
    }
  };
  const changePhoto = async () => {
    if (photoBusy || !isSelf) return;
    setPhotoBusy(true);
    setError('');
    try {
      const selected = await pickMedia('photo');
      if (!selected[0]) return;
      const uploaded = await uploadMedia(selected[0], accessToken);
      const updated = await apiRequest<ProfileData>(
        '/users/me',
        { method: 'PATCH', body: JSON.stringify({ avatarUrl: uploaded.url }) },
        accessToken,
      );
      setProfile(current =>
        current ? { ...current, avatarUrl: updated.avatarUrl } : current,
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Unable to update profile picture.',
      );
    } finally {
      setPhotoBusy(false);
    }
  };
  const changeCover = async () => {
    if (coverBusy || !isSelf) return;
    setCoverBusy(true);
    setError('');
    try {
      const selected = await pickMedia('photo');
      if (!selected[0]) return;
      const uploaded = await uploadMedia(selected[0], accessToken);
      const updated = await apiRequest<ProfileData>(
        '/users/me',
        { method: 'PATCH', body: JSON.stringify({ coverUrl: uploaded.url }) },
        accessToken,
      );
      setProfile(current =>
        current ? { ...current, coverUrl: updated.coverUrl } : current,
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Unable to update cover photo.',
      );
    } finally {
      setCoverBusy(false);
    }
  };
  const saveProfile = async () => {
    if (!profile || saving || !name.trim()) return;
    setSaving(true);
    setError('');
    try {
      const updated = await apiRequest<ProfileData>(
        '/users/me',
        {
          method: 'PATCH',
          body: JSON.stringify({
            name: name.trim(),
            bio: bio.trim(),
            country: country.trim(),
            education: education.trim(),
            maritalStatus: maritalStatus.trim(),
            location: location.trim(),
            privateAccount,
          }),
        },
        accessToken,
      );
      setProfile(current => (current ? { ...current, ...updated } : current));
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save profile.');
    } finally {
      setSaving(false);
    }
  };
  const safetyAction = (action: 'block' | 'mute' | 'restrict') => {
    if (!profile || isSelf) return;
    const label = action[0].toUpperCase() + action.slice(1);
    Alert.alert(
      `${label} ${profile.name}?`,
      action === 'block'
        ? 'They will no longer be able to follow or message you.'
        : action === 'mute'
        ? 'You will stop seeing their updates.'
        : 'They will have limited interaction with you.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: label,
          style: action === 'block' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await apiRequest(
                action === 'block'
                  ? `/blocks/${profile._id}`
                  : `/blocks/${action}/${profile._id}`,
                { method: 'POST' },
                accessToken,
              );
              if (action === 'block') onBack?.();
              else setError(`${label} applied.`);
            } catch (e) {
              setError(
                e instanceof Error
                  ? e.message
                  : `Unable to ${action} this account.`,
              );
            }
          },
        },
      ],
    );
  };
  const initials = (profile?.name ?? profileUser?.name ?? user.name)
    .split(' ')
    .map(part => part[0])
    .join('')
    .slice(0, 2);
  if (loading)
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.blue} />
        <Text style={styles.loadingText}>Loading profile…</Text>
      </View>
    );
  if (!profile)
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>
          {error || 'This profile is no longer available.'}
        </Text>
        {onBack ? (
          <Pressable onPress={onBack}>
            <Text style={styles.retry}>Go back</Text>
          </Pressable>
        ) : null}
      </View>
    );
  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.top}>
        {onBack ? (
          <Pressable onPress={onBack} style={styles.circle}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
        ) : (
          <View style={styles.circleSpacer} />
        )}
        <Text style={styles.topTitle}>{isSelf ? 'Profile' : 'People'}</Text>
        <Pressable
          onPress={
            isSelf
              ? onSettings
              : () =>
                  Alert.alert('Profile actions', 'Choose an action', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Mute', onPress: () => safetyAction('mute') },
                    {
                      text: 'Restrict',
                      onPress: () => safetyAction('restrict'),
                    },
                    {
                      text: 'Block',
                      style: 'destructive',
                      onPress: () => safetyAction('block'),
                    },
                  ])
          }
          style={styles.circle}
        >
          <Text style={styles.settingsIcon}>{isSelf ? '⚙' : '•••'}</Text>
        </Pressable>
      </View>
      <Pressable
        style={styles.cover}
        onPress={isSelf ? () => void changeCover() : undefined}
        disabled={!isSelf || coverBusy}
      >
        {profile.coverUrl ? (
          <ImageBackground
            source={{ uri: profile.coverUrl }}
            style={[
              StyleSheet.absoluteFill,
              { justifyContent: 'flex-end', padding: spacing.md },
            ]}
            imageStyle={{ borderRadius: radius.lg }}
          >
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: 'rgba(0,0,0,.25)' },
              ]}
            />
            <Text style={styles.coverLabel}>
              {coverBusy ? 'Uploading…' : 'Tap to change cover'}
            </Text>
          </ImageBackground>
        ) : (
          <>
            <View style={styles.coverOrb} />
            <View style={styles.coverOrbTwo} />
            <Text style={styles.coverLabel}>
              {isSelf
                ? coverBusy
                  ? 'Uploading cover…'
                  : 'Tap to add a cover photo'
                : 'CONNECTLY MEMBER'}
            </Text>
          </>
        )}
      </Pressable>
      <View style={styles.header}>
        <Pressable
          onPress={isSelf ? () => void changePhoto() : undefined}
          disabled={!isSelf || photoBusy}
        >
          <Avatar initials={initials} size={88} avatarUrl={profile.avatarUrl} />
          {isSelf ? (
            <View style={styles.camera}>
              <Text style={styles.cameraText}>{photoBusy ? '…' : '＋'}</Text>
            </View>
          ) : null}
        </Pressable>
        {isSelf ? (
          <Pressable
            style={styles.edit}
            onPress={() => {
              setName(profile.name);
              setBio(profile.bio ?? '');
              setEditing(true);
            }}
          >
            <Text style={styles.editText}>Edit profile</Text>
          </Pressable>
        ) : (
          <Pressable
            style={[
              styles.followButton,
              ((profile.accountType === 'page' && profile.isFollowing) || (profile.accountType !== 'page' && profile.friendStatus === 'accepted')) && styles.followingButton,
            ]}
            onPress={() => void toggleFollow()}
          >
            <Text
              style={[
                styles.followText,
                ((profile.accountType === 'page' && profile.isFollowing) || (profile.accountType !== 'page' && profile.friendStatus === 'accepted')) && styles.followingText,
              ]}
            >
              {followBusy ? '…' : profile.accountType === 'page' ? (profile.isFollowing ? 'Following' : 'Follow Page') : profile.friendStatus === 'accepted' ? 'Friends' : profile.friendStatus === 'pending' ? 'Request sent' : 'Add friend'}
            </Text>
          </Pressable>
        )}
      </View>
      <View
        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}
      >
        <Text style={styles.name}>{profile.name}</Text>
        {profile.accountType === 'page' ? <View style={styles.pageBadge}><Text style={styles.pageBadgeText}>PAGE</Text></View> : null}
        {profile.isVerified ? (
          <View
            style={{
              width: 20,
              height: 20,
              borderRadius: 10,
              backgroundColor: colors.blue,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '900' }}>
              ✓
            </Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.username}>
        @{profile.username}
        {profile.privateAccount ? (
          <Text style={{ color: colors.muted }}> · Private account</Text>
        ) : null}
      </Text>
      <Text style={styles.bio}>
        {profile.bio || 'A new connection on Connectly.'}
      </Text>
      {profile.website ? (
        <Text
          style={{
            color: colors.blue,
            fontSize: 12,
            fontWeight: '700',
            marginTop: spacing.xs,
          }}
        >
          ↗ {profile.website}
        </Text>
      ) : null}
      {profile.location ? (
        <Text
          style={{ color: colors.muted, fontSize: 12, marginTop: spacing.xs }}
        >
          ⌖ {profile.location}
        </Text>
      ) : null}
      {(profile.country || profile.education || profile.maritalStatus) ? (
        <View style={styles.detailsCard}>
          {profile.country ? <Text style={styles.detailItem}>🌐 {profile.country}</Text> : null}
          {profile.education ? <Text style={styles.detailItem}>🎓 {profile.education}</Text> : null}
          {profile.maritalStatus ? <Text style={styles.detailItem}>♡ {profile.maritalStatus}</Text> : null}
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.number}>{profile.followersCount}</Text>
          <Text style={styles.label}>Followers</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.number}>{profile.followingCount}</Text>
          <Text style={styles.label}>Following</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.number}>{profile.postCount}</Text>
          <Text style={styles.label}>Posts</Text>
        </View>
      </View>
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: colors.surfaceAlt,
          borderRadius: radius.md,
          padding: 3,
          marginBottom: spacing.lg,
        }}
      >
        {(['posts', 'reels', 'media', 'tagged'] as const).map(tab => (
          <Pressable
            key={tab}
            onPress={() => setProfileTab(tab)}
            style={{
              flex: 1,
              alignItems: 'center',
              paddingVertical: spacing.sm,
              borderRadius: radius.sm,
              backgroundColor: profileTab === tab ? colors.surface : undefined,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: '900',
                color: profileTab === tab ? colors.blue : colors.muted,
              }}
            >
              {tab[0].toUpperCase() + tab.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.sectionHeader}>
        <Text style={styles.section}>
          {profileTab === 'posts'
            ? isSelf
              ? 'Your posts'
              : `${profile.name.split(' ')[0]}'s posts`
            : profileTab[0].toUpperCase() + profileTab.slice(1)}
        </Text>
        <Text style={styles.public}>
          {profileTab === 'posts' ? `${posts.length} public` : 'Coming soon'}
        </Text>
      </View>
          {profileTab === 'posts' && !isSelf && profile.privateAccount ? (
            <View style={styles.privateNotice}>
              <Text style={styles.privateNoticeIcon}>⌑</Text>
              <Text style={styles.emptyTitle}>This account is private</Text>
              <Text style={styles.emptyText}>Only the account owner can see these posts.</Text>
            </View>
          ) : profileTab === 'posts' && posts.length ? (
        posts.map(post => (
          <PostCard
            key={post.id}
            post={post}
            accessToken={accessToken}
            canDelete={isSelf}
            onHidden={id =>
              setPosts(current => current.filter(item => item.id !== id))
            }
            onEdited={() => void load()}
          />
        ))
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>
            {profileTab === 'reels' ? '▶' : profileTab === 'media' ? '▦' : '♧'}
          </Text>
          <Text style={styles.emptyTitle}>
            {profileTab === 'posts'
              ? isSelf
                ? 'Share your first update'
                : profile.privateAccount ? 'This account is private' : 'No public posts yet'
              : `No ${profileTab} yet`}
          </Text>
          <Text style={styles.cardMeta}>
            {profileTab === 'posts'
              ? isSelf
                ? 'Your posts, photos and videos will appear here.'
                : 'This user has not shared any public posts yet.'
              : 'This section will appear here as content is added.'}
          </Text>
        </View>
      )}
      {isSelf ? (
        <View style={styles.card}>
          <View style={[styles.cardIcon, { backgroundColor: colors.mint }]}>
            <Text>✉</Text>
          </View>
          <View>
            <Text style={styles.cardTitle}>Account email</Text>
            <Text style={styles.cardMeta}>{profile.email ?? user.email}</Text>
          </View>
        </View>
      ) : null}
      <Modal
        visible={profileSetupVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setProfileSetupVisible(false)}
      >
        <View style={styles.tutorialBackdrop}>
          <View style={styles.tutorialCard}>
            <View style={styles.tutorialIcon}><Text style={styles.tutorialIconText}>✦</Text></View>
            <Text style={styles.tutorialEyebrow}>MAKE IT YOURS</Text>
            <Text style={styles.tutorialTitle}>Complete your profile</Text>
            <Text style={styles.tutorialCopy}>
              Help people discover the real you. Add a short bio, your city, and country to make your profile feel complete.
            </Text>
            <View style={styles.tutorialChecklist}>
              <View style={styles.tutorialItem}><Text style={styles.tutorialCheck}>✓</Text><Text style={styles.tutorialItemText}>Tell people about yourself</Text></View>
              <View style={styles.tutorialItem}><Text style={styles.tutorialCheck}>✓</Text><Text style={styles.tutorialItemText}>Show your city and country</Text></View>
              <View style={styles.tutorialItem}><Text style={styles.tutorialCheck}>✓</Text><Text style={styles.tutorialItemText}>Control privacy anytime</Text></View>
            </View>
            <Pressable
              style={styles.tutorialButton}
              onPress={() => {
                setProfileSetupVisible(false);
                setEditing(true);
              }}
            >
              <Text style={styles.tutorialButtonText}>Add profile details</Text>
            </Pressable>
            <Pressable onPress={() => setProfileSetupVisible(false)} style={styles.tutorialSkip}>
              <Text style={styles.tutorialSkipText}>I’ll do this later</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <Modal
        visible={editing}
        transparent
        animationType="slide"
        onRequestClose={() => setEditing(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={styles.dismiss} onPress={() => setEditing(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Edit profile</Text>
                <Text style={styles.sheetSubtitle}>
                  Keep your profile up to date
                </Text>
              </View>
              <Pressable onPress={() => setEditing(false)}>
                <Text style={styles.close}>×</Text>
              </Pressable>
            </View>
            <Text style={styles.inputLabel}>Display name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              style={styles.input}
              placeholder="Your name"
              placeholderTextColor={colors.muted}
            />
            <Text style={styles.inputLabel}>Bio</Text>
            <TextInput
              value={bio}
              onChangeText={setBio}
              style={[styles.input, styles.bioInput]}
              placeholder="Tell people about yourself"
              placeholderTextColor={colors.muted}
              multiline
              maxLength={280}
            />
            <View style={styles.fieldGrid}>
              <View style={styles.fieldHalf}><Text style={styles.inputLabel}>Country</Text><TextInput value={country} onChangeText={setCountry} style={styles.input} placeholder="e.g. Pakistan" placeholderTextColor={colors.muted} /></View>
              <View style={styles.fieldHalf}><Text style={styles.inputLabel}>Location</Text><TextInput value={location} onChangeText={setLocation} style={styles.input} placeholder="City" placeholderTextColor={colors.muted} /></View>
            </View>
            <Text style={styles.inputLabel}>Education</Text>
            <TextInput value={education} onChangeText={setEducation} style={styles.input} placeholder="School or university" placeholderTextColor={colors.muted} />
            <Text style={styles.inputLabel}>Marital status</Text>
            <TextInput value={maritalStatus} onChangeText={setMaritalStatus} style={styles.input} placeholder="Optional" placeholderTextColor={colors.muted} />
            <Pressable style={styles.privacyRow} onPress={() => setPrivateAccount(value => !value)}><View><Text style={styles.privacyTitle}>Private account</Text><Text style={styles.privacyHint}>Only you can show your profile posts to visitors.</Text></View><Text style={styles.privacyValue}>{privateAccount ? 'ON' : 'OFF'}</Text></Pressable>
            <Pressable
              style={styles.saveButton}
              onPress={() => void saveProfile()}
              disabled={saving || !name.trim()}
            >
              <Text style={styles.saveText}>
                {saving ? 'Saving…' : 'Save changes'}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: spacing.md, paddingBottom: 132 },
  loading: {
    flex: 1,
    backgroundColor: colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    color: colors.muted,
    fontSize: 13,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  retry: { color: colors.blue, fontWeight: '900', marginTop: spacing.md },
  error: { color: colors.danger, fontSize: 12, marginTop: spacing.sm },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  topTitle: { fontSize: 22, fontWeight: '900', color: colors.ink, letterSpacing: -0.5 },
  circle: {
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
  circleSpacer: { width: 44 },
  backText: { fontSize: 30, color: colors.ink, lineHeight: 30 },
  settingsIcon: { fontSize: 20, color: colors.muted },
  cover: {
    height: 170,
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: colors.ink,
    position: 'relative',
    justifyContent: 'flex-end',
    padding: spacing.md,
    ...shadow,
  },
  coverLabel: {
    color: 'rgba(255,255,255,.72)',
    fontWeight: '900',
    fontSize: 10,
    letterSpacing: 1.5,
  },
  coverOrb: {
    position: 'absolute',
    width: 230,
    height: 230,
    borderRadius: 115,
    right: -55,
    top: -70,
    backgroundColor: 'rgba(91,92,226,.82)',
  },
  coverOrbTwo: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    left: -35,
    bottom: -60,
    backgroundColor: 'rgba(255,255,255,.12)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: -48,
    paddingHorizontal: spacing.sm,
  },
  camera: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  cameraText: { color: '#fff', fontSize: 18, fontWeight: '900' },
  edit: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...shadow,
  },
  editText: { color: colors.blue, fontWeight: '900', fontSize: 12 },
  followButton: {
    backgroundColor: colors.blue,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    ...shadow,
  },
  followingButton: { backgroundColor: colors.blueSoft },
  followText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  followingText: { color: colors.blue },
  name: {
    fontSize: 31,
    fontWeight: '900',
    color: colors.ink,
    marginTop: spacing.md,
    letterSpacing: -1,
  },
  pageBadge: { backgroundColor: colors.blueSoft, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 4, marginLeft: spacing.sm, alignSelf: 'center' },
  pageBadgeText: { color: colors.blue, fontSize: 9, fontWeight: '900', letterSpacing: 0.7 },
  username: { color: colors.blue, fontWeight: '800', fontSize: 14, marginTop: 4 },
  bio: { color: colors.muted, lineHeight: 22, fontSize: 14, marginTop: spacing.md },
  detailsCard: { backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginTop: spacing.lg, ...shadow },
  detailItem: { color: colors.inkLight, fontSize: 13, marginVertical: 5, fontWeight: '600' },
  stats: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    marginVertical: spacing.xl,
    paddingVertical: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
  },
  stat: { alignItems: 'center', flex: 1 },
  number: { fontWeight: '900', fontSize: 23, color: colors.ink, letterSpacing: -0.5 },
  label: { color: colors.muted, fontSize: 11, marginTop: 5, fontWeight: '800' },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  section: { fontSize: 21, fontWeight: '900', color: colors.ink, letterSpacing: -0.5 },
  public: { fontSize: 11, color: colors.success, fontWeight: '900' },
  empty: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
  },
  privateNotice: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center', borderWidth: 1, borderColor: colors.border, marginTop: spacing.md, ...shadow },
  privateNoticeIcon: { fontSize: 34, color: colors.blue, marginBottom: spacing.sm },
  emptyIcon: { fontSize: 28, color: colors.blue },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.ink,
    marginTop: spacing.sm,
  },
  emptyText: { color: colors.muted, fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  cardTitle: { color: colors.ink, fontWeight: '900', fontSize: 13 },
  cardMeta: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  tutorialBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,.58)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  tutorialCard: {
    width: '100%',
    maxWidth: 390,
    backgroundColor: colors.surface,
    borderRadius: 28,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadow,
  },
  tutorialIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  tutorialIconText: { color: '#fff', fontSize: 27, fontWeight: '900' },
  tutorialEyebrow: { color: colors.blue, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  tutorialTitle: { color: colors.ink, fontSize: 25, fontWeight: '900', letterSpacing: -0.6, marginTop: spacing.xs },
  tutorialCopy: { color: colors.muted, fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: spacing.sm },
  tutorialChecklist: { width: '100%', backgroundColor: colors.canvas, borderRadius: 18, padding: spacing.md, marginTop: spacing.lg },
  tutorialItem: { flexDirection: 'row', alignItems: 'center', marginVertical: 5 },
  tutorialCheck: { width: 21, height: 21, borderRadius: 11, backgroundColor: colors.mint, color: colors.success, textAlign: 'center', lineHeight: 21, fontSize: 12, fontWeight: '900', marginRight: spacing.sm },
  tutorialItemText: { color: colors.inkLight, fontSize: 12, fontWeight: '700' },
  tutorialButton: { width: '100%', backgroundColor: colors.blue, borderRadius: radius.pill, alignItems: 'center', paddingVertical: spacing.md, marginTop: spacing.lg },
  tutorialButtonText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  tutorialSkip: { padding: spacing.sm, marginTop: spacing.xs },
  tutorialSkipText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15,23,42,.45)',
  },
  dismiss: { flex: 1 },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: spacing.md,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  sheetTitle: { fontSize: 22, fontWeight: '900', color: colors.ink },
  sheetSubtitle: { fontSize: 12, color: colors.muted, marginTop: 3 },
  close: { fontSize: 30, color: colors.muted },
  inputLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.ink,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.ink,
    fontSize: 15,
    backgroundColor: colors.canvas,
  },
  bioInput: { minHeight: 92, textAlignVertical: 'top' },
  fieldGrid: { flexDirection: 'row', gap: spacing.sm },
  fieldHalf: { flex: 1 },
  privacyRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.blueSoft, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.lg },
  privacyTitle: { color: colors.ink, fontSize: 12, fontWeight: '900' },
  privacyHint: { color: colors.muted, fontSize: 10, marginTop: 3, maxWidth: 250 },
  privacyValue: { color: colors.blue, fontSize: 11, fontWeight: '900', marginLeft: 'auto' },
  saveButton: {
    backgroundColor: colors.blue,
    borderRadius: radius.pill,
    alignItems: 'center',
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  saveText: { color: '#fff', fontWeight: '900', fontSize: 14 },
});
