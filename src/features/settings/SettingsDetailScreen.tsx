import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { apiRequest } from '../../services/api/client';
import { colors, radius, shadow, spacing } from '../../theme/tokens';
type Kind =
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
  | 'monetization';
export function SettingsDetailScreen({
  kind,
  accessToken,
  onBack,
  onLogout,
  onBlocked,
}: {
  kind: Kind;
  accessToken: string;
  onBack: () => void;
  onLogout: () => void;
  onBlocked?: () => void;
}) {
  const [loading, setLoading] = React.useState(
    kind === 'activity' || kind === 'privacy' || kind === 'security' || kind === 'notifications' || kind === 'creator' || kind === 'close-friends' || kind === 'monetization',
  );
  const [items, setItems] = React.useState<any[]>([]);
  const [prefs, setPrefs] = React.useState<any>(null);
  const [following, setFollowing] = React.useState<any[]>([]);
  const [closeFriends, setCloseFriends] = React.useState<Set<string>>(new Set());
  const [monetization, setMonetization] = React.useState<any>(null);
  const [monetizationSaving, setMonetizationSaving] = React.useState(false);
  const [studio, setStudio] = React.useState<any>(null);
  const [privacyAccount, setPrivacyAccount] = React.useState(false);
  const [recommendationPreferences, setRecommendationPreferences] = React.useState<any>(null);
  const [keyword, setKeyword] = React.useState('');
  const [collections, setCollections] = React.useState<any[]>([]);
  const [collectionName, setCollectionName] = React.useState('');
  const [archivedPosts, setArchivedPosts] = React.useState<any[]>([]);
  const [archivedStories, setArchivedStories] = React.useState<any[]>([]);
  const [reportText, setReportText] = React.useState('');
  const labels: { [key in Kind]: [string, string] } = {
    activity: ['Your activity', 'Review your recent account activity.'],
    privacy: [
      'Privacy & security',
      'Control who can see and interact with you.',
    ],
    notifications: [
      'Notification preferences',
      'Choose the updates you want to receive.',
    ],
    security: [
      'Security & login',
      'Review active sessions and protect your account.',
    ],
    content: [
      'Content preferences',
      'Manage hidden words and sensitive content.',
    ],
    collections: ['Content collections', 'Organize saved posts into private folders.'],
    accessibility: ['Accessibility', 'Make Connectly easier to use.'],
    data: ['Your data', 'Export or manage your Connectly data.'],
    support: ['Help & support', 'Find answers and contact the Connectly team.'],
    account: [
      'Account controls',
      'Deactivate or permanently delete your account.',
    ],
    archive: ['Archive', 'Manage content you have archived.'],
    creator: ['Creator dashboard', 'See how your content is performing.'],
    'close-friends': ['Close friends', 'Choose who sees your closer updates.'],
    monetization: ['Monetization', 'Manage tips, subscriptions, and payouts.'],
  };
  React.useEffect(() => {
    void (async () => {
      try {
        if (kind === 'activity')
          setItems(await apiRequest<any[]>('/posts/activity', {}, accessToken));
        if (kind === 'creator') setStudio(await apiRequest<any>('/users/me/creator-studio', {}, accessToken));
        if (kind === 'close-friends') {
          const [friends, selected] = await Promise.all([
            apiRequest<any[]>('/follows', {}, accessToken),
            apiRequest<any[]>('/users/me/close-friends', {}, accessToken),
          ]);
          setFollowing(friends);
          setCloseFriends(new Set(selected.map(item => String(item.friendId?._id ?? item.friendId))));
        }
        if (kind === 'monetization')
          setMonetization(await apiRequest<any>('/users/me/monetization', {}, accessToken));
        if (kind === 'security')
          setItems(await apiRequest<any[]>('/auth/sessions', {}, accessToken));
        if (kind === 'notifications')
          setPrefs(
            await apiRequest<any>(
              '/notifications/preferences',
              {},
              accessToken,
            ),
          );
        if (kind === 'privacy') {
          const profile = await apiRequest<{privateAccount?: boolean}>('/users/me', {}, accessToken);
          setPrivacyAccount(Boolean(profile.privateAccount));
        }
        if (kind === 'content') setRecommendationPreferences(await apiRequest<any>('/users/me/recommendation-preferences', {}, accessToken));
        if (kind === 'collections') setCollections(await apiRequest<any[]>('/posts/collections', {}, accessToken));
        if (kind === 'archive') {
          const [posts, stories] = await Promise.all([
            apiRequest<any[]>('/posts/archived', {}, accessToken),
            apiRequest<any[]>('/stories/archived', {}, accessToken),
          ]);
          setArchivedPosts(posts);
          setArchivedStories(stories);
        }
      } catch {
        if (kind === 'monetization') setMonetization({enabled:false,tipsEnabled:false,subscriptionsEnabled:false,virtualGiftsEnabled:false,payoutEmail:''});
        if (kind === 'creator') setStudio({summary:{posts:0,views:0,reach:0,likes:0,comments:0,shares:0,watchTimeSeconds:0},followers:0,topPosts:[],scheduled:[],drafts:[],mediaLibrary:[],collaborationRequests:[]});
      } finally {
        setLoading(false);
      }
    })();
  }, [accessToken, kind]);
  const toggle = async (key: string, value: boolean) => {
    try {
      const next = await apiRequest<any>(
        '/notifications/preferences',
        { method: 'PATCH', body: JSON.stringify({ [key]: !value }) },
        accessToken,
      );
      setPrefs(next);
    } catch (e) {
      Alert.alert(
        'Unable to update',
        e instanceof Error ? e.message : 'Please try again.',
      );
    }
  };
  const updateMonetization = async (patch: Record<string, unknown>) => {
    setMonetizationSaving(true);
    try {
      const next = await apiRequest<any>('/users/me/monetization', {method:'PATCH', body:JSON.stringify(patch)}, accessToken);
      setMonetization(next);
    } catch (e) {
      Alert.alert('Unable to save monetization settings', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setMonetizationSaving(false);
    }
  };
  const updateCollaboration = async (id: string, status: 'accepted' | 'declined') => {
    try {
      await apiRequest(`/users/me/collaboration-requests/${id}`, {method:'PATCH', body:JSON.stringify({status})}, accessToken);
      setStudio((current: any) => current ? {...current, collaborationRequests:(current.collaborationRequests||[]).map((item:any)=>item._id===id?{...item,status}:item)} : current);
    } catch (e) {
      Alert.alert('Unable to update request', e instanceof Error ? e.message : 'Please try again.');
    }
  };
  const updateRecommendationPreferences = async (patch: Record<string, unknown>) => {
    try {
      setRecommendationPreferences((current: any) => ({...current, ...patch}));
      const value = await apiRequest<any>('/users/me/recommendation-preferences', {method:'PATCH', body:JSON.stringify(patch)}, accessToken);
      setRecommendationPreferences(value);
    } catch (e) {
      Alert.alert('Unable to update content preferences', e instanceof Error ? e.message : 'Please try again.');
      const value = await apiRequest<any>('/users/me/recommendation-preferences', {}, accessToken).catch(() => null);
      if (value) setRecommendationPreferences(value);
    }
  };
  const createCollection = async () => {
    const name = collectionName.trim();
    if (!name) return;
    try {
      const created = await apiRequest<any>('/posts/collections', {method:'POST', body:JSON.stringify({name})}, accessToken);
      setCollections(value => [created, ...value]);
      setCollectionName('');
    } catch (e) {
      Alert.alert('Unable to create collection', e instanceof Error ? e.message : 'Please try again.');
    }
  };
  const deleteCollection = async (id: string) => {
    try {
      await apiRequest(`/posts/collections/${id}`, {method:'DELETE'}, accessToken);
      setCollections(value => value.filter(item => item._id !== id));
    } catch (e) {
      Alert.alert('Unable to delete collection', e instanceof Error ? e.message : 'Please try again.');
    }
  };
  const action = async (label: string) => {
    if (label === 'Export my data') {
      try {
        const data = await apiRequest<any>(
          '/auth/account/export',
          {},
          accessToken,
        );
        Alert.alert(
          'Data export ready',
          `Your account export was prepared at ${data.exportedAt}.`,
        );
      } catch (e) {
        Alert.alert(
          'Export failed',
          e instanceof Error ? e.message : 'Please try again.',
        );
      }
    } else if (label === 'Log out all other sessions') {
      await apiRequest('/auth/logout-all', { method: 'POST' }, accessToken);
      Alert.alert(
        'Sessions revoked',
        'All refresh sessions have been revoked.',
      );
      setItems([]);
    } else if (label === 'Deactivate account') {
      Alert.alert(
        'Deactivate account',
        'Your account will be hidden until you sign in again.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Deactivate',
            style: 'destructive',
            onPress: async () => {
              await apiRequest(
                '/auth/deactivate',
                { method: 'POST' },
                accessToken,
              );
              onLogout();
            },
          },
        ],
      );
    } else if (label === 'Delete account') {
      Alert.alert('Delete account', 'This permanently removes your account.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await apiRequest(
              '/auth/account',
              { method: 'DELETE' },
              accessToken,
            );
            onLogout();
          },
        },
      ]);
    } else if (label === 'Blocked accounts') {
      onBlocked?.();
    } else
      Alert.alert(
        label,
        'This control is ready for its next policy-specific configuration.',
      );
  };
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View>
          <Text style={styles.kicker}>SETTINGS</Text>
          <Text style={styles.title}>{labels[kind][0]}</Text>
        </View>
      </View>
      <Text style={styles.subtitle}>{labels[kind][1]}</Text>
      {loading ? (
        <ActivityIndicator color={colors.blue} style={styles.loader} />
      ) : kind === 'privacy' ? (
        <View>
          <Pressable style={styles.row} onPress={async () => {
            const next = !privacyAccount;
            try {
              await apiRequest('/users/me', {method: 'PATCH', body: JSON.stringify({privateAccount: next})}, accessToken);
              setPrivacyAccount(next);
            } catch (e) {
              Alert.alert('Unable to update privacy', e instanceof Error ? e.message : 'Please try again.');
            }
          }}>
            <View style={styles.copy}><Text style={styles.rowTitle}>Private account</Text><Text style={styles.rowMeta}>{privacyAccount ? 'Only approved friends can see your posts' : 'Anyone can see your public posts'}</Text></View>
            <View style={[styles.toggle, privacyAccount && styles.toggleOn]}><View style={[styles.thumb, privacyAccount && styles.thumbOn]} /></View>
          </Pressable>
          <Text style={styles.sectionHint}>Your privacy setting applies immediately to profile posts and the Friends list. You can change it anytime.</Text>
          {['Blocked accounts', 'Muted accounts', 'Restricted accounts'].map(label => <Pressable style={styles.row} key={label} onPress={() => void action(label)}><View style={styles.copy}><Text style={styles.rowTitle}>{label}</Text><Text style={styles.rowMeta}>Manage who can interact with you</Text></View><Text style={styles.chevron}>›</Text></Pressable>)}
        </View>
      ) : kind === 'notifications' && prefs ? (
        <View>
          {(['engagement', 'social', 'messages', 'account'] as const).map(
            key => (
              <Pressable
                key={key}
                style={styles.row}
                onPress={() => void toggle(key, Boolean(prefs[key]))}
              >
                <View style={styles.copy}>
                  <Text style={styles.rowTitle}>
                    {key[0].toUpperCase() + key.slice(1)}
                  </Text>
                  <Text style={styles.rowMeta}>
                    In-app and push notifications
                  </Text>
                </View>
                <View style={[styles.toggle, prefs[key] && styles.toggleOn]}>
                  <View style={[styles.thumb, prefs[key] && styles.thumbOn]} />
                </View>
              </Pressable>
            ),
          )}
        </View>
      ) : kind === 'collections' ? (
        <View><Text style={styles.sectionHint}>Collections are private folders for organizing saved posts. Create and manage your folders here.</Text><View style={styles.collectionCreate}><TextInput value={collectionName} onChangeText={setCollectionName} onSubmitEditing={() => void createCollection()} placeholder="New collection name" placeholderTextColor={colors.muted} style={styles.collectionInput}/><Pressable onPress={() => void createCollection()}><Text style={styles.actionText}>Create</Text></Pressable></View>{collections.map(collection=><View style={styles.row} key={collection._id}><View style={styles.copy}><Text style={styles.rowTitle}>{collection.name}</Text><Text style={styles.rowMeta}>{collection.postIds?.length||0} saved posts</Text></View><Pressable onPress={() => void deleteCollection(collection._id)}><Text style={styles.actionText}>Delete</Text></Pressable></View>)}{!collections.length?<Text style={styles.empty}>Create your first private collection.</Text>:null}</View>
      ) : kind === 'content' && recommendationPreferences ? (
        <View>
          <Pressable style={styles.row} onPress={() => void updateRecommendationPreferences({chronological:!recommendationPreferences.chronological})}><View style={styles.copy}><Text style={styles.rowTitle}>Chronological feed</Text><Text style={styles.rowMeta}>Show the newest posts first</Text></View><View style={[styles.toggle,recommendationPreferences.chronological&&styles.toggleOn]}><View style={[styles.thumb,recommendationPreferences.chronological&&styles.thumbOn]}/></View></Pressable>
          <Pressable style={styles.row} onPress={() => void updateRecommendationPreferences({showReasons:!recommendationPreferences.showReasons})}><View style={styles.copy}><Text style={styles.rowTitle}>Why posts are recommended</Text><Text style={styles.rowMeta}>Show explanations on suggested posts</Text></View><View style={[styles.toggle,recommendationPreferences.showReasons&&styles.toggleOn]}><View style={[styles.thumb,recommendationPreferences.showReasons&&styles.thumbOn]}/></View></Pressable>
          <View style={styles.keywordBox}><Text style={styles.rowTitle}>Mute keywords</Text><Text style={styles.rowMeta}>Hide posts containing these words or phrases.</Text><View style={styles.keywordInputRow}><TextInput value={keyword} onChangeText={setKeyword} onSubmitEditing={() => { const value=keyword.trim(); if(value && !(recommendationPreferences.mutedKeywords||[]).includes(value)) { void updateRecommendationPreferences({mutedKeywords:[...(recommendationPreferences.mutedKeywords||[]),value]}); setKeyword(''); } }} placeholder="Add a word or phrase" placeholderTextColor={colors.muted} style={styles.keywordInput}/><Pressable onPress={() => { const value=keyword.trim(); if(value && !(recommendationPreferences.mutedKeywords||[]).includes(value)) { void updateRecommendationPreferences({mutedKeywords:[...(recommendationPreferences.mutedKeywords||[]),value]}); setKeyword(''); } }}><Text style={styles.actionText}>Add</Text></Pressable></View>{(recommendationPreferences.mutedKeywords||[]).map((value:string)=><View style={styles.keywordPill} key={value}><Text style={styles.keywordText}>{value}</Text><Pressable onPress={() => void updateRecommendationPreferences({mutedKeywords:(recommendationPreferences.mutedKeywords||[]).filter((item:string)=>item!==value)})}><Text style={styles.keywordRemove}>×</Text></Pressable></View>)}</View>
          <Pressable style={styles.primary} onPress={()=>Alert.alert('Reset personalized recommendations','This clears your feed preferences and muted keywords.',[{text:'Cancel',style:'cancel'},{text:'Reset',style:'destructive',onPress:async()=>{try { await apiRequest('/users/me/recommendation-preferences/reset',{method:'POST'},accessToken); setRecommendationPreferences({chronological:false,showReasons:true,mutedKeywords:[]}); } catch (e) { Alert.alert('Unable to reset recommendations', e instanceof Error ? e.message : 'Please try again.'); }}}])}><Text style={styles.primaryText}>Reset personalized recommendations</Text></Pressable>
        </View>
      ) : kind === 'security' ? (
        <View>
          {items.map(item => (
            <View style={styles.row} key={item._id}>
              <View style={styles.copy}>
                <Text style={styles.rowTitle}>Active session</Text>
                <Text style={styles.rowMeta}>
                  Created {new Date(item.createdAt).toLocaleString()}
                </Text>
              </View>
              <Pressable
                onPress={() =>
                  void apiRequest(
                    `/auth/sessions/${item._id}`,
                    { method: 'DELETE' },
                    accessToken,
                  ).then(() =>
                    setItems(current =>
                      current.filter(value => value._id !== item._id),
                    ),
                  )
                }
              >
                <Text style={styles.actionText}>Revoke</Text>
              </Pressable>
            </View>
          ))}
          <Pressable
            style={styles.primary}
            onPress={() => void action('Log out all other sessions')}
          >
            <Text style={styles.primaryText}>Log out all other sessions</Text>
          </Pressable>
        </View>
      ) : kind === 'close-friends' ? (
        <View>
          <Text style={styles.sectionHint}>People you add here can receive posts and stories shared with the Close friends audience.</Text>
          {following.map(item => {
            const person = item.followingId;
            if (!person) return null;
            const selected = closeFriends.has(String(person._id));
            return <Pressable style={styles.row} key={person._id} onPress={async () => { const next = new Set(closeFriends); try { if (selected) { await apiRequest(`/users/me/close-friends/${person._id}`, {method:'DELETE'}, accessToken); next.delete(String(person._id)); } else { await apiRequest(`/users/me/close-friends/${person._id}`, {method:'PUT'}, accessToken); next.add(String(person._id)); } setCloseFriends(next); } catch (e) { Alert.alert('Unable to update close friends', e instanceof Error ? e.message : 'Please try again.'); } }}><View style={styles.copy}><Text style={styles.rowTitle}>{person.name}</Text><Text style={styles.rowMeta}>@{person.username}</Text></View><Text style={styles.actionText}>{selected ? 'Remove' : 'Add'}</Text></Pressable>;
          })}
          {!following.length ? <Text style={styles.empty}>Follow people first to add close friends.</Text> : null}
        </View>
      ) : kind === 'monetization' ? (
        <View>
          <Text style={styles.sectionHint}>Your settings are saved to your account and can be changed anytime.</Text>
          {(['enabled','tipsEnabled','subscriptionsEnabled','virtualGiftsEnabled'] as const).map(key => <Pressable style={styles.row} key={key} disabled={monetizationSaving} onPress={() => void updateMonetization({[key]: !monetization?.[key]})}><View style={styles.copy}><Text style={styles.rowTitle}>{key === 'enabled' ? 'Enable monetization' : key === 'tipsEnabled' ? 'Accept tips' : key === 'subscriptionsEnabled' ? 'Offer subscriptions' : 'Accept virtual gifts'}</Text><Text style={styles.rowMeta}>{monetization?.[key] ? 'Enabled' : 'Disabled'}</Text></View><Text style={styles.actionText}>{monetizationSaving ? 'Saving…' : monetization?.[key] ? 'On' : 'Off'}</Text></Pressable>)}
          <Text style={styles.inputLabel}>Payout email</Text>
          <TextInput value={monetization?.payoutEmail ?? ''} onChangeText={value => setMonetization({...monetization,payoutEmail:value})} onEndEditing={() => void updateMonetization({payoutEmail:monetization?.payoutEmail ?? ''})} placeholder="creator@example.com" placeholderTextColor={colors.muted} autoCapitalize="none" keyboardType="email-address" style={styles.input} />
        </View>
      ) : kind === 'creator' && studio ? (
        <View>
          <Text style={styles.studioSection}>Overview</Text>
          <View style={styles.metricGrid}>{[['Views',studio.summary.views],['Reach',studio.summary.reach],['Engagement',studio.summary.likes+studio.summary.comments+studio.summary.shares],['Watch time',`${Math.round((studio.summary.watchTimeSeconds||0)/60)}m`],['Followers',studio.followers],['Posts',studio.summary.posts]].map(([label,value])=><View style={styles.metricCard} key={String(label)}><Text style={styles.metricValue}>{String(value)}</Text><Text style={styles.rowMeta}>{String(label)}</Text></View>)}</View>
          <Text style={styles.studioSection}>Best-performing posts</Text>
          {(studio.topPosts||[]).map((post:any)=><View style={styles.row} key={post._id}><View style={styles.copy}><Text style={styles.rowTitle} numberOfLines={2}>{post.body || 'Media post'}</Text><Text style={styles.rowMeta}>{post.reactionCount} likes · {post.commentCount} comments · {post.viewCount||0} views</Text></View></View>)}
          <Text style={styles.studioSection}>Content calendar</Text>
          {(studio.scheduled||[]).map((post:any)=><View style={styles.row} key={post._id}><View style={styles.copy}><Text style={styles.rowTitle}>{post.body || 'Scheduled media'}</Text><Text style={styles.rowMeta}>{new Date(post.scheduledFor).toLocaleString()}</Text></View></View>)}
          <Text style={styles.studioSection}>Saved drafts & media library</Text><Text style={styles.sectionHint}>{studio.drafts?.length||0} drafts · {studio.mediaLibrary?.length||0} media items</Text>
          {(studio.collaborationRequests||[]).map((request:any)=><View style={styles.row} key={request._id}><View style={styles.copy}><Text style={styles.rowTitle}>{request.brandName}</Text><Text style={styles.rowMeta}>{request.brief || 'Brand collaboration request'} · {request.status}</Text></View>{request.status==='pending'?<View style={styles.requestActions}><Pressable onPress={()=>void updateCollaboration(request._id,'accepted')}><Text style={styles.actionText}>Accept</Text></Pressable><Pressable onPress={()=>void updateCollaboration(request._id,'declined')}><Text style={styles.actionText}>Decline</Text></Pressable></View>:null}</View>)}
          {!(studio.collaborationRequests||[]).length ? <Text style={styles.empty}>No brand collaboration requests yet.</Text> : null}
        </View>
      ) : kind === 'archive' ? (
        <View>
          <Text style={styles.sectionHint}>Archived content is hidden from your profile and feeds until you restore it.</Text>
          <Text style={styles.studioSection}>Posts</Text>
          {archivedPosts.map(post => (
            <View style={styles.row} key={post._id}>
              <View style={styles.copy}>
                <Text style={styles.rowTitle} numberOfLines={2}>{post.body || 'Media post'}</Text>
                <Text style={styles.rowMeta}>{new Date(post.createdAt).toLocaleString()}</Text>
              </View>
              <Pressable onPress={async () => { await apiRequest(`/posts/${post._id}/archive`, {method: 'DELETE'}, accessToken); setArchivedPosts(value => value.filter(item => item._id !== post._id)); }}>
                <Text style={styles.actionText}>Unarchive</Text>
              </Pressable>
            </View>
          ))}
          {!archivedPosts.length ? <Text style={styles.empty}>No archived posts.</Text> : null}
          <Text style={styles.studioSection}>Stories</Text>
          {archivedStories.map(story => (
            <View style={styles.row} key={story._id}>
              <View style={styles.copy}>
                <Text style={styles.rowTitle} numberOfLines={2}>{story.body || 'Media story'}</Text>
                <Text style={styles.rowMeta}>{new Date(story.createdAt).toLocaleString()}</Text>
              </View>
              <Pressable onPress={async () => { await apiRequest(`/stories/${story._id}/archive`, {method: 'DELETE'}, accessToken); setArchivedStories(value => value.filter(item => item._id !== story._id)); }}>
                <Text style={styles.actionText}>Unarchive</Text>
              </Pressable>
            </View>
          ))}
          {!archivedStories.length ? <Text style={styles.empty}>No archived stories.</Text> : null}
        </View>
      ) : kind === 'support' ? (
        <View>
          <View style={styles.supportCard}>
            <Text style={styles.rowTitle}>Help center</Text>
            <Text style={styles.rowMeta}>Common answers for account, privacy, groups, posts, and notifications.</Text>
            {['How do I change my privacy?', 'How do I manage a group?', 'How do I recover my account?'].map(question => (
              <Pressable key={question} style={styles.supportQuestion} onPress={() => Alert.alert(question, question.includes('privacy') ? 'Open Privacy and security to change your account visibility and blocked accounts.' : question.includes('group') ? 'Open Groups and Pages to manage members, roles, approvals, posts, and group identity.' : 'Use Security and login to review sessions, then contact support if you still need help.')}>
                <Text style={styles.rowMeta}>{question}</Text><Text style={styles.chevron}>›</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.supportCard}>
            <Text style={styles.rowTitle}>Report a problem</Text>
            <Text style={styles.rowMeta}>Tell us what went wrong and our team can investigate it.</Text>
            <TextInput value={reportText} onChangeText={setReportText} multiline placeholder="Describe the problem" placeholderTextColor={colors.muted} style={styles.reportInput} />
            <Pressable style={styles.primary} disabled={!reportText.trim()} onPress={async () => { try { await apiRequest('/reports', {method: 'POST', body: JSON.stringify({targetType: 'platform', reason: reportText.trim()})}, accessToken); setReportText(''); Alert.alert('Report submitted', 'Thanks. Your report has been sent to the Connectly team.'); } catch (e) { Alert.alert('Unable to submit report', e instanceof Error ? e.message : 'Please try again.'); } }}><Text style={styles.primaryText}>Submit report</Text></Pressable>
          </View>
          <View style={styles.supportCard}>
            <Text style={styles.rowTitle}>Community guidelines</Text>
            <Text style={styles.rowMeta}>Be respectful, protect personal information, avoid harassment, and only share content you have the right to publish. Repeated violations may result in content removal or account restrictions.</Text>
          </View>
        </View>
      ) : kind === 'activity' ? (
        <View>
          <Text style={styles.sectionHint}>Your recent post viewing activity is shown here. Likes, comments, follows, and account changes remain available in Notifications and Your profile.</Text>
          {items.map(item => (
            <View style={styles.row} key={item._id}>
              <View style={styles.copy}>
                <Text style={styles.rowTitle}>
                  {item.postId?.body || 'Viewed post'}
                </Text>
                <Text style={styles.rowMeta}>
                  {item.viewedAt
                    ? new Date(item.viewedAt).toLocaleString()
                    : ''}
                </Text>
              </View>
            </View>
          ))}
          {!items.length ? <Text style={styles.empty}>No recent activity yet. Open a post to start building your activity history.</Text> : null}
        </View>
      ) : (
        <View>
          {(kind === 'data'
            ? ['Export my data', 'Clear search history']
            : kind === 'account'
            ? ['Deactivate account', 'Delete account']
            : kind === 'content'
            ? ['Hidden words', 'Sensitive content', 'Muted topics']
            : kind === 'accessibility'
            ? ['Captions', 'Text size', 'Reduced motion']
            : ['Password', 'Two-factor authentication']
          ).map(label => (
            <Pressable
              style={styles.row}
              key={label}
              onPress={() => void action(label)}
            >
              <View style={styles.copy}>
                <Text style={styles.rowTitle}>{label}</Text>
                <Text style={styles.rowMeta}>Manage this setting</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.canvas, paddingHorizontal: spacing.md },
  content: { paddingTop: spacing.md, paddingBottom: 120 },
  header: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
  back: {
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
  backText: { fontSize: 30, color: colors.ink },
  kicker: {
    fontSize: 10,
    letterSpacing: 1.5,
    color: colors.blue,
    fontWeight: '900',
    marginLeft: spacing.sm,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.ink,
    marginLeft: spacing.sm,
  },
  subtitle: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 20,
    marginVertical: spacing.md,
  },
  loader: { marginTop: spacing.xl },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadow,
  },
  copy: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: '900', color: colors.ink },
  rowMeta: { fontSize: 11, color: colors.muted, marginTop: 4 },
  sectionHint: { color: colors.muted, fontSize: 13, lineHeight: 20, marginBottom: spacing.sm },
  empty: { color: colors.muted, fontSize: 13, paddingVertical: spacing.lg },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, color: colors.ink, marginTop: spacing.md },
  metricValue: { fontSize: 20, fontWeight: '900', color: colors.blue },
  chevron: { fontSize: 28, color: colors.muted },
  actionText: { fontSize: 12, color: colors.blue, fontWeight: '900' },
  inputLabel: { color: colors.ink, fontSize: 12, fontWeight: '900', marginTop: spacing.md },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border,
    padding: 3,
  },
  toggleOn: { backgroundColor: colors.blue },
  thumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' },
  thumbOn: { alignSelf: 'flex-end' },
  primary: {
    backgroundColor: colors.blue,
    borderRadius: radius.pill,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  primaryText: { color: '#fff', fontWeight: '900' },
  collectionCreate: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  collectionInput: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, color: colors.ink, marginRight: spacing.sm },
  studioSection: { color: colors.ink, fontSize: 16, fontWeight: '900', marginTop: spacing.md, marginBottom: spacing.sm },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metricCard: { width: '31%', minHeight: 76, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.sm },
  requestActions: { gap: spacing.sm },
  supportCard: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.md, ...shadow },
  supportQuestion: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.borderLight, paddingVertical: spacing.md, marginTop: spacing.sm },
  reportInput: { minHeight: 100, textAlignVertical: 'top', backgroundColor: colors.canvas, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, color: colors.ink, marginTop: spacing.md },
  keywordBox: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm },
  keywordInputRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
  keywordInput: { flex: 1, color: colors.ink, borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: spacing.sm, marginRight: spacing.md },
  keywordPill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: colors.canvas, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 6, marginTop: spacing.sm },
  keywordText: { color: colors.ink, fontSize: 12 },
  keywordRemove: { color: colors.muted, fontSize: 18, marginLeft: spacing.sm },
});
