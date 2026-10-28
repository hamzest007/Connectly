import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FeedScreen } from '../features/feed/FeedScreen';
import { CreatePostScreen } from '../features/posts/CreatePostScreen';
import { FriendsScreen } from '../features/friends/FriendsScreen';
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
  { key: 'search', icon: '⌕', label: 'Search' },
  { key: 'reels', icon: '▶', label: 'Reels' },
  { key: 'create', icon: '+', label: 'Create' },
  { key: 'menu', icon: '☰', label: 'Menu' },
];

export function ConnectlyApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [restoring, setRestoring] = useState(true);
  const [tab, setTab] = useState<Tab>('home');
  const [feedMode, setFeedMode] = useState<'for-you' | 'saved'>('for-you');
  const [screen, setScreen] = useState<
    'main' | 'profile' | 'messages' | 'blocked' | 'groups' | 'settings'
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
  >('activity');
  const [profileUser, setProfileUser] = useState<
    { name: string; username: string } | undefined
  >();
  const [profileReturnTab, setProfileReturnTab] = useState<Tab>('friends');
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
      '/notifications/unread-count',
      {},
      session.accessToken,
    )
      .then(result => setUnreadNotifications(result.count))
      .catch(() => undefined);
  }, [session, refreshKey, tab]);
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
  const content =
    screen === 'messages' ? (
      <MessagesScreen accessToken={session.accessToken} />
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
      />
    ) : tab === 'create' ? (
      <CreatePostScreen
        user={session.user}
        accessToken={session.accessToken}
        onPublished={() => setRefreshKey(value => value + 1)}
        onClose={() => setTab('home')}
      />
    ) : tab === 'search' ? (
      <SearchScreen
        accessToken={session.accessToken}
        onOpenProfile={target => openProfile(target, 'home')}
      />
    ) : tab === 'reels' ? (
      <ReelsScreen
        accessToken={session.accessToken}
        onCreate={() => setTab('create')}
      />
    ) : tab === 'friends' ? (
      <FriendsScreen
        accessToken={session.accessToken}
        onOpenProfile={target => openProfile(target, 'friends')}
      />
    ) : tab === 'notifications' ? (
      <NotificationsScreen accessToken={session.accessToken} />
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
        onCreatePost={() => setTab('create')}
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
                {item.key === 'menu' || item.key === 'home' ? (
                  <Text
                    style={[styles.icon, tab === item.key && styles.active]}
                  >
                    {item.icon}
                  </Text>
                ) : (
                  <Text
                    style={[styles.icon, tab === item.key && styles.active]}
                  >
                    {item.icon}
                  </Text>
                )}
                {item.key === 'menu' && unreadNotifications > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {unreadNotifications > 99 ? '99+' : unreadNotifications}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.label, tab === item.key && styles.active]}>
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
    bottom: 12,
    height: 72,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 4,
    shadowColor: '#27305F',
    shadowOpacity: 0.14,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 50,
    height: 54,
    borderRadius: radius.md,
  },
  navItemActive: { backgroundColor: colors.blueSoft },
  icon: { fontSize: 21, color: colors.muted, height: 27, lineHeight: 25 },
  label: {
    fontSize: 9,
    color: colors.muted,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  active: { color: colors.blue },
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
