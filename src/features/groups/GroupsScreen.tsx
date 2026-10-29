import React from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  Share,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { apiRequest } from '../../services/api/client';
import { pickMedia, uploadMedia } from '../../services/media/cloudinary';
import { colors, radius, shadow, spacing } from '../../theme/tokens';
type Group = {
  _id: string;
  name: string;
  description: string;
  visibility: string;
  memberCount: number;
  postApprovalRequired?: boolean;
  joinApprovalRequired?: boolean;
  rules?: string;
  coverUrl?: string;
};
type Channel = {_id: string; name: string; description?: string};
type Resource = {_id: string; title: string; url: string};
type GroupEvent = {_id: string; title: string; startsAt: string; isLiveQa?: boolean};
type Membership = { groupId: string; status: string; role?: string };
type GroupMember = {
  _id: string;
  userId: { _id: string; name: string; username: string; avatarUrl?: string } | null;
  role: 'admin' | 'moderator' | 'member';
  status: string;
};
type GroupPost = {
  _id: string;
  body: string;
  createdAt: string;
  authorId?: { name: string; username: string; avatarUrl?: string };
  reactionCount: number;
  commentCount: number;
  status?: string;
  media?: {url: string; type: 'image'|'video'}[];
  isAnnouncement?: boolean;
  poll?: {question?: string; options?: {label: string; votes?: number}[]};
};
export function GroupsScreen({
  accessToken,
  onBack,
  initialGroupId,
  onCreateGroup,
}: {
  accessToken: string;
  onBack: () => void;
  initialGroupId?: string;
  onCreateGroup?: () => void;
}) {
  const [groups, setGroups] = React.useState<Group[]>([]);
  const [members, setMembers] = React.useState<Membership[]>([]);
  const [selected, setSelected] = React.useState<Group | null>(null);
  const [posts, setPosts] = React.useState<GroupPost[]>([]);
  const [body, setBody] = React.useState('');
  const [query, setQuery] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [loadError, setLoadError] = React.useState('');
  const [listTab, setListTab] = React.useState<'discover'|'mine'|'invitations'>('discover');
  const [creating, setCreating] = React.useState(false);
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [approvalRequired, setApprovalRequired] = React.useState(false);
  const [visibility, setVisibility] = React.useState<'public'|'private'|'invite-only'>('public');
  const [rules, setRules] = React.useState('');
  const [coverUrl, setCoverUrl] = React.useState('');
  const [editingName, setEditingName] = React.useState('');
  const [editingCoverUrl, setEditingCoverUrl] = React.useState('');
  const [coverUploading, setCoverUploading] = React.useState(false);
  const [channels, setChannels] = React.useState<Channel[]>([]);
  const [resources, setResources] = React.useState<Resource[]>([]);
  const [events, setEvents] = React.useState<GroupEvent[]>([]);
  const [groupMembers, setGroupMembers] = React.useState<GroupMember[]>([]);
  const [activeTab, setActiveTab] = React.useState('Announcements');
  const initialGroupAttempt = React.useRef<string | undefined>(undefined);
  const load = React.useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await apiRequest<{
        groups: Group[];
        memberships: Membership[];
      }>(
        `/groups${query ? `?q=${encodeURIComponent(query)}` : ''}`,
        {},
        accessToken,
      );
      setGroups(data.groups);
      setMembers(data.memberships);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Unable to load groups.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, query]);
  React.useEffect(() => {
    void load();
  }, [load]);
  const open = async (group: Group) => {
    setSelected(group);
    setEditingName(group.name);
    setEditingCoverUrl(group.coverUrl ?? '');
    setActiveTab('Announcements');
    try {
      const nextMembers = await apiRequest<GroupMember[]>(`/groups/${group._id}/members`, {}, accessToken);
      setGroupMembers(nextMembers);
      const [nextPosts, nextChannels, nextResources, nextEvents] = await Promise.all([
        apiRequest<GroupPost[]>(`/groups/${group._id}/posts`, {}, accessToken),
        apiRequest<Channel[]>(`/groups/${group._id}/channels`, {}, accessToken),
        apiRequest<Resource[]>(`/groups/${group._id}/resources`, {}, accessToken),
        apiRequest<GroupEvent[]>(`/groups/${group._id}/events`, {}, accessToken),
      ]);
      setPosts(nextPosts); setChannels(nextChannels); setResources(nextResources); setEvents(nextEvents);
    } catch {
      try {
        const nextMembers = await apiRequest<GroupMember[]>(`/groups/${group._id}/members`, {}, accessToken);
        setGroupMembers(nextMembers);
      } catch { setGroupMembers([]); }
      setPosts([]);
    }
  };
  React.useEffect(() => {
    if (!initialGroupId || loading || selected || initialGroupAttempt.current === initialGroupId) return;
    initialGroupAttempt.current = initialGroupId;
    const group = groups.find(item => item._id === initialGroupId);
    if (group) void open(group);
    else void apiRequest<Group>(`/groups/${initialGroupId}`, {}, accessToken).then(nextGroup => {
      setGroups(value => value.some(item => item._id === nextGroup._id) ? value : [nextGroup, ...value]);
      void open(nextGroup);
    }).catch(() => undefined);
  }, [accessToken, groups, initialGroupId, loading, selected]);
  const join = async (group: Group) => {
    try {
      const result = await apiRequest<{ status: string }>(
        `/groups/${group._id}/join`,
        { method: 'POST' },
        accessToken,
      );
      setMembers(value => [
        ...value,
        { groupId: group._id, status: result.status },
      ]);
    } catch (e) {
      Alert.alert(
        'Unable to join',
        e instanceof Error ? e.message : 'Please try again.',
      );
    }
  };
  const publish = async () => {
    if (!selected || !body.trim()) return;
    try {
      const post = await apiRequest<GroupPost>(
        `/groups/${selected._id}/posts`,
        { method: 'POST', body: JSON.stringify({ body: body.trim() }) },
        accessToken,
      );
      setPosts(value => [post, ...value]);
      setBody('');
      if (post.status === 'pending') Alert.alert('Post submitted', 'A group admin must approve it before it appears.');
    } catch (e) {
      Alert.alert(
        'Unable to post',
        e instanceof Error ? e.message : 'Join the group first.',
      );
    }
  };
  const approve = async (postId: string, action: 'approve' | 'reject') => {
    if (!selected) return;
    try {
      await apiRequest(`/groups/${selected._id}/posts/${postId}/approval`, {method: 'PATCH', body: JSON.stringify({action})}, accessToken);
      setPosts(value => value.filter(post => post._id !== postId));
    } catch (e) {
      Alert.alert('Unable to update post', e instanceof Error ? e.message : 'Please try again.');
    }
  };
  const toggleApproval = async () => {
    if (!selected || !canApprove) return;
    try {
      const updated = await apiRequest<Group>(`/groups/${selected._id}/settings`, {method: 'PATCH', body: JSON.stringify({postApprovalRequired: !selected.postApprovalRequired})}, accessToken);
      setSelected(updated);
      setGroups(value => value.map(group => group._id === updated._id ? updated : group));
    } catch (e) {
      Alert.alert('Unable to update settings', e instanceof Error ? e.message : 'Please try again.');
    }
  };
  const updateGroupSettings = async (data: {name?: string; coverUrl?: string; joinApprovalRequired?: boolean}) => {
    if (!selected || selectedMembership?.role !== 'admin') return false;
    if (data.name !== undefined && data.name.trim().length < 2) {
      Alert.alert('Invalid group name', 'Use at least 2 characters.');
      return false;
    }
    try {
      const updated = await apiRequest<Group>(`/groups/${selected._id}/settings`, {method:'PATCH', body:JSON.stringify(data)}, accessToken);
      if (!updated) throw new Error('The group could not be updated.');
      setSelected(updated); setEditingName(updated.name); setEditingCoverUrl(updated.coverUrl ?? ''); setGroups(value => value.map(group => group._id === updated._id ? updated : group));
      return true;
    } catch (e) { Alert.alert('Unable to update group', e instanceof Error ? e.message : 'Please try again.'); return false; }
  };
  const saveGroupIdentity = async () => {
    const nextName = editingName.trim();
    const nextCoverUrl = editingCoverUrl.trim();
    if (nextName.length < 2) {
      Alert.alert('Invalid group name', 'Use at least 2 characters.');
      return;
    }
    const nameSaved = await updateGroupSettings({name: nextName});
    if (!nameSaved) return;
    if (nextCoverUrl && nextCoverUrl !== selected?.coverUrl) await updateGroupSettings({coverUrl: nextCoverUrl});
    Alert.alert('Group updated', 'Your group identity was saved.');
  };
  const uploadGroupCover = async () => {
    if (!selected || selectedMembership?.role !== 'admin' || coverUploading) return;
    setCoverUploading(true);
    try {
      const selectedMedia = await pickMedia('photo');
      if (!selectedMedia[0]) return;
      const uploaded = await uploadMedia(selectedMedia[0], accessToken);
      await updateGroupSettings({coverUrl: uploaded.url});
      setEditingCoverUrl(uploaded.url);
    } catch (e) {
      Alert.alert('Unable to upload cover photo', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setCoverUploading(false);
    }
  };
  const uploadNewGroupCover = async () => {
    if (coverUploading) return;
    setCoverUploading(true);
    try {
      const selectedMedia = await pickMedia('photo');
      if (!selectedMedia[0]) return;
      const uploaded = await uploadMedia(selectedMedia[0], accessToken);
      setCoverUrl(uploaded.url);
    } catch (e) {
      Alert.alert('Unable to upload cover photo', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setCoverUploading(false);
    }
  };
  const invite = async () => {
    if (!selected) return;
    await Share.share({message: `Join ${selected.name} on Connectly.`});
  };
  const changeMemberRole = async (member: GroupMember) => {
    if (!selected || selectedMembership?.role !== 'admin' || !member.userId) return;
    const nextRole: GroupMember['role'] = member.role === 'member' ? 'moderator' : member.role === 'moderator' ? 'admin' : 'member';
    try {
      await apiRequest(`/groups/${selected._id}/members/${member.userId._id}`, {method:'PATCH', body: JSON.stringify({role: nextRole})}, accessToken);
      setGroupMembers(value => value.map(item => item._id === member._id ? {...item, role: nextRole} : item));
    } catch (e) {
      Alert.alert('Unable to update role', e instanceof Error ? e.message : 'Please try again.');
    }
  };
  const visiblePosts = activeTab === 'Announcements'
    ? posts
    : activeTab === 'Photos'
      ? posts.filter(post => Boolean(post.media?.length))
      : activeTab === 'Topics'
        ? posts.filter(post => !post.isAnnouncement)
        : [];
  const displayGroups = groups.filter(group => {
    const membership = members.find(item => item.groupId === group._id);
    if (listTab === 'mine') return membership?.status === 'active';
    if (listTab === 'invitations') return membership?.status === 'requested';
    return true;
  });
  const create = async () => {
    if (!name.trim()) return;
    try {
      const group = await apiRequest<Group>(
        '/groups',
        {
          method: 'POST',
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim(),
            visibility,
            rules: rules.trim(),
            coverUrl: coverUrl.trim() || undefined,
            postApprovalRequired: approvalRequired,
          }),
        },
        accessToken,
      );
      setGroups(value => [group, ...value]);
      setName('');
      setDescription('');
      setRules('');
      setCoverUrl('');
      setCreating(false);
    } catch (e) {
      Alert.alert(
        'Unable to create group',
        e instanceof Error ? e.message : 'Please try again.',
      );
    }
  };
  if (creating)
    return (
      <View style={styles.page}>
        <Pressable onPress={() => setCreating(false)}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <Text style={styles.title}>Create a group</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Group name"
          placeholderTextColor={colors.muted}
          style={styles.inputBox}
        />
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Description"
          placeholderTextColor={colors.muted}
          style={[styles.inputBox, { height: 100 }]}
          multiline
        />
        <TextInput value={rules} onChangeText={setRules} placeholder="Community rules (optional)" placeholderTextColor={colors.muted} style={[styles.inputBox, {height: 100}]} multiline />
        <TextInput value={coverUrl} onChangeText={setCoverUrl} placeholder="Cover image URL (optional)" placeholderTextColor={colors.muted} style={styles.inputBox} autoCapitalize="none" />
        <Pressable style={styles.uploadCreateCoverButton} onPress={() => void uploadNewGroupCover()} disabled={coverUploading}><Text style={styles.uploadCoverText}>{coverUploading ? 'Uploading…' : 'Upload group cover photo'}</Text></Pressable>
        <Pressable style={styles.settingRow} onPress={() => setVisibility(value => value === 'public' ? 'private' : value === 'private' ? 'invite-only' : 'public')}><View><Text style={styles.settingTitle}>Community visibility</Text><Text style={styles.settingHint}>Public, private, or invite-only</Text></View><Text style={styles.settingValue}>{visibility}</Text></Pressable>
        <Pressable style={styles.settingRow} onPress={() => setApprovalRequired(value => !value)}>
          <View><Text style={styles.settingTitle}>Approve posts before publishing</Text><Text style={styles.settingHint}>Admins can review every member post.</Text></View>
          <Text style={styles.settingValue}>{approvalRequired ? 'ON' : 'OFF'}</Text>
        </Pressable>
        <Pressable onPress={() => void create()} style={styles.primary}>
          <Text style={styles.primaryText}>Create community</Text>
        </Pressable>
      </View>
    );
  const selectedMembership = selected ? members.find(item => item.groupId === selected._id) : undefined;
  const canApprove = selectedMembership?.role === 'admin' || selectedMembership?.role === 'moderator';
  if (selected)
    return (
      <ScrollView style={styles.page} contentContainerStyle={styles.selectedContent} nestedScrollEnabled keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Pressable onPress={() => setSelected(null)}>
            <Text style={styles.back}>‹</Text>
          </Pressable>
          <Text style={styles.title}>{selected.name}</Text>
        </View>
        <View style={styles.groupHero}>
          {selected.coverUrl ? <Image source={{uri:selected.coverUrl}} style={styles.groupCover} /> : <View style={styles.groupHeroAvatar}><Text style={styles.groupHeroAvatarText}>{selected.name[0]}</Text></View>}
          <View style={styles.groupHeroCopy}>
            {selectedMembership?.role === 'admin' ? <><Text style={styles.editLabel}>Group identity</Text><View style={styles.nameEditRow}><TextInput value={editingName} onChangeText={setEditingName} style={styles.nameEditInput} placeholder="Group name" placeholderTextColor={colors.muted} /></View><TextInput value={editingCoverUrl} onChangeText={setEditingCoverUrl} style={styles.coverEditInput} placeholder="Paste cover image URL (optional)" placeholderTextColor={colors.muted} autoCapitalize="none" keyboardType="url" /><View style={styles.coverActions}><Pressable style={styles.uploadCoverButton} onPress={() => void uploadGroupCover()} disabled={coverUploading}><Text style={styles.uploadCoverText}>{coverUploading ? 'Uploading…' : 'Upload cover photo'}</Text></Pressable><Text style={styles.coverEditHint}>Visible to everyone in the group</Text></View><Pressable style={styles.saveIdentityButton} onPress={() => void saveGroupIdentity()}><Text style={styles.saveIdentityText}>Save changes</Text></Pressable></> : <Text style={styles.groupHeroTitle}>{selected.name}</Text>}
            <Text style={styles.groupHeroDescription}>
              {selected.description || 'A community for meaningful conversations.'}
            </Text>
            <Text style={styles.groupHeroMeta}>{selected.memberCount} members · {selected.visibility} · Your role: {selectedMembership?.role ?? 'member'}</Text>
          </View>
        </View>
        <View style={styles.groupActions}><Pressable style={styles.joinedButton} onPress={() => Alert.alert('Group membership', selectedMembership?.status === 'requested' ? 'Your membership request is awaiting approval.' : 'You are a member of this group.')}><Text style={styles.joinedButtonText}>{selectedMembership?.status === 'requested' ? 'Requested' : '✓ Joined'}</Text></Pressable><Pressable style={styles.inviteButton} onPress={() => void invite()}><Text style={styles.inviteButtonText}>＋ Invite</Text></Pressable><Pressable style={styles.moreGroupButton} onPress={() => Alert.alert('Group options', 'Use the settings below to manage this community.')}><Text style={styles.moreGroupText}>•••</Text></Pressable></View>
        <View style={styles.groupTabs}>{['Announcements','Topics','Photos','Events','Members'].map(tab => <Pressable key={tab} onPress={() => setActiveTab(tab)} style={[styles.groupTab, activeTab === tab && styles.groupTabActive]}><Text style={[styles.groupTabText, activeTab === tab && styles.groupTabTextActive]}>{tab}</Text></Pressable>)}</View>
        {selected.rules ? <View style={styles.infoBox}><Text style={styles.settingTitle}>Community rules</Text><Text style={styles.settingHint}>{selected.rules}</Text></View> : null}
        {activeTab === 'Topics' ? <><Text style={styles.sectionHeading}>Channels</Text><View style={styles.chipRow}>{channels.map(channel => <View style={styles.channelChip} key={channel._id}><Text style={styles.channelText}># {channel.name}</Text></View>)}{!channels.length ? <Text style={styles.emptyInline}>General discussion</Text> : null}</View></> : null}
        {activeTab === 'Events' ? <><Text style={styles.sectionHeading}>Upcoming activities</Text>{events.map(event => <View style={styles.activityRow} key={event._id}><View style={styles.copy}><Text style={styles.settingTitle}>{event.title}{event.isLiveQa ? ' · Live Q&A' : ''}</Text><Text style={styles.settingHint}>{new Date(event.startsAt).toLocaleString()}</Text></View><Pressable onPress={()=>void apiRequest(`/groups/${selected._id}/events/${event._id}/reminder`,{method:'POST'},accessToken).then(()=>Alert.alert('Reminder set','We will remind you before this activity.'))}><Text style={styles.actionText}>Remind me</Text></Pressable></View>)}{!events.length ? <Text style={styles.emptyInline}>No upcoming events.</Text> : null}</> : null}
        {activeTab === 'Announcements' ? <><Text style={styles.sectionHeading}>Pinned resources</Text>{resources.map(resource => <View style={styles.activityRow} key={resource._id}><Text style={styles.settingTitle}>{resource.title}</Text><Text style={styles.actionText}>Pinned</Text></View>)}</> : null}
        {activeTab === 'Members' ? <><Text style={styles.sectionHeading}>Members and roles</Text>{groupMembers.map(member => { const memberName = member.userId?.name ?? 'Unavailable member'; const memberUsername = member.userId?.username ? `@${member.userId.username}` : 'Account unavailable'; return <View style={styles.memberRow} key={member._id}>{member.userId?.avatarUrl ? <Image source={{uri: member.userId.avatarUrl}} style={styles.memberAvatar} /> : <View style={styles.memberAvatar}><Text style={styles.memberAvatarText}>{memberName[0]}</Text></View>}<View style={styles.copy}><Text style={styles.settingTitle}>{memberName}</Text><Text style={styles.settingHint}>{memberUsername}{member.status === 'requested' ? ' · Request pending' : ''}</Text></View><Pressable disabled={selectedMembership?.role !== 'admin' || !member.userId} onPress={() => void changeMemberRole(member)} style={[styles.roleBadge, member.role === 'admin' ? styles.adminBadge : member.role === 'moderator' ? styles.moderatorBadge : styles.memberBadge]}><Text style={styles.roleBadgeText}>{member.role}</Text></Pressable></View>; })}{!groupMembers.length ? <Text style={styles.emptyInline}>No members found.</Text> : null}<Text style={styles.settingHint}>Admins can tap a role to cycle member → moderator → admin.</Text></> : null}
        {canApprove ? <Pressable style={styles.approvalSetting} onPress={() => void toggleApproval()}><View><Text style={styles.settingTitle}>Post approval</Text><Text style={styles.settingHint}>Review member posts before publishing</Text></View><Text style={styles.settingValue}>{selected.postApprovalRequired ? 'ON' : 'OFF'}</Text></Pressable> : null}
        {selectedMembership?.role === 'admin' ? <Pressable style={styles.approvalSetting} onPress={() => void updateGroupSettings({joinApprovalRequired: !selected.joinApprovalRequired})}><View><Text style={styles.settingTitle}>Approve member requests</Text><Text style={styles.settingHint}>Review people before they join this group</Text></View><Text style={styles.settingValue}>{selected.joinApprovalRequired ? 'ON' : 'OFF'}</Text></Pressable> : null}
        {activeTab !== 'Events' && activeTab !== 'Members' ? <View style={styles.composer}>
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Write a group post…"
            placeholderTextColor={colors.muted}
            style={styles.composerInput}
            multiline
          />
          <Pressable onPress={() => void publish()} style={styles.primarySmall}>
            <Text style={styles.primaryText}>Post</Text>
          </Pressable>
        </View> : null}
        {activeTab !== 'Events' && activeTab !== 'Members' ? <FlatList
          data={visiblePosts}
          scrollEnabled={false}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.post}>
              <View style={styles.postAuthorRow}>
                {item.authorId?.avatarUrl ? <Image source={{uri: item.authorId.avatarUrl}} style={styles.postAuthorAvatar} /> : <View style={styles.postAuthorAvatarFallback}><Text style={styles.postAuthorInitial}>{(item.authorId?.name ?? 'C').slice(0, 1).toUpperCase()}</Text></View>}
                <View><Text style={styles.author}>{item.authorId?.name ?? 'Connectly member'}</Text><Text style={styles.handle}>@{item.authorId?.username ?? 'member'}</Text></View>
              </View>
              <Text style={styles.postBody}>{item.body}</Text>
              {item.media?.length ? <Image source={{uri:item.media[0].url}} style={styles.groupPostImage} /> : null}
              {item.status === 'pending' ? <View style={styles.pendingRow}><Text style={styles.pendingText}>{canApprove ? 'Needs admin approval' : 'Pending admin approval'}</Text>{canApprove ? <><Pressable onPress={() => void approve(item._id, 'approve')}><Text style={styles.approveText}>Approve</Text></Pressable><Pressable onPress={() => void approve(item._id, 'reject')}><Text style={styles.rejectText}>Reject</Text></Pressable></> : null}</View> : null}
              <Text style={styles.postMeta}>
                {item.reactionCount ?? 0} likes · {item.commentCount ?? 0}{' '}
                comments
              </Text>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>
              No posts yet. Start the conversation.
            </Text>
          }
        /> : null}
      </ScrollView>
    );
  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <Pressable onPress={onBack}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <Text style={styles.title}>Groups & events</Text>
        <Pressable onPress={onCreateGroup ?? (() => setCreating(true))}>
          <Text style={styles.add}>＋</Text>
        </Pressable>
      </View>
      <Text style={styles.subtitle}>
        Join communities and share posts with members.
      </Text>
      <View style={styles.listTabs}>{(['discover', 'mine', 'invitations'] as const).map(item => <Pressable key={item} onPress={() => setListTab(item)} style={[styles.listTab, listTab === item && styles.listTabActive]}><Text style={[styles.listTabText, listTab === item && styles.listTabTextActive]}>{item === 'mine' ? 'Your groups' : item}</Text></Pressable>)}</View>
      <View style={styles.hero}>
        <View style={styles.heroCopy}>
          <Text style={styles.heroEyebrow}>YOUR COMMUNITIES</Text>
          <Text style={styles.heroTitle}>Find your people.</Text>
          <Text style={styles.heroText}>Discover conversations built around what you care about.</Text>
        </View>
        <View style={styles.heroOrb}><Text style={styles.heroOrbText}>✦</Text></View>
      </View>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search groups"
        placeholderTextColor={colors.muted}
        style={styles.search}
      />
      {loading ? (
        <ActivityIndicator color={colors.blue} />
      ) : loadError ? (
        <View style={styles.emptyState}><Text style={styles.empty}>{loadError}</Text><Pressable style={styles.retryButton} onPress={() => void load()}><Text style={styles.primaryText}>Retry</Text></Pressable></View>
      ) : (
        <FlatList
          data={displayGroups}
          keyExtractor={item => item._id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load().finally(() => setRefreshing(false)); }} tintColor={colors.blue} />}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const joined = members.some(
              value => value.groupId === item._id && value.status === 'active',
            );
            return (
              <Pressable style={styles.card} onPress={() => void open(item)}>
                {item.coverUrl ? <Image source={{uri: item.coverUrl}} style={styles.cardCover} /> : <View style={styles.cardAccent} />}
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.name[0]}</Text>
                </View>
                <View style={styles.copy}>
                  <Text style={styles.groupName}>{item.name}</Text>
                  <Text style={styles.description}>
                    {item.description || 'Connectly community'}
                  </Text>
                  <Text style={styles.meta}>
                    {item.memberCount} members · {item.visibility}
                  </Text>
                </View>
                {joined ? (
                  <Text style={styles.open}>Open</Text>
                ) : (
                  <Pressable
                    onPress={event => {
                      event.stopPropagation();
                      void join(item);
                    }}
                    style={styles.join}
                  >
                    <Text style={styles.joinText}>{members.find(value => value.groupId === item._id)?.status === 'requested' ? 'Requested' : item.visibility === 'public' ? 'Join' : 'Request'}</Text>
                  </Pressable>
                )}
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <Text style={styles.empty}>No groups found.</Text>
          }
        />
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.canvas, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  back: { fontSize: 32, color: colors.ink },
  title: { fontSize: 26, fontWeight: '900', color: colors.ink, flex: 1, letterSpacing: -0.6 },
  add: { fontSize: 28, color: colors.blue },
  subtitle: { fontSize: 13, color: colors.muted, marginBottom: spacing.md },
  listTabs: { flexDirection: 'row', backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, padding: 3, marginBottom: spacing.md },
  listTab: { flex: 1, alignItems: 'center', borderRadius: radius.pill, paddingVertical: 9 },
  listTabActive: { backgroundColor: colors.blue },
  listTabText: { color: colors.muted, fontSize: 11, fontWeight: '800', textTransform: 'capitalize' },
  listTabTextActive: { color: '#fff' },
  sectionHeading: { color: colors.ink, fontSize: 15, fontWeight: '900', marginTop: spacing.md, marginBottom: spacing.sm },
  infoBox: { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  channelChip: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  channelText: { color: colors.ink, fontWeight: '800', fontSize: 12 },
  emptyInline: { color: colors.muted, fontSize: 12 },
  actionText: { color: colors.blue, fontSize: 12, fontWeight: '900' },
  activityRow: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center' },
  memberRow: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.sm, marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center' },
  memberAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' },
  memberAvatarText: { color: colors.blue, fontWeight: '900', fontSize: 16 },
  roleBadge: { borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 6 },
  adminBadge: { backgroundColor: '#eee8ff' },
  moderatorBadge: { backgroundColor: '#e3f4ff' },
  memberBadge: { backgroundColor: colors.surfaceAlt },
  roleBadgeText: { color: colors.ink, fontSize: 10, fontWeight: '900', textTransform: 'capitalize' },
  hero: { backgroundColor: colors.ink, borderRadius: radius.xl, padding: spacing.xl, marginBottom: spacing.lg, flexDirection: 'row', alignItems: 'center', overflow: 'hidden', ...shadow },
  heroCopy: { flex: 1 },
  heroEyebrow: { color: colors.primaryLight, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  heroTitle: { color: '#fff', fontSize: 25, fontWeight: '900', marginTop: spacing.xs },
  heroText: { color: 'rgba(255,255,255,.72)', fontSize: 12, lineHeight: 18, marginTop: spacing.sm },
  heroOrb: { width: 64, height: 64, borderRadius: 24, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center', marginLeft: spacing.md },
  heroOrbText: { color: '#fff', fontSize: 30 },
  groupHero: { backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md, ...shadow },
  groupCover: { width: 72, height: 72, borderRadius: 24, backgroundColor: colors.blueSoft },
  groupHeroAvatar: { width: 72, height: 72, borderRadius: 24, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' },
  groupHeroAvatarText: { color: colors.blue, fontSize: 28, fontWeight: '900' },
  groupHeroCopy: { flex: 1, marginLeft: spacing.md, minWidth: 0 },
  groupHeroTitle: { color: colors.ink, fontSize: 20, fontWeight: '900' },
  editLabel: { color: colors.muted, fontSize: 10, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 5 },
  nameEditRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.canvas, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.sm },
  nameEditInput: { flex: 1, color: colors.ink, fontSize: 17, fontWeight: '900', paddingVertical: 8 },
  coverEditInput: { color: colors.ink, fontSize: 11, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 8, marginTop: spacing.sm, backgroundColor: colors.canvas },
  coverEditHint: { color: colors.muted, fontSize: 9, marginTop: 4 },
  coverActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm, flexWrap: 'wrap' },
  uploadCoverButton: { backgroundColor: colors.blueSoft, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 8 },
  uploadCoverText: { color: colors.blue, fontSize: 10, fontWeight: '900' },
  uploadCreateCoverButton: { alignSelf: 'flex-start', backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginTop: spacing.sm },
  saveIdentityButton: { alignSelf: 'flex-start', backgroundColor: colors.blue, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 9, marginTop: spacing.sm },
  saveIdentityText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  groupHeroDescription: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  groupHeroMeta: { color: colors.blue, fontSize: 11, fontWeight: '800', marginTop: 7, lineHeight: 16 },
  groupActions: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  joinedButton: { flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, paddingVertical: 11, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  joinedButtonText: { color: colors.ink, fontWeight: '900', fontSize: 12 },
  inviteButton: { flex: 1, backgroundColor: colors.blue, borderRadius: radius.pill, paddingVertical: 11, alignItems: 'center' },
  inviteButtonText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  moreGroupButton: { width: 48, backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  moreGroupText: { color: colors.ink, fontWeight: '900', letterSpacing: 1 },
  groupTabs: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  groupTab: { backgroundColor: colors.surface, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 10, borderWidth: 1, borderColor: colors.border },
  groupTabActive: { backgroundColor: colors.blue },
  groupTabText: { color: colors.ink, fontSize: 11, fontWeight: '800' },
  groupTabTextActive: { color: '#fff' },
  groupPostImage: { width: '100%', height: 180, borderRadius: radius.md, marginTop: spacing.sm },
  search: {
    height: 48,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    color: colors.ink,
  },
  list: { paddingVertical: spacing.md, paddingBottom: 120 },
  selectedContent: { paddingBottom: 120 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadow,
    overflow: 'hidden',
  },
  cardAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5, backgroundColor: colors.blue },
  cardCover: { width: 52, height: 52, borderRadius: 16, backgroundColor: colors.blueSoft },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 21, fontWeight: '900', color: colors.blue },
  copy: { flex: 1, marginHorizontal: spacing.sm },
  groupName: { fontSize: 16, fontWeight: '900', color: colors.ink },
  description: { fontSize: 12, color: colors.muted, marginTop: 4, lineHeight: 17 },
  meta: { fontSize: 11, color: colors.muted, marginTop: 7, fontWeight: '700' },
  join: {
    backgroundColor: colors.blue,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  joinText: { color: '#fff', fontWeight: '900', fontSize: 11 },
  open: { color: colors.success, fontSize: 11, fontWeight: '900' },
  emptyState: { alignItems: 'center', paddingVertical: spacing.xl },
  retryButton: { backgroundColor: colors.blue, borderRadius: radius.pill, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  composer: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'flex-end',
    ...shadow,
  },
  composerInput: {
    flex: 1,
    minHeight: 46,
    color: colors.ink,
    padding: spacing.sm,
  },
  primarySmall: {
    backgroundColor: colors.blue,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  primary: {
    backgroundColor: colors.blue,
    borderRadius: radius.pill,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  primaryText: { color: '#fff', fontWeight: '900' },
  inputBox: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.ink,
    marginTop: spacing.sm,
  },
  post: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow,
  },
  postAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  postAuthorAvatar: { width: 38, height: 38, borderRadius: 19 },
  postAuthorAvatarFallback: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' },
  postAuthorInitial: { color: colors.blue, fontWeight: '900', fontSize: 16 },
  author: { fontWeight: '900', color: colors.ink },
  handle: { fontWeight: '500', color: colors.muted, marginTop: 2 },
  postBody: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.ink,
    marginTop: spacing.sm,
  },
  postMeta: { color: colors.muted, fontSize: 11, fontWeight: '700', marginTop: spacing.md },
  pendingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: '#fff8e8', borderRadius: radius.md, padding: spacing.sm, marginTop: spacing.md },
  pendingText: { flex: 1, color: '#9a6a12', fontSize: 11, fontWeight: '800' },
  approveText: { color: colors.success, fontSize: 11, fontWeight: '900' },
  rejectText: { color: colors.danger, fontSize: 11, fontWeight: '900' },
  settingRow: { marginTop: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.canvas, flexDirection: 'row', alignItems: 'center' },
  settingTitle: { color: colors.ink, fontSize: 12, fontWeight: '900' },
  settingHint: { color: colors.muted, fontSize: 10, marginTop: 3 },
  settingValue: { marginLeft: 'auto', color: colors.blue, fontSize: 11, fontWeight: '900' },
  approvalSetting: { marginBottom: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.blueSoft, flexDirection: 'row', alignItems: 'center' },
  empty: { color: colors.muted, textAlign: 'center', padding: spacing.xl },
});
