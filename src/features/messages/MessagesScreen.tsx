import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Avatar } from '../../components/common/Avatar';
import { ActionModal } from '../../components/common/ActionModal';
import { apiRequest } from '../../services/api/client';
import { pickMedia, uploadMedia } from '../../services/media/cloudinary';
import { colors, radius, shadow, spacing } from '../../theme/tokens';
import { decryptMessage, encryptMessage, publishIdentityKey } from '../../services/crypto/e2ee';
type Conversation = {
  _id: string;
  title: string;
  type: 'direct' | 'group';
  participants: {
    userId: { _id: string; name: string; username: string; avatarUrl?: string; lastSeenAt?: string | null };
    status?: 'accepted' | 'requested';
  }[];
  lastMessageAt?: string;
  unreadCount?: number;
  lastMessage?: { body?: string; kind?: string; mediaUrl?: string; createdAt?: string };
};
type Message = {
  _id: string;
  body: string;
  senderId: { _id: string; name: string; username: string; avatarUrl?: string };
  createdAt: string;
  deletedAt?: string | null;
  kind?: 'text' | 'image' | 'video' | 'file' | 'voice';
  mediaUrl?: string;
  replyTo?: string | null;
  e2ee?: {version: 1; nonce: string; senderPublicKey: string; ciphertexts: Record<string, string>};
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
  const [listSearch, setListSearch] = React.useState('');
  const [people, setPeople] = React.useState<Array<{_id: string; name: string; username: string; avatarUrl?: string}>>([]);
  const [encryptionReady, setEncryptionReady] = React.useState(false);
  const [replyTo, setReplyTo] = React.useState<Message | null>(null);
  const [mediaUrl, setMediaUrl] = React.useState('');
  const [showAttachment, setShowAttachment] = React.useState(false);
  const [uploadingMedia, setUploadingMedia] = React.useState(false);
  const [blockTarget, setBlockTarget] = React.useState<{_id: string; name: string} | null>(null);
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
    void publishIdentityKey(accessToken).then(() => setEncryptionReady(true)).catch(() => setEncryptionReady(false));
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
      setMessages(await Promise.all(result.items.reverse().map(async item => ({...item, body: item.e2ee ? await decryptMessage(item, currentUserId) : item.body}))));
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
    setMessages(await Promise.all(result.items.reverse().map(async message => ({...message, body: message.e2ee ? await decryptMessage(message, currentUserId) : message.body}))));
    await apiRequest(
      `/conversations/${item._id}/read`,
      { method: 'POST' },
      accessToken,
    );
  };
  const send = async () => {
    if (!active || (!text.trim() && !mediaUrl.trim())) return;
    if (!encryptionReady) { Alert.alert('Encrypted chat unavailable', 'Your secure device key could not be prepared. Try again before sending.'); return; }
    const participantIds = active.participants.map(part => part.userId._id);
    try {
      const encrypted = await encryptMessage(text.trim() || 'Shared an image', participantIds, accessToken);
      const result = await apiRequest<Message>(
        `/conversations/${active._id}/messages`,
        { method: 'POST', body: JSON.stringify({ e2ee: encrypted, kind: mediaUrl.trim() ? 'image' : 'text', mediaUrl: mediaUrl.trim() || undefined, replyTo: replyTo?._id }) },
        accessToken,
      );
      setMessages(current => [...current, {...result, body: text.trim() || 'Shared an image', mediaUrl: mediaUrl.trim() || undefined, replyTo: replyTo?._id}]);
      setText('');
      setMediaUrl('');
      setReplyTo(null);
      setShowAttachment(false);
    } catch (e) {
      Alert.alert('Message not sent', e instanceof Error ? e.message : 'Secure message delivery failed.');
    }
  };
  const chooseImage = async () => {
    setUploadingMedia(true);
    try {
      const selected = await pickMedia('photo');
      if (selected[0]) {
        const uploaded = await uploadMedia(selected[0], accessToken);
        setMediaUrl(uploaded.url);
        setShowAttachment(true);
      }
    } catch (e) {
      Alert.alert('Unable to attach image', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setUploadingMedia(false);
    }
  };
  const conversationTitle = (item: Conversation) => item.title || item.participants.filter(part => part.userId._id !== currentUserId).map(part => part.userId.name).join(', ') || 'Conversation';
  const conversationMeta = (item: Conversation) => item.type === 'group' ? 'Group conversation' : item.participants.filter(part => part.userId._id !== currentUserId).map(part => `@${part.userId.username}`).join(', ') || 'Private conversation';
  const conversationAvatar = (item: Conversation) => item.participants.find(part => part.userId._id !== currentUserId)?.userId.avatarUrl;
  const conversationPartner = (item: Conversation) => item.participants.find(part => part.userId._id !== currentUserId)?.userId;
  const isOnline = (item: Conversation) => {
    const lastSeen = conversationPartner(item)?.lastSeenAt;
    return Boolean(lastSeen && Date.now() - new Date(lastSeen).getTime() < 5 * 60 * 1000);
  };
  const filteredItems = items.filter(item => `${conversationTitle(item)} ${conversationMeta(item)}`.toLowerCase().includes(listSearch.trim().toLowerCase()));
  const requestItems = filteredItems.filter(item => item.participants.find(part => part.userId._id === currentUserId)?.status === 'requested');
  const acceptRequest = async (item: Conversation) => {
    const requester = item.participants.find(part => part.userId._id !== currentUserId);
    if (!requester) return;
    try {
      await apiRequest(`/conversations/${item._id}/requests/${requester.userId._id}/accept`, {method: 'POST'}, accessToken);
      await load();
    } catch (e) { Alert.alert('Request unavailable', e instanceof Error ? e.message : 'Please try again.'); }
  };
  const blockActiveUser = async () => {
    const person = active && conversationPartner(active);
    if (!person) return;
    setBlockTarget({_id: person._id, name: person.name});
  };
  const confirmBlock = async () => {
    if (!blockTarget) return;
    try { await apiRequest(`/blocks/${blockTarget._id}`, {method: 'POST'}, accessToken); setBlockTarget(null); setActive(null); await load(); }
    catch (e) { setBlockTarget(null); Alert.alert('Unable to block', e instanceof Error ? e.message : 'Please try again.'); }
  };
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
          <Text style={styles.encryptedBadge}>🔒 E2EE</Text>
          <Pressable onPress={() => void blockActiveUser()} accessibilityLabel="Block user">
            <Text style={styles.chatAction}>•••</Text>
          </Pressable>
        </View>
        <FlatList
          style={styles.messageList}
          data={messages}
          keyExtractor={item => item._id}
          renderItem={({ item }) => (
            <View style={[styles.message, item.senderId._id === currentUserId && styles.ownMessage]}>
              <Text style={styles.messageAuthor}>{item.senderId.name}</Text>
              {item.replyTo ? <Text style={styles.replyLabel}>↩ Replying to a message</Text> : null}
              {item.mediaUrl ? <Image source={{uri: item.mediaUrl}} style={styles.messageImage} accessibilityLabel="Shared image" /> : null}
              <Text style={styles.messageBody}>
                {item.deletedAt ? 'Message deleted' : item.body}
              </Text>
              <Text style={styles.messageTime}>
                {new Date(item.createdAt).toLocaleTimeString()}
              </Text>
              <Pressable onPress={() => setReplyTo(item)}><Text style={styles.replyAction}>Reply</Text></Pressable>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>
              No messages yet. Start the conversation.
            </Text>
          }
        />
        {replyTo ? <View style={styles.replyComposer}><Text style={styles.replyComposerText}>Replying to {replyTo.senderId.name}</Text><Pressable onPress={() => setReplyTo(null)}><Text style={styles.cancelReply}>×</Text></Pressable></View> : null}
        {showAttachment ? <View style={styles.attachmentPanel}><TextInput value={mediaUrl} onChangeText={setMediaUrl} placeholder="Paste image URL" placeholderTextColor={colors.muted} style={styles.attachmentInput} autoCapitalize="none" /></View> : null}
        <View style={styles.composer}>
          <Pressable onPress={() => void chooseImage()} disabled={uploadingMedia}><Text style={styles.attach}>{uploadingMedia ? '…' : '＋'}</Text></Pressable>
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
        <ActionModal visible={Boolean(blockTarget)} title="Block this account?" message={blockTarget ? `You will no longer receive messages from ${blockTarget.name}.` : undefined} icon="⊘" onClose={() => setBlockTarget(null)} actions={[{label: 'Cancel', tone: 'secondary', onPress: () => setBlockTarget(null)}, {label: 'Block account', tone: 'destructive', onPress: confirmBlock}]} />
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
      <View style={styles.listSearchRow}>
        <Text style={styles.sectionLabel}>Chats</Text>
        <TextInput value={listSearch} onChangeText={setListSearch} placeholder="Search messages" placeholderTextColor={colors.muted} style={styles.listSearch} />
      </View>
      {requestItems.length ? <View style={styles.requestBanner}><Text style={styles.requestTitle}>Message requests · {requestItems.length}</Text>{requestItems.map(item => <View key={item._id} style={styles.requestRow}><Text style={styles.requestName}>{conversationTitle(item)}</Text><Pressable onPress={() => void acceptRequest(item)}><Text style={styles.acceptText}>Accept</Text></Pressable></View>)}</View> : null}
      {loading ? (
        <ActivityIndicator color={colors.blue} style={styles.loader} />
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => void open(item)}>
              <View style={styles.avatarWrap}><Avatar initials={(conversationTitle(item) || 'C').split(' ').map(part => part[0]).join('').slice(0, 2)} avatarUrl={conversationAvatar(item)} /><View style={[styles.onlineDot, isOnline(item) && styles.onlineDotActive]} /></View>
              <View style={styles.copy}>
                <Text style={styles.name}>
                  {conversationTitle(item)}
                </Text>
                <Text style={styles.meta}>
                  {item.lastMessage?.kind === 'image' ? 'Photo' : item.lastMessage?.body || conversationMeta(item)}
                </Text>
              </View>
              <View style={styles.rowAside}><Text style={styles.rowTime}>{item.lastMessageAt ? new Date(item.lastMessageAt).toLocaleDateString() : ''}</Text>{item.unreadCount ? <Text style={styles.unreadBadge}>{item.unreadCount > 99 ? '99+' : item.unreadCount}</Text> : null}</View>
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
  listSearchRow: { marginBottom: spacing.md },
  sectionLabel: { color: colors.ink, fontSize: 18, fontWeight: '900', marginBottom: spacing.sm },
  listSearch: { height: 42, backgroundColor: colors.surface, borderRadius: radius.pill, paddingHorizontal: spacing.md, color: colors.ink, borderWidth: 1, borderColor: colors.border },
  requestBanner: { backgroundColor: colors.blueSoft, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  requestTitle: { color: colors.ink, fontSize: 14, fontWeight: '900', marginBottom: spacing.xs },
  requestRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.xs },
  requestName: { color: colors.inkLight, fontSize: 12, fontWeight: '700' },
  acceptText: { color: colors.blue, fontSize: 12, fontWeight: '900' },
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
  avatarWrap: { position: 'relative' },
  onlineDot: { position: 'absolute', right: 0, bottom: 1, width: 11, height: 11, borderRadius: 6, backgroundColor: colors.mutedLight, borderWidth: 2, borderColor: colors.surface },
  onlineDotActive: { backgroundColor: colors.success },
  name: { fontSize: 14, fontWeight: '900', color: colors.ink },
  meta: { fontSize: 11, color: colors.muted, marginTop: 4 },
  rowAside: { alignItems: 'flex-end', marginRight: spacing.xs },
  rowTime: { color: colors.muted, fontSize: 9, marginBottom: 4 },
  unreadBadge: { minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: 10, backgroundColor: colors.blue, color: colors.surface, textAlign: 'center', lineHeight: 20, fontSize: 10, fontWeight: '900' },
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
  chatAction: { color: colors.muted, fontSize: 18, marginLeft: spacing.md },
  encryptedBadge: { color: colors.success, fontSize: 10, fontWeight: '900', marginLeft: 'auto' },
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
  replyLabel: { color: colors.blue, fontSize: 10, fontWeight: '800', marginTop: 4 },
  mediaLabel: { color: colors.inkLight, fontSize: 12, marginTop: 5, fontWeight: '800' },
  messageImage: { width: 220, height: 160, borderRadius: radius.md, marginTop: 6, backgroundColor: colors.surfaceAlt },
  replyAction: { color: colors.blue, fontSize: 10, fontWeight: '800', marginTop: 5 },
  replyComposer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.blueSoft, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.sm },
  replyComposerText: { color: colors.blue, fontSize: 11, fontWeight: '800' },
  cancelReply: { color: colors.muted, fontSize: 20 },
  attachmentPanel: { backgroundColor: colors.surface, borderRadius: radius.sm, padding: spacing.xs, marginBottom: spacing.xs },
  attachmentInput: { height: 38, color: colors.ink, paddingHorizontal: spacing.sm },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: spacing.sm,
  },
  attach: { color: colors.blue, fontSize: 24, paddingHorizontal: spacing.xs },
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
