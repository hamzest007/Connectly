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
import { ActionModal } from '../../components/common/ActionModal';

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
  isSelf?: boolean;
  accountType?: 'user' | 'page';
  pageEnabled?: boolean;
  pageName?: string;
  pageUsername?: string;
  pageCategory?: string;
  pageWebsite?: string;
  pageEmail?: string;
  pagePhone?: string;
  pageLocation?: string;
  pageCountry?: string;
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
  audience?: Post['audience']; location?: string; hashtags?: string[]; accessibilityText?: string; contentWarning?: string; interactive?: Post['interactive'];
  poll?: { question?: string; options?: { _id: string; label: string; votes?: number }[]; endsAt?: string };
  media?: Post['media'];
  isReel?: boolean;
  authorId: { _id: string; name: string; username: string; avatarUrl?: string };
};
type PageDashboard = {page:{name:string;username:string;active:boolean};followers:number;engagement:{posts:number;likes:number;comments:number;shares:number;views:number;reach:number};monetization:{enabled:boolean;tipsEnabled:boolean;subscriptionsEnabled:boolean};followerGrowth:Array<{_id:string;count:number}>;topPosts:Array<{_id:string;body:string;reactionCount:number;commentCount:number;shareCount:number;viewCount:number}>;followerList:Array<{followerId:{name:string;username:string;avatarUrl?:string;accountType?:'user'|'page'}}>};
type ProfileFriend = {_id:string;name:string;username:string;avatarUrl?:string;accountType?:'user'|'page'};

