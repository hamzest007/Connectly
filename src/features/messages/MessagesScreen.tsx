import React, { useCallback } from 'react';
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
import { Avatar } from '../../components/common/Avatar';
import { apiRequest } from '../../services/api/client';
import { colors, radius, shadow, spacing } from '../../theme/tokens';
type Conversation = {
  _id: string;
  title: string;
  type: 'direct' | 'group';
  participants: {
    userId: { _id: string; name: string; username: string; avatarUrl?: string };
  }[];
  lastMessageAt?: string;
};
type Message = {
  _id: string;
  body: string;
  senderId: { _id: string; name: string; username: string; avatarUrl?: string };
  createdAt: string;
  deletedAt?: string | null;
};
export function MessagesScreen({
  accessToken,
  onBack,
  currentUserId,
  initialConversationId,
  onBackFromChat,
}: {
  accessToken: string;
  onBack?: () => void;
  currentUserId: string;
  initialConversationId?: string;
  onBackFromChat?: () => void;
}) {
  const [items, setItems] = React.useState<Conversation[]>([]);
  const [active, setActive] = React.useState<Conversation | null>(null);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [text, setText] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [newChat, setNewChat] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [people, setPeople] = React.useState<Array<{_id: string; name: string; username: string; avatarUrl?: string}>>([]);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(
        await apiRequest<Conversation[]>('/conversations', {}, accessToken),
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken]);
  React.useEffect(() => {
    void load();
  }, [accessToken, load]);
  React.useEffect(() => {
    if (!initialConversationId || !items.length || active) return;
    const conversation = items.find(item => item._id === initialConversationId);
    if (conversation) void open(conversation);
  }, [active, initialConversationId, items]);
  const refreshMessages = React.useCallback(async () => {
    if (!active) return;
    try {
      const result = await apiRequest<{items: Message[]; nextCursor: string | null}>(`/conversations/${active._id}/messages`, {}, accessToken);
      setMessages(result.items.reverse());
    } catch {}
  }, [accessToken, active]);
  React.useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => void refreshMessages(), 3000);
    return () => clearInterval(timer);
  }, [active, refreshMessages]);
  const findPeople = async () => {
    if (!search.trim()) return setPeople([]);
    try { setPeople((await apiRequest<Array<{_id:string; name:string; username:string; avatarUrl?:string}>>(`/users/search?q=${encodeURIComponent(search.trim())}`, {}, accessToken)).filter(person => person._id !== currentUserId)); } catch { setPeople([]); }
  };
  const startChat = async (person: { _id: string; name: string; username: string; avatarUrl?: string }) => {
    try {
      const conversation = await apiRequest<Conversation>('/conversations', {method: 'POST', body: JSON.stringify({participantIds: [person._id], type: 'direct'})}, accessToken);
      setNewChat(false); setSearch(''); setPeople([]); await load(); await open(conversation);
    } catch (e) {
      Alert.alert('Friendship required', e instanceof Error ? e.message : 'You must be friends before chatting.');
    }
  };
  const open = async (item: Conversation) => {
    setActive(item);
    const result = await apiRequest<{
      items: Message[];
      nextCursor: string | null;
    }>(`/conversations/${item._id}/messages`, {}, accessToken);
    setMessages(result.items.reverse());
    await apiRequest(
      `/conversations/${item._id}/read`,
      { method: 'POST' },
      accessToken,
    );
  };
  const send = async () => {
    if (!active || !text.trim()) return;
    const result = await apiRequest<Message>(
      `/conversations/${active._id}/messages`,
      { method: 'POST', body: JSON.stringify({ body: text.trim() }) },
      accessToken,
    );
    setMessages(current => [...current, result]);
    setText('');
  };
  const conversationTitle = (item: Conversation) => item.title || item.participants.filter(part => part.userId._id !== currentUserId).map(part => part.userId.name).join(', ') || 'Conversation';
  const conversationMeta = (item: Conversation) => item.type === 'group' ? 'Group conversation' : item.participants.filter(part => part.userId._id !== currentUserId).map(part => `@${part.userId.username}`).join(', ') || 'Private conversation';
  const conversationAvatar = (item: Conversation) => item.participants.find(part => part.userId._id !== currentUserId)?.userId.avatarUrl;
  if (active)
    return (
      <View style={styles.page}>
        <View style={styles.chatHeader}>
          <Pressable onPress={() => { setActive(null); onBackFromChat?.(); }}>
            <Text style={styles.back}>‹</Text>
          </Pressable>
          <Text style={styles.chatTitle}>
            {conversationTitle(active)}
          </Text>
        </View>
        <FlatList
          style={styles.messageList}
          data={messages}
          keyExtractor={item => item._id}
          renderItem={({ item }) => (
            <View style={[styles.message, item.senderId._id === currentUserId && styles.ownMessage]}>
              <Text style={styles.messageAuthor}>{item.senderId.name}</Text>
              <Text style={styles.messageBody}>
                {item.deletedAt ? 'Message deleted' : item.body}
              </Text>
              <Text style={styles.messageTime}>
                {new Date(item.createdAt).toLocaleTimeString()}
              </Text>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>
              No messages yet. Start the conversation.
            </Text>
          }
        />
        <View style={styles.composer}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Write a message…"
            placeholderTextColor={colors.muted}
            style={styles.input}
          />
          <Pressable onPress={() => void send()}>
            <Text style={styles.send}>Send</Text>
          </Pressable>
        </View>
      </View>
    );
  return (
    <View style={styles.page}>
      <View style={styles.header}>
        {onBack && (
          <Pressable onPress={onBack} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </Pressable>
        )}
        <View style={styles.headerText}>
          <Text style={styles.kicker}>CONNECTLY</Text>
          <Text style={styles.title}>Messages</Text>
          <Text style={styles.subtitle}>
            Private conversations, requests and groups.
          </Text>
        </View>
        <Pressable style={styles.newChatButton} onPress={() => setNewChat(value => !value)}>
          <Text style={styles.newChatText}>＋ Chat</Text>
        </Pressable>
      </View>
      {newChat ? (
        <View style={styles.newChatPanel}>
          <View style={styles.searchRow}>
            <TextInput value={search} onChangeText={setSearch} onSubmitEditing={() => void findPeople()} placeholder="Search by name or username" placeholderTextColor={colors.muted} style={styles.searchInput} />
            <Pressable onPress={() => void findPeople()}><Text style={styles.searchAction}>Search</Text></Pressable>
          </View>
          {people.map(person => (
            <Pressable key={person._id} style={styles.personResult} onPress={() => void startChat(person)}>
              <Avatar initials={person.name.split(' ').map(part => part[0]).join('').slice(0, 2)} avatarUrl={person.avatarUrl} size={36} />
              <View style={styles.copy}><Text style={styles.name}>{person.name}</Text><Text style={styles.meta}>@{person.username}</Text></View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {loading ? (
        <ActivityIndicator color={colors.blue} style={styles.loader} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => void open(item)}>
              <Avatar
                initials={(
                  conversationTitle(item) || 'C'
                )
                  .split(' ')
                  .map(part => part[0])
                  .join('')
                  .slice(0, 2)}
                avatarUrl={conversationAvatar(item)}
              />
              <View style={styles.copy}>
                <Text style={styles.name}>
                  {conversationTitle(item)}
                </Text>
                <Text style={styles.meta}>
                  {conversationMeta(item)}
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>No conversations yet.</Text>
          }
        />
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.canvas, padding: spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    ...shadow,
  },
  backIcon: {
    fontSize: 24,
    color: colors.ink,
    fontWeight: '700',
  },
  headerText: { flex: 1 },
  kicker: {
    fontSize: 11,
    letterSpacing: 2,
    color: colors.primary,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.ink,
    marginTop: 4,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 5,
    marginBottom: spacing.lg,
    fontWeight: '500',
  },
  list: { paddingBottom: 120 },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadow,
  },
  copy: { flex: 1, marginLeft: spacing.sm },
  name: { fontSize: 14, fontWeight: '900', color: colors.ink },
  meta: { fontSize: 11, color: colors.muted, marginTop: 4 },
  chevron: { fontSize: 28, color: colors.muted },
  loader: { marginTop: spacing.xl },
  empty: { color: colors.muted, textAlign: 'center', padding: spacing.xl },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  back: { fontSize: 34, color: colors.blue },
  chatTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.ink,
    marginLeft: spacing.sm,
  },
  messageList: { flex: 1, paddingVertical: spacing.md },
  message: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ownMessage: { alignSelf: 'flex-end', backgroundColor: colors.blueSoft, borderColor: colors.lavender, maxWidth: '86%' },
  messageAuthor: { fontSize: 11, color: colors.blue, fontWeight: '900' },
  messageBody: { fontSize: 14, color: colors.ink, marginTop: 3 },
  messageTime: { fontSize: 9, color: colors.muted, marginTop: 4 },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    color: colors.ink,
    height: 44,
  },
  send: {
    color: colors.blue,
    fontWeight: '900',
    paddingHorizontal: spacing.sm,
  },
  newChatButton: { backgroundColor: colors.blue, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  newChatText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  newChatPanel: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.sm, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, ...shadow },
  searchRow: { flexDirection: 'row', alignItems: 'center' },
  searchInput: { flex: 1, height: 42, backgroundColor: colors.canvas, borderRadius: radius.pill, paddingHorizontal: spacing.md, color: colors.ink },
  searchAction: { color: colors.blue, fontWeight: '900', padding: spacing.sm },
  personResult: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderLight },
});
