import React, { useEffect, useState } from 'react';
import { Linking, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FeedScreen } from '../features/feed/FeedScreen';
import { CreatePostScreen } from '../features/posts/CreatePostScreen';
import { CreateHubScreen } from '../features/create/CreateHubScreen';
import { FriendsScreen } from '../features/friends/FriendsScreen';
import { FriendRequestsScreen } from '../features/friends/FriendRequestsScreen';
import { NotificationsScreen } from '../features/notifications/NotificationsScreen';
import { SettingsScreen } from '../features/settings/SettingsScreen';
import { AuthScreen } from '../features/auth/AuthScreen';
import { ProfileScreen } from '../features/profile/ProfileScreen';
import { ReelsScreen } from '../features/reels/ReelsScreen';
import { SearchScreen } from '../features/search/SearchScreen';
import { MessagesScreen } from '../features/messages/MessagesScreen';
import { BlockedAccountsScreen } from '../features/settings/BlockedAccountsScreen';
import { GroupsScreen } from '../features/groups/GroupsScreen';
import { CreateGroupScreen } from '../features/groups/CreateGroupScreen';
import { EventsScreen } from '../features/events/EventsScreen';
import { CreatorIdeasScreen } from '../features/creator/CreatorIdeasScreen';
import { SettingsDetailScreen } from '../features/settings/SettingsDetailScreen';
import { InterestsScreen } from '../features/onboarding/InterestsScreen';
import { SplashScreen } from '../components/common/SplashScreen';
import { BottomTabBar, BottomTab } from '../components/navigation/BottomTabBar';
import { colors, shadow, spacing } from '../theme/tokens';
import { apiRequest } from '../services/api/client';
import {
  clearSession,
  loadSession,
  saveSession,
  Session,
} from '../services/storage/session';

type Tab =
  | 'home'
  | 'search'
  | 'reels'
  | 'friends'
  | 'create'
  | 'notifications'
  | 'profile'
  | 'menu';

