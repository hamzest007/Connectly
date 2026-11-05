import React from 'react';
import {ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View} from 'react-native';
import {apiRequest} from '../../services/api/client';
import {colors, radius, shadow, spacing} from '../../theme/tokens';

type Idea = {_id?: string; kind: 'post'|'reel'|'story'; title: string; prompt: string; hashtags: string[]; saved?: boolean; plannedFor?: string | null};
const tabs = ['for-you', 'trending', 'post', 'reel', 'saved', 'planner'] as const;
export function CreatorIdeasScreen({accessToken, onBack, onCreate}: {accessToken: string; onBack: () => void; onCreate: (kind: 'post'|'reel', prompt: string) => void}) {
  const [tab, setTab] = React.useState<typeof tabs[number]>('for-you');
  const [items, setItems] = React.useState<Idea[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState('');
  const load = React.useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    setError('');
    try { const result = await apiRequest<{items: Idea[]}>('/creator-ideas?' + new URLSearchParams({tab: tab === 'post' || tab === 'reel' ? 'for-you' : tab}).toString(), {}, accessToken); setItems(tab === 'post' || tab === 'reel' ? result.items.filter(item => item.kind === tab) : result.items); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to load ideas.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, [accessToken, tab]);
  React.useEffect(() => { void load(); }, [load]);
  const save = async (idea: Idea) => {
    if (!idea._id) {
      try { const created = await apiRequest<Idea>('/creator-ideas', {method: 'POST', body: JSON.stringify(idea)}, accessToken); setItems(value => value.map(item => item.title === idea.title ? created : item)); }
      catch (e) { Alert.alert('Unable to save idea', e instanceof Error ? e.message : 'Please try again.'); }
      return;
    }
    const nextSaved = idea.saved === false;
    setItems(value => value.map(item => item._id === idea._id ? {...item, saved: nextSaved} : item));
    try { await apiRequest(`/creator-ideas/${idea._id}`, {method: 'PATCH', body: JSON.stringify({saved: nextSaved})}, accessToken); }
    catch (e) { setItems(value => value.map(item => item._id === idea._id ? {...item, saved: idea.saved} : item)); Alert.alert('Unable to update idea', e instanceof Error ? e.message : 'Please try again.'); }
  };
  return <View style={styles.page}><View style={styles.header}><Pressable onPress={onBack} accessibilityLabel="Back"><Text style={styles.back}>‹</Text></Pressable><View style={styles.headerCopy}><Text style={styles.kicker}>CREATOR STUDIO</Text><Text style={styles.title}>Creator ideas</Text></View><Text style={styles.spark}>✦</Text></View><Text style={styles.subtitle}>Useful prompts for your next post, reel or story.</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>{tabs.map(item => <Pressable key={item} onPress={() => setTab(item)} style={[styles.tab, tab === item && styles.tabActive]}><Text style={[styles.tabText, tab === item && styles.tabTextActive]}>{item === 'for-you' ? 'For You' : item === 'post' ? 'Post Ideas' : item === 'reel' ? 'Reel Ideas' : item[0].toUpperCase() + item.slice(1)}</Text></Pressable>)}</ScrollView>{loading ? <View style={styles.center}><ActivityIndicator color={colors.blue}/></View> : error ? <View style={styles.center}><Text style={styles.emptyTitle}>Could not load ideas</Text><Text style={styles.emptyText}>{error}</Text><Pressable style={styles.primary} onPress={() => void load()}><Text style={styles.primaryText}>Retry</Text></Pressable></View> : <FlatList data={items} keyExtractor={(item, index) => item._id ?? `${item.title}-${index}`} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.blue}/>} contentContainerStyle={styles.list} renderItem={({item}) => <View style={styles.card}><View style={styles.cardTop}><View style={[styles.kind, item.kind === 'reel' && styles.reelKind]}><Text style={styles.kindText}>{item.kind.toUpperCase()}</Text></View><Pressable accessibilityLabel={item.saved ? 'Remove from saved ideas' : 'Save idea'} onPress={() => void save(item)}><Text style={styles.save}>{item.saved ? '★' : '☆'}</Text></Pressable></View><Text style={styles.cardTitle}>{item.title}</Text><Text style={styles.prompt}>{item.prompt}</Text><Text style={styles.tags}>{item.hashtags.join('  ')}</Text><View style={styles.cardActions}><Pressable style={styles.createButton} onPress={() => onCreate(item.kind === 'reel' ? 'reel' : 'post', item.prompt)}><Text style={styles.createText}>Create now</Text></Pressable><Text style={styles.templateNote}>Template-based prompt</Text></View></View>} ListEmptyComponent={<View style={styles.center}><Text style={styles.emptyIcon}>✦</Text><Text style={styles.emptyTitle}>No saved ideas yet</Text><Text style={styles.emptyText}>Save a prompt and it will appear here.</Text></View>}/>}</View>;
}
const styles = StyleSheet.create({
  page: {flex:1,backgroundColor:colors.canvas,paddingHorizontal:spacing.lg,paddingTop:spacing.md},
  header: {flexDirection:'row',alignItems:'center',gap:spacing.sm,marginBottom:spacing.sm},
  back: {fontSize:34,color:colors.ink,lineHeight:38,paddingHorizontal:spacing.xs},
  headerCopy: {flex:1},
  kicker: {color:colors.blue,fontSize:10,fontWeight:'900',letterSpacing:1.5},
  title: {fontSize:30,fontWeight:'900',color:colors.ink,letterSpacing:-0.7},
  spark: {fontSize:28,color:colors.blue},
  subtitle: {fontSize:15,color:colors.muted,lineHeight:21,marginBottom:spacing.md},
  tabs: {gap:spacing.sm,paddingBottom:spacing.md,alignItems:'center'},
  tab: {minHeight:46,paddingHorizontal:spacing.lg,borderRadius:radius.pill,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,alignItems:'center',justifyContent:'center'},
  tabActive: {backgroundColor:colors.blue,borderColor:colors.blue},
  tabText: {fontSize:12,lineHeight:16,color:colors.muted,fontWeight:'800'},
  tabTextActive: {color:'#fff'},
  list: {paddingBottom:spacing.xl},
  card: {backgroundColor:colors.surface,borderRadius:radius.xl,borderWidth:1,borderColor:colors.border,padding:spacing.lg,marginBottom:spacing.md,...shadow},
  cardTop: {flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  kind: {backgroundColor:colors.blueSoft,borderRadius:radius.pill,paddingHorizontal:spacing.md,paddingVertical:7},
  reelKind: {backgroundColor:colors.lavender},
  kindText: {fontSize:10,fontWeight:'900',color:colors.blue,letterSpacing:1},
  save: {fontSize:28,color:colors.blue,lineHeight:30},
  cardTitle: {fontSize:20,fontWeight:'900',color:colors.ink,marginTop:spacing.lg},
  prompt: {fontSize:15,color:colors.ink,lineHeight:23,marginTop:spacing.sm},
  tags: {color:colors.blue,fontSize:12,fontWeight:'800',marginTop:spacing.md},
  cardActions: {flexDirection:'row',alignItems:'center',marginTop:spacing.lg},
  createButton: {backgroundColor:colors.blue,borderRadius:radius.pill,paddingHorizontal:spacing.lg,paddingVertical:12},
  createText: {color:'#fff',fontWeight:'900',fontSize:13},
  templateNote: {color:colors.muted,fontSize:11,marginLeft:spacing.sm},
  center: {alignItems:'center',justifyContent:'center',paddingVertical:spacing.xl},
  emptyIcon: {fontSize:34,color:colors.blue},
  emptyTitle: {fontSize:18,color:colors.ink,fontWeight:'900',marginTop:spacing.sm},
  emptyText: {fontSize:13,color:colors.muted,textAlign:'center',marginTop:4},
  primary: {backgroundColor:colors.blue,borderRadius:radius.pill,paddingHorizontal:spacing.lg,paddingVertical:spacing.sm,marginTop:spacing.md},
  primaryText: {color:'#fff',fontWeight:'900'},
});