export function ProfileScreen({
  onSettings,
  onBack,
  accessToken,
  user,
  profileUser,
  onAccountUpdated,
}: {
  onSettings: () => void;
  onBack?: () => void;
  accessToken: string;
  user: User;
  profileUser?: { name: string; username: string };
  onAccountUpdated?: (account: {name:string;username:string;avatarUrl?:string}) => void;
}) {
  const [isSelf, setIsSelf] = React.useState(!profileUser);
  const [activeUsername, setActiveUsername] = React.useState(profileUser?.username ?? user.username);
  const username = activeUsername;
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
  const [pageModalVisible, setPageModalVisible] = React.useState(false);
  const [profileActionsVisible, setProfileActionsVisible] = React.useState(false);
  const [pageName, setPageName] = React.useState('');
  const [pageUsername, setPageUsername] = React.useState('');
  const [pageBio, setPageBio] = React.useState('');
  const [pageCategory, setPageCategory] = React.useState('');
  const [pageWebsite, setPageWebsite] = React.useState('');
  const [pageEmail, setPageEmail] = React.useState('');
  const [pagePhone, setPagePhone] = React.useState('');
  const [pageLocation, setPageLocation] = React.useState('');
  const [pageCountry, setPageCountry] = React.useState('');
  const [pageBusy, setPageBusy] = React.useState(false);
  const [pageDashboardVisible, setPageDashboardVisible] = React.useState(false);
  const [pageDashboard, setPageDashboard] = React.useState<PageDashboard | null>(null);
  const [name, setName] = React.useState('');
  const [bio, setBio] = React.useState('');
  const [privateAccount, setPrivateAccount] = React.useState(false);
  const [country, setCountry] = React.useState('');
  const [education, setEducation] = React.useState('');
  const [maritalStatus, setMaritalStatus] = React.useState('');
  const [location, setLocation] = React.useState('');
  const [error, setError] = React.useState('');
  const [friends, setFriends] = React.useState<ProfileFriend[]>([]);
  const profileUsername = profileUser?.username;
  React.useEffect(() => {
    setActiveUsername(profileUsername ?? user.username);
    setIsSelf(!profileUsername);
  }, [profileUsername, user.username]);
  const load = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const basic = await apiRequest<ProfileData | null>(
        isSelf ? '/users/me' : `/users/${encodeURIComponent(username)}`,
        {},
        accessToken,
      );
      if (!basic) throw new Error('This profile is no longer available.');
      const data = isSelf ? await apiRequest<ProfileData>(`/users/${encodeURIComponent(basic.username)}`, {}, accessToken) : basic;
      const items = await apiRequest<ProfilePost[]>(
        `/users/${encodeURIComponent(data.username)}/posts`,
        {},
        accessToken,
      );
      setProfile(data);
      setIsSelf(Boolean(data.isSelf ?? isSelf));
      const friendItems = await apiRequest<ProfileFriend[]>(
        `/users/${encodeURIComponent(data.username)}/friends`,
        {},
        accessToken,
      ).catch(() => []);
      setFriends(friendItems);
      if (isSelf) setActiveUsername(data.username);
      setName(data.name);
      setBio(data.bio ?? '');
      setPrivateAccount(Boolean(data.privateAccount));
      setCountry(data.country ?? '');
      setEducation(data.education ?? '');
      setMaritalStatus(data.maritalStatus ?? '');
      setLocation(data.location ?? '');
      setPageName(data.pageName ?? '');
      setPageUsername(data.pageUsername ?? '');
      setPageCategory(data.pageCategory ?? ''); setPageWebsite(data.pageWebsite ?? ''); setPageEmail(data.pageEmail ?? ''); setPagePhone(data.pagePhone ?? ''); setPageLocation(data.pageLocation ?? ''); setPageCountry(data.pageCountry ?? '');
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
          audience: item.audience, location: item.location, hashtags: item.hashtags, accessibilityText: item.accessibilityText, contentWarning: item.contentWarning, interactive: item.interactive,
          poll: item.poll?.question && item.poll.options?.length ? { question: item.poll.question, options: item.poll.options.map(option => ({ _id: option._id, label: option.label, votes: option.votes ?? 0 })), endsAt: item.poll.endsAt } : undefined,
          media: item.media,
          isReel: item.isReel,
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
  }, [accessToken, isSelf, username]);
  React.useEffect(() => {
    void load();
  }, [load]);
  const visiblePosts = profileTab === 'reels' ? posts.filter(post => post.isReel) : profileTab === 'media' ? posts.filter(post => Boolean(post.media?.length)) : profileTab === 'posts' ? posts.filter(post => !post.isReel) : [];
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
  const createPage = async () => {
    if (pageBusy || !pageName.trim() || !pageUsername.trim()) return;
    setPageBusy(true); setError('');
    try {
      const updated = await apiRequest<ProfileData>('/users/me/page', {method:'POST', body:JSON.stringify({name:pageName.trim(),username:pageUsername.trim().toLowerCase(),bio:pageBio.trim(),category:pageCategory.trim(),website:pageWebsite.trim(),email:pageEmail.trim(),phone:pagePhone.trim(),location:pageLocation.trim(),country:pageCountry.trim()})}, accessToken);
      setProfile(current => current ? {...current,...updated} : current);
      setPageModalVisible(false);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to create your Page.'); }
    finally { setPageBusy(false); }
  };
  const switchPageMode = async () => {
    if (!profile?.pageEnabled || pageBusy) return;
    setPageBusy(true); setError('');
    try {
      const mode=profile.accountType==='page'?'personal':'page';
      const updated=await apiRequest<ProfileData>('/users/me/page-mode',{method:'PATCH',body:JSON.stringify({mode})},accessToken);
      setProfile(current=>current?{...current,...updated}:current);
      setName(updated.name); setBio(updated.bio??'');
      setActiveUsername(updated.username);
      onAccountUpdated?.({name:updated.name,username:updated.username,avatarUrl:updated.avatarUrl});
    } catch(e) { setError(e instanceof Error ? e.message : 'Unable to switch account mode.'); }
    finally { setPageBusy(false); }
  };
  const openPageDashboard = async () => {
    if (pageBusy) return;
    setPageBusy(true); setError('');
    try { setPageDashboard(await apiRequest<PageDashboard>('/users/me/page-dashboard', {}, accessToken)); setPageDashboardVisible(true); }
    catch(e) { setError(e instanceof Error ? e.message : 'Unable to load Page dashboard.'); }
    finally { setPageBusy(false); }
  };
  const updateMonetization = async (key:'enabled'|'tipsEnabled'|'subscriptionsEnabled') => {
    if (!pageDashboard) return;
    const next=!pageDashboard.monetization[key];
    try { const updated=await apiRequest<PageDashboard['monetization']>('/users/me/monetization',{method:'PATCH',body:JSON.stringify({[key]:next})},accessToken); setPageDashboard(current=>current?{...current,monetization:updated}:current); }
    catch(e) { setError(e instanceof Error ? e.message : 'Unable to update monetization.'); }
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
  const reportProfile = async () => {
    if (!profile || isSelf) return;
    try {
      await apiRequest('/reports', {method: 'POST', body: JSON.stringify({targetType: profile.accountType === 'page' ? 'page' : 'user', targetId: profile._id, reason: 'Inappropriate or abusive profile'})}, accessToken);
      Alert.alert('Report submitted', 'Thanks for helping keep Connectly safe.');
    } catch (e) {
      Alert.alert('Unable to report', e instanceof Error ? e.message : 'Please try again later.');
    }
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
              : () => setProfileActionsVisible(true)
          }
          style={styles.circle}
        >
          <Text style={styles.settingsIcon}>{isSelf ? '⚙' : '•••'}</Text>
        </Pressable>
      </View>
      <ActionModal
        visible={profileActionsVisible}
        title="Profile actions"
        subtitle={`Choose how you want to manage @${profile.username}`}
        onClose={() => setProfileActionsVisible(false)}
        actions={[
          { label: 'Report profile', icon: '⚑', onPress: () => void reportProfile() },
          { label: 'Mute', icon: '◌', onPress: () => safetyAction('mute') },
          { label: 'Restrict', icon: '⊘', onPress: () => safetyAction('restrict') },
          { label: 'Block', icon: '!', destructive: true, onPress: () => safetyAction('block') },
        ]}
      />
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
      {isSelf ? (
        <Pressable style={styles.pageSwitchCard} onPress={() => profile.pageEnabled ? void switchPageMode() : setPageModalVisible(true)} disabled={pageBusy}>
          <View style={styles.pageSwitchIcon}><Avatar initials={initials} avatarUrl={profile.avatarUrl} size={42} /></View>
          <View style={styles.pageSwitchCopy}><Text style={styles.pageSwitchTitle}>{profile.pageEnabled ? (profile.accountType === 'page' ? 'Switch to personal profile' : `Switch to ${profile.pageName || 'your Page'}`) : 'Create a Page'}</Text><Text style={styles.pageSwitchHint}>{profile.pageEnabled ? 'Change your active identity anytime' : 'Build a public presence for your brand or community'}</Text></View>
          <Text style={styles.pageSwitchArrow}>{pageBusy ? '…' : '›'}</Text>
        </Pressable>
      ) : null}
      {isSelf && profile.pageEnabled ? <Pressable style={styles.dashboardCard} onPress={() => void openPageDashboard()} disabled={pageBusy}><View><Text style={styles.dashboardEyebrow}>PAGE TOOLS</Text><Text style={styles.dashboardTitle}>Page dashboard</Text><Text style={styles.dashboardHint}>Engagement, followers and monetization</Text></View><Text style={styles.pageSwitchArrow}>{pageBusy ? '…' : '›'}</Text></Pressable> : null}
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
      {(profile.accountType === 'page' ? profile.pageWebsite : profile.website) ? (
        <Text
          style={{
            color: colors.blue,
            fontSize: 12,
            fontWeight: '700',
            marginTop: spacing.xs,
          }}
        >
          ↗ {profile.accountType === 'page' ? profile.pageWebsite : profile.website}
        </Text>
      ) : null}
      {(profile.accountType === 'page' ? profile.pageLocation : profile.location) ? (
        <Text
          style={{ color: colors.muted, fontSize: 12, marginTop: spacing.xs }}
        >
          ⌖ {profile.accountType === 'page' ? profile.pageLocation : profile.location}
        </Text>
      ) : null}
      {(profile.accountType === 'page' ? (profile.pageCategory || profile.pageCountry || profile.pageEmail || profile.pagePhone) : (profile.country || profile.education || profile.maritalStatus)) ? (
        <View style={styles.detailsCard}>
          {profile.accountType === 'page' ? <>{profile.pageCategory ? <Text style={styles.detailItem}>✦ {profile.pageCategory}</Text> : null}{profile.pageCountry ? <Text style={styles.detailItem}>🌐 {profile.pageCountry}</Text> : null}{profile.pageEmail ? <Text style={styles.detailItem}>✉ {profile.pageEmail}</Text> : null}{profile.pagePhone ? <Text style={styles.detailItem}>⌕ {profile.pagePhone}</Text> : null}</> : <>{profile.country ? <Text style={styles.detailItem}>🌐 {profile.country}</Text> : null}{profile.education ? <Text style={styles.detailItem}>🎓 {profile.education}</Text> : null}{profile.maritalStatus ? <Text style={styles.detailItem}>♡ {profile.maritalStatus}</Text> : null}</>}
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
      {(!profile.privateAccount || isSelf) && profile.accountType !== 'page' ? (
        <View style={styles.friendsCard}>
          <View style={styles.friendsHeader}><Text style={styles.friendsTitle}>Friends</Text><Text style={styles.friendsCount}>{friends.length}</Text></View>
          {friends.length ? <View style={styles.friendsGrid}>{friends.slice(0, 6).map(friend => <View style={styles.friendTile} key={friend._id}><Avatar initials={friend.name.split(' ').map(part => part[0]).join('').slice(0, 2)} avatarUrl={friend.avatarUrl} size={38} /><Text style={styles.friendName} numberOfLines={1}>{friend.name}</Text><Text style={styles.friendUsername} numberOfLines={1}>@{friend.username}</Text></View>)}</View> : <Text style={styles.friendsEmpty}>No friends to show yet.</Text>}
        </View>
      ) : null}
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
          {profileTab === 'tagged' ? 'Coming soon' : `${visiblePosts.length} ${profileTab === 'media' ? 'media' : profileTab === 'reels' ? 'reels' : 'public'}`}
        </Text>
      </View>
          {profileTab === 'posts' && !isSelf && profile.privateAccount ? (
            <View style={styles.privateNotice}>
              <Text style={styles.privateNoticeIcon}>⌑</Text>
              <Text style={styles.emptyTitle}>This account is private</Text>
              <Text style={styles.emptyText}>Only the account owner can see these posts.</Text>
            </View>
          ) : profileTab !== 'tagged' && visiblePosts.length ? (
        visiblePosts.map(post => (
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
      <Modal visible={pageModalVisible} transparent animationType="slide" onRequestClose={() => setPageModalVisible(false)}>
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={styles.dismiss} onPress={() => setPageModalVisible(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}><View><Text style={styles.sheetTitle}>Create a Page</Text><Text style={styles.sheetSubtitle}>Give your public presence its own identity.</Text></View><Pressable onPress={() => setPageModalVisible(false)}><Text style={styles.close}>×</Text></Pressable></View>
            <Text style={styles.inputLabel}>Page name</Text>
            <TextInput value={pageName} onChangeText={setPageName} style={styles.input} placeholder="e.g. Connectly Community" placeholderTextColor={colors.muted} />
            <Text style={styles.inputLabel}>Page username</Text>
            <TextInput value={pageUsername} onChangeText={setPageUsername} autoCapitalize="none" style={styles.input} placeholder="e.g. connectlycommunity" placeholderTextColor={colors.muted} />
            <Text style={styles.inputLabel}>About your Page</Text>
            <TextInput value={pageBio} onChangeText={setPageBio} style={[styles.input, styles.bioInput]} multiline maxLength={280} placeholder="What is your Page about?" placeholderTextColor={colors.muted} />
            <Text style={styles.inputLabel}>Category</Text><TextInput value={pageCategory} onChangeText={setPageCategory} style={styles.input} placeholder="e.g. Community, Business, Creator" placeholderTextColor={colors.muted} />
            <View style={styles.fieldGrid}><View style={styles.fieldHalf}><Text style={styles.inputLabel}>City</Text><TextInput value={pageLocation} onChangeText={setPageLocation} style={styles.input} placeholder="City" placeholderTextColor={colors.muted} /></View><View style={styles.fieldHalf}><Text style={styles.inputLabel}>Country</Text><TextInput value={pageCountry} onChangeText={setPageCountry} style={styles.input} placeholder="Country" placeholderTextColor={colors.muted} /></View></View>
            <Text style={styles.inputLabel}>Website</Text><TextInput value={pageWebsite} onChangeText={setPageWebsite} style={styles.input} placeholder="https://yourpage.com" placeholderTextColor={colors.muted} autoCapitalize="none" />
            <View style={styles.fieldGrid}><View style={styles.fieldHalf}><Text style={styles.inputLabel}>Page email</Text><TextInput value={pageEmail} onChangeText={setPageEmail} style={styles.input} placeholder="hello@example.com" placeholderTextColor={colors.muted} autoCapitalize="none" keyboardType="email-address" /></View><View style={styles.fieldHalf}><Text style={styles.inputLabel}>Phone</Text><TextInput value={pagePhone} onChangeText={setPagePhone} style={styles.input} placeholder="Optional" placeholderTextColor={colors.muted} keyboardType="phone-pad" /></View></View>
            <Pressable style={styles.saveButton} onPress={() => void createPage()} disabled={pageBusy || !pageName.trim() || !pageUsername.trim()}><Text style={styles.saveText}>{pageBusy ? 'Creating…' : 'Create Page'}</Text></Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <Modal visible={pageDashboardVisible} transparent animationType="slide" onRequestClose={() => setPageDashboardVisible(false)}>
        <View style={styles.modalBackdrop}><Pressable style={styles.dismiss} onPress={() => setPageDashboardVisible(false)} /><View style={styles.dashboardSheet}><View style={styles.sheetHandle} /><View style={styles.sheetHeader}><View><Text style={styles.sheetTitle}>Page dashboard</Text><Text style={styles.sheetSubtitle}>{pageDashboard?.page.name} · @{pageDashboard?.page.username}</Text></View><Pressable onPress={() => setPageDashboardVisible(false)}><Text style={styles.close}>×</Text></Pressable></View>
          <View style={styles.metricGrid}>{[['Followers',pageDashboard?.followers??0],['Posts',pageDashboard?.engagement.posts??0],['Views',pageDashboard?.engagement.views??0],['Reach',pageDashboard?.engagement.reach??0],['Likes',pageDashboard?.engagement.likes??0],['Comments',pageDashboard?.engagement.comments??0]].map(([label,value])=><View style={styles.metricCard} key={String(label)}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>)}</View>
          <Text style={styles.dashboardSectionTitle}>Monetization</Text>
          {(['enabled','tipsEnabled','subscriptionsEnabled'] as const).map(key=><Pressable key={key} style={styles.monetizationRow} onPress={() => void updateMonetization(key)}><View><Text style={styles.monetizationTitle}>{key==='enabled'?'Monetization status':key==='tipsEnabled'?'Tips':'Subscriptions'}</Text><Text style={styles.monetizationHint}>{pageDashboard?.monetization[key]?'Enabled':'Not enabled'}</Text></View><Text style={[styles.monetizationValue,pageDashboard?.monetization[key]&&styles.monetizationOn]}>{pageDashboard?.monetization[key]?'ON':'OFF'}</Text></Pressable>)}
          <Text style={styles.dashboardSectionTitle}>Follower growth · 7 days</Text>
          <View style={styles.growthRow}>{(pageDashboard?.followerGrowth??[]).length ? pageDashboard?.followerGrowth.map(day=><View style={styles.growthBarWrap} key={day._id}><View style={[styles.growthBar,{height:Math.max(8,Math.min(70,day.count*12))}]} /><Text style={styles.growthLabel}>{day._id.slice(5)}</Text></View>) : <Text style={styles.monetizationHint}>No new followers in the last 7 days.</Text>}</View>
          <Text style={styles.dashboardSectionTitle}>Top recent content</Text>
          {(pageDashboard?.topPosts??[]).length ? pageDashboard?.topPosts.map(post=><View style={styles.topPostRow} key={post._id}><Text numberOfLines={1} style={styles.topPostBody}>{post.body||'Media post'}</Text><Text style={styles.topPostStats}>{post.reactionCount} likes · {post.commentCount} comments · {post.viewCount} views</Text></View>) : <Text style={styles.monetizationHint}>Publish content to see performance here.</Text>}
          <Text style={styles.dashboardSectionTitle}>Followers</Text>
          {(pageDashboard?.followerList??[]).length ? pageDashboard?.followerList.slice(0,10).map(item=><View style={styles.followerRow} key={item.followerId.username}><Avatar initials={item.followerId.name.split(' ').map(part=>part[0]).join('').slice(0,2)} avatarUrl={item.followerId.avatarUrl} size={34}/><View style={styles.followerCopy}><Text style={styles.followerName}>{item.followerId.name}</Text><Text style={styles.followerUsername}>@{item.followerId.username}</Text></View><Text style={styles.followerType}>{item.followerId.accountType==='page'?'Page':'Follower'}</Text></View>) : <Text style={styles.monetizationHint}>0 followers</Text>}
        </View></View>
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
  pageSwitchCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.ink, borderRadius: 20, padding: spacing.sm, marginTop: spacing.lg, ...shadow },
  pageSwitchIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  pageSwitchIconText: { color: '#fff', fontSize: 22, fontWeight: '900' },
  pageSwitchCopy: { flex: 1, marginLeft: spacing.sm },
  pageSwitchTitle: { color: '#fff', fontSize: 13, fontWeight: '900' },
  pageSwitchHint: { color: 'rgba(255,255,255,.64)', fontSize: 10, marginTop: 3 },
  pageSwitchArrow: { color: '#fff', fontSize: 28, marginHorizontal: spacing.xs },
  dashboardCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.blueSoft, borderRadius: 20, padding: spacing.md, marginTop: spacing.sm },
  dashboardEyebrow: { color: colors.blue, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  dashboardTitle: { color: colors.ink, fontSize: 15, fontWeight: '900', marginTop: 3 },
  dashboardHint: { color: colors.muted, fontSize: 11, marginTop: 3 },
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
  dashboardSheet: { backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: spacing.md, maxHeight: '82%' },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  metricCard: { width: '31.5%', minHeight: 72, backgroundColor: colors.canvas, borderRadius: 15, padding: spacing.sm, justifyContent: 'center' },
  metricValue: { color: colors.ink, fontSize: 20, fontWeight: '900' },
  metricLabel: { color: colors.muted, fontSize: 10, fontWeight: '700', marginTop: 3 },
  dashboardSectionTitle: { color: colors.ink, fontSize: 16, fontWeight: '900', marginTop: spacing.lg, marginBottom: spacing.xs },
  monetizationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: spacing.sm },
  monetizationTitle: { color: colors.inkLight, fontSize: 13, fontWeight: '800' },
  monetizationHint: { color: colors.muted, fontSize: 11, marginTop: 2 },
  monetizationValue: { color: colors.muted, fontSize: 11, fontWeight: '900', paddingHorizontal: spacing.sm, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt },
  monetizationOn: { color: colors.success, backgroundColor: colors.mint },
  growthRow: { minHeight: 92, backgroundColor: colors.canvas, borderRadius: 16, padding: spacing.sm, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around' },
  growthBarWrap: { alignItems: 'center', justifyContent: 'flex-end', height: 82, flex: 1 },
  growthBar: { width: 13, minHeight: 8, borderRadius: 7, backgroundColor: colors.blue },
  growthLabel: { color: colors.muted, fontSize: 8, marginTop: 4 },
  topPostRow: { borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: spacing.sm },
  topPostBody: { color: colors.inkLight, fontSize: 12, fontWeight: '800' },
  topPostStats: { color: colors.muted, fontSize: 10, marginTop: 3 },
  followerRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: spacing.sm },
  followerCopy: { flex: 1, marginLeft: spacing.sm },
  followerName: { color: colors.inkLight, fontSize: 12, fontWeight: '800' },
  followerUsername: { color: colors.muted, fontSize: 10, marginTop: 2 },
  followerType: { color: colors.blue, fontSize: 10, fontWeight: '800' },
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
  friendsCard: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.lg, ...shadow },
  friendsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  friendsTitle: { color: colors.ink, fontSize: 18, fontWeight: '900' },
  friendsCount: { color: colors.blue, fontSize: 14, fontWeight: '900' },
  friendsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  friendTile: { width: '28%', alignItems: 'center' },
  friendName: { color: colors.ink, fontSize: 11, fontWeight: '800', marginTop: spacing.xs },
  friendUsername: { color: colors.muted, fontSize: 9, marginTop: 2 },
  friendsEmpty: { color: colors.muted, fontSize: 13 },
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
