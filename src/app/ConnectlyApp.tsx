import React, { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FeedScreen } from '../features/feed/FeedScreen';
import { CreatePostScreen } from '../features/posts/CreatePostScreen';
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
import { SettingsDetailScreen } from '../features/settings/SettingsDetailScreen';
import { SplashScreen } from '../components/common/SplashScreen';
import { colors, radius, shadow, spacing } from '../theme/tokens';
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
  | 'menu';
const tabs: { key: Tab; icon: string; label: string }[] = [
  { key: 'home', icon: '⌂', label: 'Home' },
  { key: 'reels', icon: '▶', label: 'Reels' },
  { key: 'create', icon: '+', label: 'Create' },
  { key: 'notifications', icon: '♡', label: 'Notifications' },
  { key: 'menu', icon: '☰', label: 'Menu' },
];

export function ConnectlyApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [platformConfig, setPlatformConfig] = useState<{announcement: string; flags: Record<string, boolean>} | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [tab, setTab] = useState<Tab>('home');
  const [feedMode, setFeedMode] = useState<'for-you' | 'saved'>('for-you');
  const [focusPostId, setFocusPostId] = useState<string | undefined>();
  const [focusComments, setFocusComments] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [screen, setScreen] = useState<
    'main' | 'profile' | 'messages' | 'blocked' | 'groups' | 'settings' | 'search' | 'friend-requests'
  >('main');
  const [settingsKind, setSettingsKind] = useState<
    | 'activity'
    | 'privacy'
    | 'notifications'
    | 'security'
    | 'content'
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
    if (route === 'post' && id) {
      setFocusPostId(id);
      setFeedMode('for-you');
      setTab('home');
      setScreen('main');
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
          onBack={() => setScreen('main')}
        />
      </SafeAreaView>
    );
  if (screen === 'groups')
    return (
      <SafeAreaView style={styles.app} edges={['top', 'bottom']}>
        <GroupsScreen
          accessToken={session.accessToken}
          onBack={() => setScreen('main')}
        />
      </SafeAreaView>
    );
  if (screen === 'settings')
    return (
      <SafeAreaView style={styles.app} edges={['top', 'bottom']}>
        <SettingsDetailScreen
          kind={settingsKind}
          accessToken={session.accessToken}
          onBack={() => setScreen('main')}
          onLogout={logout}
        />
      </SafeAreaView>
    );
  if (screen === 'search')
    return (
      <SafeAreaView style={styles.app} edges={['top', 'bottom']}>
        <SearchScreen
          accessToken={session.accessToken}
          initialQuery={searchQuery}
          onBack={() => setScreen('main')}
          onOpenProfile={target => openProfile(target, 'home')}
        />
      </SafeAreaView>
    );
  if (screen === 'friend-requests')
    return <SafeAreaView style={styles.app} edges={['top', 'bottom']}><FriendRequestsScreen accessToken={session.accessToken} onBack={() => {setScreen('main');setTab('friends');}} onOpenProfile={target => openProfile(target, 'friends')} /></SafeAreaView>;
  const content =
    screen === 'messages' ? (
      <MessagesScreen accessToken={session.accessToken} currentUserId={session.user.id} onBack={() => setScreen('main')} />
    ) : screen === 'profile' ? (
      <ProfileScreen
        user={session.user}
        accessToken={session.accessToken}
        profileUser={profileUser}
        onBack={profileUser ? closeProfile : undefined}
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
    ) : tab === 'create' ? (
      <CreatePostScreen
        user={session.user}
        accessToken={session.accessToken}
        onPublished={() => setRefreshKey(value => value + 1)}
        onClose={() => setTab('home')}
      />
    ) : tab === 'reels' ? (
      <ReelsScreen
        accessToken={session.accessToken}
        onCreate={() => setTab('create')}
      />
    ) : tab === 'friends' ? (
      <FriendsScreen
        accessToken={session.accessToken}
        onOpenRequests={() => setScreen('friend-requests')}
        onOpenProfile={target => openProfile(target, 'friends')}
      />
    ) : tab === 'notifications' ? (
      <NotificationsScreen
        accessToken={session.accessToken}
        profileType={session.user.accountType === 'page' ? 'page' : 'personal'}
        onOpenEntity={item => {
          if (item.entityType === 'post' && item.entityId) {
            setFocusPostId(item.entityId);
            setFocusComments(item.type === 'comment');
            setFeedMode('for-you');
            setTab('home');
            setScreen('main');
          } else if (item.entityType === 'user' && item.actorId?.username) {
            setProfileUser({name: item.actorId.name, username: item.actorId.username});
            setProfileReturnTab('notifications');
            setScreen('profile');
          }
        }}
      />
    ) : tab === 'menu' ? (
      <SettingsScreen
        onBack={() => {
          setFeedMode('for-you');
          setTab('home');
        }}
        onFriends={() => setTab('friends')}
        onSaved={openSaved}
        onMessages={() => setScreen('messages')}
        onBlocked={() => setScreen('blocked')}
        onGroups={() => setScreen('groups')}
        onDetail={kind => {
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
      />
    );
  return (
    <SafeAreaView style={styles.app} edges={['top', 'bottom']}>
      {content}
      {screen === 'main' && (
        <View style={styles.nav}>
          {tabs.map(item => (
            <Pressable
              key={item.key}
              onPress={() => setTab(item.key)}
              style={[styles.navItem, tab === item.key && styles.navItemActive]}
            >
              <View>
                {item.key === 'create' ? <View style={styles.createIcon}><Text style={styles.createIconText}>+</Text></View> : <Text style={[styles.icon, tab === item.key && styles.active]}>{item.icon}</Text>}
                {item.key === 'notifications' && unreadNotifications > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {unreadNotifications > 99 ? '99+' : unreadNotifications}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.label, tab === item.key && styles.active, item.key === 'create' && styles.createLabel]}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
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
  nav: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 14,
    height: 82,
    backgroundColor: colors.surface,
    borderRadius: 27,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 8,
    shadowColor: '#27305F',
    shadowOpacity: 0.14,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 62,
    height: 64,
    borderRadius: 20,
  },
  navItemActive: { backgroundColor: colors.blueSoft },
  icon: { fontSize: 22, color: colors.muted, height: 28, lineHeight: 27 },
  createIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center', marginBottom: 2, shadowColor: colors.blue, shadowOpacity: .3, shadowRadius: 9, shadowOffset: {width: 0, height: 4}, elevation: 5 },
  createIconText: { color: '#fff', fontSize: 27, fontWeight: '400', lineHeight: 31 },
  label: {
    fontSize: 10,
    color: colors.muted,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  active: { color: colors.blue },
  createLabel: { color: colors.inkLight },
  badge: {
    position: 'absolute',
    right: -10,
    top: -4,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: 8,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '900',
    textAlign: 'center',
  },
});
