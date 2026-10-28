import React from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { apiRequest } from '../../services/api/client';
import { colors, radius, shadow, spacing } from '../../theme/tokens';
type Group = {
  _id: string;
  name: string;
  description: string;
  visibility: string;
  memberCount: number;
};
type Membership = { groupId: string; status: string };
type GroupPost = {
  _id: string;
  body: string;
  createdAt: string;
  authorId?: { name: string; username: string };
  reactionCount: number;
  commentCount: number;
};
export function GroupsScreen({
  accessToken,
  onBack,
}: {
  accessToken: string;
  onBack: () => void;
}) {
  const [groups, setGroups] = React.useState<Group[]>([]);
  const [members, setMembers] = React.useState<Membership[]>([]);
  const [selected, setSelected] = React.useState<Group | null>(null);
  const [posts, setPosts] = React.useState<GroupPost[]>([]);
  const [body, setBody] = React.useState('');
  const [query, setQuery] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [creating, setCreating] = React.useState(false);
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const load = React.useCallback(async () => {
    setLoading(true);
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
    } catch {
    } finally {
      setLoading(false);
    }
  }, [accessToken, query]);
  React.useEffect(() => {
    void load();
  }, [load]);
  const open = async (group: Group) => {
    setSelected(group);
    try {
      setPosts(
        await apiRequest<GroupPost[]>(
          `/groups/${group._id}/posts`,
          {},
          accessToken,
        ),
      );
    } catch {
      setPosts([]);
    }
  };
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
    } catch (e) {
      Alert.alert(
        'Unable to post',
        e instanceof Error ? e.message : 'Join the group first.',
      );
    }
  };
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
            visibility: 'public',
          }),
        },
        accessToken,
      );
      setGroups(value => [group, ...value]);
      setName('');
      setDescription('');
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
        <Pressable onPress={() => void create()} style={styles.primary}>
          <Text style={styles.primaryText}>Create community</Text>
        </Pressable>
      </View>
    );
  if (selected)
    return (
      <View style={styles.page}>
        <View style={styles.header}>
          <Pressable onPress={() => setSelected(null)}>
            <Text style={styles.back}>‹</Text>
          </Pressable>
          <Text style={styles.title}>{selected.name}</Text>
        </View>
        <Text style={styles.subtitle}>
          {selected.description || 'Group community'}
        </Text>
        <View style={styles.composer}>
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
        </View>
        <FlatList
          data={posts}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.post}>
              <Text style={styles.author}>
                {item.authorId?.name ?? 'Connectly member'}{' '}
                <Text style={styles.handle}>
                  @{item.authorId?.username ?? 'member'}
                </Text>
              </Text>
              <Text style={styles.postBody}>{item.body}</Text>
              <Text style={styles.meta}>
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
        />
      </View>
    );
  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <Pressable onPress={onBack}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <Text style={styles.title}>Groups & events</Text>
        <Pressable onPress={() => setCreating(true)}>
          <Text style={styles.add}>＋</Text>
        </Pressable>
      </View>
      <Text style={styles.subtitle}>
        Join communities and share posts with members.
      </Text>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search groups"
        placeholderTextColor={colors.muted}
        style={styles.search}
      />
      {loading ? (
        <ActivityIndicator color={colors.blue} />
      ) : (
        <FlatList
          data={groups}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const joined = members.some(
              value => value.groupId === item._id && value.status === 'active',
            );
            return (
              <Pressable style={styles.card} onPress={() => void open(item)}>
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
                    <Text style={styles.joinText}>Join</Text>
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
  page: { flex: 1, backgroundColor: colors.canvas, padding: spacing.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  back: { fontSize: 32, color: colors.ink },
  title: { fontSize: 23, fontWeight: '900', color: colors.ink, flex: 1 },
  add: { fontSize: 28, color: colors.blue },
  subtitle: { fontSize: 13, color: colors.muted, marginBottom: spacing.md },
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
  },
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
  groupName: { fontSize: 14, fontWeight: '900', color: colors.ink },
  description: { fontSize: 11, color: colors.muted, marginTop: 3 },
  meta: { fontSize: 10, color: colors.muted, marginTop: 5 },
  join: {
    backgroundColor: colors.blue,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  joinText: { color: '#fff', fontWeight: '900', fontSize: 11 },
  open: { color: colors.success, fontSize: 11, fontWeight: '900' },
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
  author: { fontWeight: '900', color: colors.ink },
  handle: { fontWeight: '500', color: colors.muted },
  postBody: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.ink,
    marginTop: spacing.sm,
  },
  empty: { color: colors.muted, textAlign: 'center', padding: spacing.xl },
});