export function ConnectlyApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [platformConfig, setPlatformConfig] = useState<{announcement: string; flags: Record<string, boolean>} | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [tab, setTab] = useState<Tab>('home');
  const [createMode, setCreateMode] = useState<'post' | 'story' | 'reel' | null>(null);
  const [createPrompt, setCreatePrompt] = useState('');
  const [createOptions, setCreateOptions] = useState<{ interaction?: 'poll'; media?: 'photo' | 'video' }>({});
  const [feedMode, setFeedMode] = useState<'for-you' | 'saved'>('for-you');
  const [focusPostId, setFocusPostId] = useState<string | undefined>();
  const [pendingGroupId, setPendingGroupId] = useState<string | undefined>();
  const [focusConversationId, setFocusConversationId] = useState<string | undefined>();
  const [messageReturnTab, setMessageReturnTab] = useState<Tab>('menu');
  const [settingsReturnTab, setSettingsReturnTab] = useState<Tab>('menu');
  const [blockedReturn, setBlockedReturn] = useState<'main' | 'settings'>('main');
  const [friendRequestsReturnTab, setFriendRequestsReturnTab] = useState<Tab>('menu');
  const [focusComments, setFocusComments] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [screen, setScreen] = useState<
    'main' | 'profile' | 'messages' | 'blocked' | 'groups' | 'create-group' | 'events' | 'creator-ideas' | 'settings' | 'search' | 'friend-requests' | 'interests'
  >('main');
  const [settingsKind, setSettingsKind] = useState<
    | 'activity'
    | 'privacy'
    | 'notifications'
    | 'security'
    | 'content'
    | 'collections'
    | 'accessibility'
    | 'data'
    | 'support'
    | 'account'
    | 'archive'
    | 'creator'
    | 'close-friends'
    | 'monetization'
  >('activity');
  const [profileUser, setProfileUser] = useState<
    { name: string; username: string } | undefined
  >();
  const [profileReturnTab, setProfileReturnTab] = useState<Tab>('friends');
  const handleDeepLink = (url: string) => {
    // Android and iOS can deliver either connectly://route or connectly:///route.
    const normalizedUrl = url.replace(/^connectly:\/+/i, 'connectly://');
    const match = normalizedUrl.match(/^connectly:\/\/([^/?#]+)(?:\/([^?#]*))?(?:\?([^#]*))?/i);
    if (!match) return;
    let route = match[1].toLowerCase();
    let rawId: string | undefined = match[2];
    const rawQuery = match[3];
    if (route === 'app' && rawId) {
      route = rawId.toLowerCase();
      rawId = undefined;
    }
    let id = '';
    try {
      id = rawId ? decodeURIComponent(rawId) : '';
    } catch {
      return;
    }
    const params = new URLSearchParams(rawQuery ?? '');
    setFocusPostId(undefined);
    setFocusConversationId(undefined);
    if (route === 'post' && id) {
      setFocusPostId(id);
      setFeedMode('for-you');
      setTab('home');
      setScreen('main');
    } else if ((route === 'conversation' || route === 'chat') && id) {
      setFocusConversationId(id);
      setScreen('messages');
    } else if (route === 'profile' && id) {
      setProfileUser({name: id, username: id.replace(/^@/, '')});
      setProfileReturnTab('home');
      setScreen('profile');
    } else if (route === 'search') {
      setSearchQuery(params.get('q') ?? id);
      setScreen('search');
    } else if (route === 'notifications' || route === 'notification' || route === 'alerts') {
      setSearchQuery('');
      setProfileUser(undefined);
      setTab('notifications');
      setScreen('main');
    } else {
      setTab('home');
      setScreen('main');
    }
    setRefreshKey(value => value + 1);
  };
  useEffect(() => {
    Linking.getInitialURL().then(url => {
      if (url) handleDeepLink(url);
    }).catch(() => undefined);
    const subscription = Linking.addEventListener('url', event => handleDeepLink(event.url));
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    void (async () => {
      try {
        const stored = await loadSession();
        if (!stored) {
          setRestoring(false);
          return;
        }
        const refreshed = await apiRequest<{
          accessToken: string;
          refreshToken: string;
        }>('/auth/refresh', {
          method: 'POST',
          body: JSON.stringify({ refreshToken: stored.refreshToken }),
        });
        const user = await apiRequest<Session['user']>(
          '/users/me',
          {},
          refreshed.accessToken,
        );
        const next = {
          ...stored,
          accessToken: refreshed.accessToken,
          refreshToken: refreshed.refreshToken,
          user,
        };
        setSession(next);
        await saveSession(next);
      } catch {
        await clearSession();
      } finally {
        setRestoring(false);
      }
    })();
  }, []);
  const authenticate = (next: Session) => {
    setSession(next);
    void saveSession(next);
    if (!next.user.interests?.length) setScreen('interests');
  };
  const logout = async () => {
    if (session)
      await apiRequest(
        '/auth/logout',
        {
          method: 'POST',
          body: JSON.stringify({ refreshToken: session.refreshToken }),
        },
        session.accessToken,
      ).catch(() => undefined);
    await clearSession();
    setSession(null);
    setScreen('main');
    setTab('home');
  };
  useEffect(() => {
    if (!session) return;
    void apiRequest<{ count: number }>(
      session.user.accountType === 'page' ? '/notifications/page/unread-count' : '/notifications/unread-count',
      {},
      session.accessToken,
    )
      .then(result => setUnreadNotifications(result.count))
      .catch(() => undefined);
  }, [session, refreshKey, tab]);
  useEffect(() => {
    if (!session) return;
    void apiRequest<{announcement: string; flags: Record<string, boolean>}>('/platform/config', {}, session.accessToken)
      .then(setPlatformConfig)
      .catch(() => setPlatformConfig(null));
  }, [session, refreshKey]);
  if (restoring) return <SplashScreen />;
  if (!session) return <AuthScreen onAuthenticated={authenticate} />;
  const openProfile = (
    target: { id?: string; name: string; username: string },
    returnTab: Tab = 'friends',
  ) => {
    setProfileReturnTab(returnTab);
    if (target.id === session.user.id) {
      setProfileUser(undefined);
    } else {
      setProfileUser({ name: target.name, username: target.username });
    }
    setScreen('profile');
  };
  const closeProfile = () => {
    setProfileUser(undefined);
    setScreen('main');
    setTab(profileReturnTab);
  };
  const openSaved = () => {
    setFeedMode('saved');
    setScreen('main');
    setTab('home');
  };
  if (screen === 'blocked')
    return (
      <SafeAreaView style={styles.app} edges={['top', 'bottom']}>
        <BlockedAccountsScreen
          accessToken={session.accessToken}
          onBack={() => setScreen(blockedReturn === 'settings' ? 'settings' : 'main')}
          onFindPeople={() => { setSearchQuery(''); setScreen('search'); }}
        />
      </SafeAreaView>
    );
  if (screen === 'groups')
    return (
      <SafeAreaView style={styles.app} edges={['top', 'bottom']}>
        <GroupsScreen
          accessToken={session.accessToken}
          initialGroupId={pendingGroupId}
          onCreateGroup={() => { setPendingGroupId(undefined); setScreen('create-group'); }}
          onBack={() => { setPendingGroupId(undefined); setScreen('main'); setTab('menu'); }}
        />
      </SafeAreaView>
    );
  if (screen === 'create-group')
    return (
      <SafeAreaView style={styles.app} edges={['top', 'bottom']}>
        <CreateGroupScreen
          accessToken={session.accessToken}
          onBack={() => setScreen('groups')}
          onCreated={group => { setPendingGroupId(group._id); setScreen('groups'); }}
        />
      </SafeAreaView>
    );
  if (screen === 'events')
    return (
      <SafeAreaView style={styles.app} edges={['top', 'bottom']}>
        <EventsScreen accessToken={session.accessToken} onBack={() => { setScreen('main'); setTab('menu'); }} />
      </SafeAreaView>
    );
  if (screen === 'creator-ideas')
    return (
      <SafeAreaView style={styles.app} edges={['top', 'bottom']}>
        <CreatorIdeasScreen accessToken={session.accessToken} onBack={() => { setScreen('main'); setTab('menu'); }} onCreate={(kind, prompt) => { setCreatePrompt(prompt); setCreateOptions({}); setCreateMode(kind); setScreen('main'); setTab('create'); }} />
      </SafeAreaView>
    );
  if (screen === 'settings')
    return (
      <SafeAreaView style={styles.app} edges={['top', 'bottom']}>
        <SettingsDetailScreen
          kind={settingsKind}
          accessToken={session.accessToken}
          onBack={() => { setScreen('main'); setTab(settingsReturnTab); }}
          onLogout={logout}
          onBlocked={() => { setBlockedReturn('settings'); setScreen('blocked'); }}
        />
      </SafeAreaView>
    );
  if (screen === 'search')
    return (
      <SafeAreaView style={styles.app} edges={['top', 'bottom']}>
        <SearchScreen
          accessToken={session.accessToken}
          initialQuery={searchQuery}
          onBack={() => { setScreen('main'); setTab('home'); }}
          onOpenProfile={target => openProfile(target, 'home')}
        />
      </SafeAreaView>
    );
  if (screen === 'friend-requests')
    return <SafeAreaView style={styles.app} edges={['top', 'bottom']}><FriendRequestsScreen accessToken={session.accessToken} onBack={() => {setScreen('main');setTab(friendRequestsReturnTab);}} onOpenProfile={target => openProfile(target, friendRequestsReturnTab)} /></SafeAreaView>;
  const content =
    screen === 'messages' ? (
      <MessagesScreen accessToken={session.accessToken} currentUserId={session.user.id} initialConversationId={focusConversationId} onBack={() => {setFocusConversationId(undefined); setScreen('main'); setTab(messageReturnTab);}} onBackFromChat={focusConversationId ? () => {setFocusConversationId(undefined); setScreen('main'); setTab(messageReturnTab);} : undefined} />
    ) : screen === 'profile' ? (
      <ProfileScreen
        user={session.user}
        accessToken={session.accessToken}
        profileUser={profileUser}
        onBack={closeProfile}
        onSettings={() => {
          setProfileUser(undefined);
          setScreen('main');
          setTab('menu');
        }}
        onAccountUpdated={updated => setSession(current => {
          if (!current) return current;
          const next = {...current, user: {...current.user, ...updated}};
          void saveSession(next);
          return next;
        })}
      />
    ) : tab === 'profile' ? (
      <ProfileScreen
        user={session.user}
        accessToken={session.accessToken}
        onBack={() => setTab('home')}
        onSettings={() => {
          setScreen('main');
          setTab('menu');
        }}
        onAccountUpdated={updated => setSession(current => {
          if (!current) return current;
          const next = {...current, user: {...current.user, ...updated}};
          void saveSession(next);
          return next;
        })}
      />
    ) : tab === 'create' ? (
      createMode ? <CreatePostScreen
        user={session.user}
        accessToken={session.accessToken}
        initialMode={createMode}
        initialInteraction={createOptions.interaction}
        initialMediaType={createOptions.media}
        initialText={createPrompt}
        onPublished={() => { setRefreshKey(value => value + 1); setCreateMode(null); setTab('home'); }}
        onClose={() => setCreateMode(null)}
      /> : <CreateHubScreen user={session.user} onCreate={(mode, options) => { setCreateOptions(options ?? {}); setCreateMode(mode); }} />
    ) : tab === 'reels' ? (
      <ReelsScreen
        accessToken={session.accessToken}
        onCreate={() => { setCreatePrompt(''); setCreateOptions({}); setCreateMode('reel'); setTab('create'); }}
      />
    ) : tab === 'friends' ? (
      <FriendsScreen
        accessToken={session.accessToken}
        onOpenRequests={() => { setFriendRequestsReturnTab('friends'); setScreen('friend-requests'); }}
        onOpenProfile={target => openProfile(target, 'friends')}
      />
    ) : tab === 'notifications' ? (
      <NotificationsScreen
        accessToken={session.accessToken}
        profileType={session.user.accountType === 'page' ? 'page' : 'personal'}
        onOpenEntity={item => {
          if (item.entityType === 'friend-request') {
            setFriendRequestsReturnTab('notifications');
            setScreen('friend-requests');
          } else if (item.entityType === 'post' && item.entityId) {
            setFocusPostId(item.entityId);
            setFocusComments(item.type === 'comment');
            setFeedMode('for-you');
            setTab('home');
            setScreen('main');
          } else if (item.entityType === 'user' && item.actorId?.username) {
            setProfileUser({name: item.actorId.name, username: item.actorId.username});
            setProfileReturnTab('notifications');
            setScreen('profile');
          } else if (item.entityType === 'conversation' && item.entityId) {
            setFocusConversationId(item.entityId);
            setMessageReturnTab('notifications');
            setScreen('messages');
          }
        }}
      />
    ) : tab === 'menu' ? (
      <SettingsScreen
        user={session.user}
        onBack={() => {
          setFeedMode('for-you');
          setTab('home');
        }}
        onFriends={() => { setFriendRequestsReturnTab('menu'); setScreen('friend-requests'); }}
        onFindPeople={() => { setSearchQuery(''); setScreen('search'); }}
        onSaved={openSaved}
        onMessages={() => { setMessageReturnTab('menu'); setScreen('messages'); }}
        onBlocked={() => { setBlockedReturn('main'); setScreen('blocked'); setTab('menu'); }}
        onGroups={() => setScreen('groups')}
        onEvents={() => setScreen('events')}
        onCreatorIdeas={() => setScreen('creator-ideas')}
        onReels={() => setTab('reels')}
        onDetail={kind => {
          setSettingsReturnTab('menu');
          setSettingsKind(kind);
          setScreen('settings');
        }}
        onProfile={() => {
          setProfileUser(undefined);
          setScreen('profile');
          setProfileReturnTab('menu');
        }}
        onLogout={logout}
      />
    ) : (
      <FeedScreen
        key={feedMode}
        initialMode={feedMode}
        user={session.user}
        accessToken={session.accessToken}
        refreshKey={refreshKey}
        focusPostId={focusPostId}
        focusComments={focusComments}
        onFocusHandled={() => {
          setFocusPostId(undefined);
          setFocusComments(false);
        }}
        onCreatePost={() => setTab('create')}
        onOpenSearch={() => setScreen('search')}
        onOpenMessages={() => setScreen('messages')}
        announcement={platformConfig?.announcement}
        maintenanceMode={Boolean(platformConfig?.flags?.maintenanceMode)}
        onOpenProfile={target => openProfile(target, 'home')}
        onOpenGroup={groupId => { setPendingGroupId(groupId); setScreen('groups'); }}
      />
    );
  if (screen === 'interests') return <SafeAreaView style={styles.app} edges={['top', 'bottom']}><InterestsScreen accessToken={session.accessToken} onDone={interests => { setSession(current => { if (!current) return current; const next = {...current, user: {...current.user, interests}}; void saveSession(next); return next; }); setScreen('main'); setTab('home'); }} /></SafeAreaView>;
  return (
    <SafeAreaView style={styles.app} edges={['top', 'bottom']}>
      {content}
      {screen === 'main' && (
        <BottomTabBar
          activeTab={tab === 'profile' ? 'menu' : (tab as BottomTab)}
          unreadCount={unreadNotifications}
          onTabPress={next => {
            setScreen('main');
            if (next === 'create') {
              setCreatePrompt('');
              setCreateOptions({});
              setCreateMode(null);
            }
            setTab(next);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: colors.canvas },
  loading: {
    flex: 1,
    backgroundColor: colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingLogo: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  loadingLogoText: { color: '#fff', fontSize: 31, fontWeight: '900' },
  spinner: { marginTop: spacing.lg },
  loadingText: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
});
