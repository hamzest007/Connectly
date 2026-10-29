import React from 'react';
import {ActivityIndicator, Alert, FlatList, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {apiRequest} from '../../services/api/client';
import {pickMedia, uploadMedia} from '../../services/media/cloudinary';
import {colors, radius, shadow, spacing} from '../../theme/tokens';

type EventItem = {
  _id: string; title: string; description: string; coverUrl?: string; startsAt: string; endsAt: string;
  venue?: string; onlineUrl?: string; category: string; visibility: string; status: string;
  hostId?: {name: string; username: string; avatarUrl?: string}; myRsvp?: 'going'|'interested'|'not-going'|null;
  attendeeCounts?: Record<string, number>;
};
type Tab = 'discover'|'mine'|'calendar';
const categories = ['all', 'music', 'technology', 'education', 'sports', 'fitness', 'business', 'community'];
const formatDate = (value: string) => new Date(value).toLocaleString([], {weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'});

export function EventsScreen({accessToken, onBack}: {accessToken: string; onBack: () => void}) {
  const [tab, setTab] = React.useState<Tab>('discover');
  const [category, setCategory] = React.useState('all');
  const [query, setQuery] = React.useState('');
  const [events, setEvents] = React.useState<EventItem[]>([]);
  const [selected, setSelected] = React.useState<EventItem | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [hasMore, setHasMore] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [coverUrl, setCoverUrl] = React.useState('');
  const [startsAt, setStartsAt] = React.useState('');
  const [endsAt, setEndsAt] = React.useState('');
  const [venue, setVenue] = React.useState('');
  const [onlineUrl, setOnlineUrl] = React.useState('');
  const [createCategory, setCreateCategory] = React.useState('community');
  const [saving, setSaving] = React.useState(false);
  const [uploadingCover, setUploadingCover] = React.useState(false);

  const load = React.useCallback(async (pageNumber = 1, refresh = false) => {
    if (refresh) setRefreshing(true); else if (pageNumber > 1) setLoadingMore(true); else setLoading(true);
    setError('');
    try {
      const result = await apiRequest<{items: EventItem[]; page: number; hasMore: boolean}>('/events?' + new URLSearchParams({tab, q: query, page: String(pageNumber), ...(category !== 'all' ? {category} : {})}).toString(), {}, accessToken);
      setEvents(value => pageNumber === 1 ? result.items : [...value, ...result.items.filter(item => !value.some(existing => existing._id === item._id))]);
      setPage(result.page); setHasMore(result.hasMore);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load events.'); }
    finally { setLoading(false); setRefreshing(false); setLoadingMore(false); }
  }, [accessToken, category, query, tab]);
  React.useEffect(() => { void load(1); }, [load]);

  const resetForm = () => { setTitle(''); setDescription(''); setCoverUrl(''); setStartsAt(''); setEndsAt(''); setVenue(''); setOnlineUrl(''); setCreateCategory('community'); };
  const uploadCover = async () => {
    if (uploadingCover) return;
    setUploadingCover(true);
    try { const media = await pickMedia('photo'); if (!media[0]) return; const uploaded = await uploadMedia(media[0], accessToken); setCoverUrl(uploaded.url); }
    catch (e) { Alert.alert('Unable to upload cover', e instanceof Error ? e.message : 'Please try again.'); }
    finally { setUploadingCover(false); }
  };
  const create = async () => {
    if (!title.trim() || !startsAt || !endsAt || (!venue.trim() && !onlineUrl.trim())) { Alert.alert('Complete your event', 'Add a title, start/end time, and venue or online link.'); return; }
    setSaving(true);
    try {
      const event = await apiRequest<EventItem>('/events', {method: 'POST', body: JSON.stringify({title, description, coverUrl, startsAt: new Date(startsAt).toISOString(), endsAt: new Date(endsAt).toISOString(), venue, onlineUrl, category: createCategory})}, accessToken);
      setEvents(value => [event, ...value]); resetForm(); setCreating(false); setTab('mine');
    } catch (e) { Alert.alert('Unable to create event', e instanceof Error ? e.message : 'Please try again.'); }
    finally { setSaving(false); }
  };
  const rsvp = async (status: 'going'|'interested'|'not-going') => {
    if (!selected) return;
    const previous = selected.myRsvp;
    setSelected(value => value ? {...value, myRsvp: status} : value);
    setEvents(value => value.map(item => item._id === selected._id ? {...item, myRsvp: status} : item));
    try { await apiRequest(`/events/${selected._id}/rsvp`, {method: 'PUT', body: JSON.stringify({status})}, accessToken); }
    catch (e) { setSelected(value => value ? {...value, myRsvp: previous} : value); setEvents(value => value.map(item => item._id === selected._id ? {...item, myRsvp: previous} : item)); Alert.alert('RSVP failed', e instanceof Error ? e.message : 'Please try again.'); }
  };

  if (creating) return <ScrollView style={styles.page} contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
    <View style={styles.header}><Pressable onPress={() => setCreating(false)} accessibilityLabel="Back"><Text style={styles.back}>‹</Text></Pressable><Text style={styles.title}>Create event</Text></View>
    <Text style={styles.subtitle}>Bring your community together.</Text>
    <TextInput value={title} onChangeText={setTitle} placeholder="Event title" placeholderTextColor={colors.muted} style={styles.input}/>
    <TextInput value={description} onChangeText={setDescription} placeholder="Description" placeholderTextColor={colors.muted} style={[styles.input, styles.multiline]} multiline/>
    <Pressable style={styles.uploadButton} onPress={() => void uploadCover()} disabled={uploadingCover}><Text style={styles.uploadText}>{uploadingCover ? 'Uploading…' : coverUrl ? 'Cover photo added' : 'Add cover photo'}</Text></Pressable>
    <TextInput value={startsAt} onChangeText={setStartsAt} placeholder="Start date/time (2026-11-15 18:00)" placeholderTextColor={colors.muted} style={styles.input}/>
    <TextInput value={endsAt} onChangeText={setEndsAt} placeholder="End date/time (2026-11-15 20:00)" placeholderTextColor={colors.muted} style={styles.input}/>
    <TextInput value={venue} onChangeText={setVenue} placeholder="Venue or address" placeholderTextColor={colors.muted} style={styles.input}/>
    <TextInput value={onlineUrl} onChangeText={setOnlineUrl} placeholder="Online link (optional)" placeholderTextColor={colors.muted} style={styles.input} autoCapitalize="none" keyboardType="url"/>
    <Text style={styles.fieldLabel}>Category</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{categories.filter(item => item !== 'all').map(item => <Pressable key={item} onPress={() => setCreateCategory(item)} style={[styles.chip, createCategory === item && styles.chipActive]}><Text style={[styles.chipText, createCategory === item && styles.chipTextActive]}>{item}</Text></Pressable>)}</ScrollView>
    <Pressable style={styles.primary} onPress={() => void create()} disabled={saving}><Text style={styles.primaryText}>{saving ? 'Creating…' : 'Create event'}</Text></Pressable>
  </ScrollView>;

  if (selected) return <ScrollView style={styles.page} contentContainerStyle={styles.detailContent}>
    <View style={styles.header}><Pressable onPress={() => setSelected(null)} accessibilityLabel="Back"><Text style={styles.back}>‹</Text></Pressable><Text style={styles.title} numberOfLines={1}>{selected.title}</Text></View>
    {selected.coverUrl ? <Image source={{uri: selected.coverUrl}} style={styles.detailCover}/> : <View style={styles.detailCoverFallback}><Text style={styles.detailCoverIcon}>◈</Text></View>}
    <View style={styles.detailCard}><Text style={styles.detailTitle}>{selected.title}</Text><Text style={styles.meta}>{formatDate(selected.startsAt)} – {new Date(selected.endsAt).toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'})}</Text><Text style={styles.meta}>{selected.venue || 'Online event'}</Text><Text style={styles.meta}>Hosted by {selected.hostId?.name ?? 'Connectly member'}</Text><Text style={styles.description}>{selected.description || 'No description provided.'}</Text><View style={styles.rsvpRow}>{(['going','interested','not-going'] as const).map(status => <Pressable key={status} onPress={() => void rsvp(status)} style={[styles.rsvpButton, selected.myRsvp === status && styles.rsvpActive]}><Text style={[styles.rsvpText, selected.myRsvp === status && styles.rsvpTextActive]}>{status === 'going' ? 'Going' : status === 'interested' ? 'Interested' : 'Not going'}</Text></Pressable>)}</View></View>
  </ScrollView>;

  return <View style={styles.page}><View style={styles.header}><Pressable onPress={onBack} accessibilityLabel="Back"><Text style={styles.back}>‹</Text></Pressable><Text style={styles.title}>Events</Text><Pressable onPress={() => setCreating(true)} accessibilityLabel="Create event"><Text style={styles.add}>＋</Text></Pressable></View><Text style={styles.subtitle}>Discover what is happening around you.</Text><View style={styles.tabs}>{(['discover','mine','calendar'] as Tab[]).map(item => <Pressable key={item} onPress={() => setTab(item)} style={[styles.tab, tab === item && styles.tabActive]}><Text style={[styles.tabText, tab === item && styles.tabTextActive]}>{item === 'mine' ? 'Your events' : item}</Text></Pressable>)}</View><TextInput value={query} onChangeText={setQuery} placeholder="Search events" placeholderTextColor={colors.muted} style={styles.search}/><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{categories.map(item => <Pressable key={item} onPress={() => setCategory(item)} style={[styles.chip, category === item && styles.chipActive]}><Text style={[styles.chipText, category === item && styles.chipTextActive]}>{item}</Text></Pressable>)}</ScrollView>{loading ? <View style={styles.center}><ActivityIndicator color={colors.blue}/></View> : error ? <View style={styles.center}><Text style={styles.emptyTitle}>Could not load events</Text><Text style={styles.emptyText}>{error}</Text><Pressable style={styles.retry} onPress={() => void load(1)}><Text style={styles.primaryText}>Retry</Text></Pressable></View> : <FlatList data={events} keyExtractor={item => item._id} onEndReachedThreshold={0.5} onEndReached={() => { if (!loadingMore && hasMore) void load(page + 1); }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(1, true)} tintColor={colors.blue}/>} contentContainerStyle={styles.list} renderItem={({item}) => <Pressable style={styles.card} onPress={() => setSelected(item)}><View style={styles.dateBadge}><Text style={styles.dateDay}>{new Date(item.startsAt).getDate()}</Text><Text style={styles.dateMonth}>{new Date(item.startsAt).toLocaleString([], {month: 'short'}).toUpperCase()}</Text></View><View style={styles.cardCopy}><Text style={styles.cardTitle}>{item.title}</Text><Text style={styles.meta}>{formatDate(item.startsAt)}</Text><Text style={styles.meta}>{item.venue || 'Online event'} · {item.hostId?.name ?? 'Connectly member'}</Text><Text style={styles.cardFooter}>{item.myRsvp === 'going' ? 'Going' : `${item.attendeeCounts?.going ?? 0} going`} · {item.category}</Text></View></Pressable>} ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.blue}/> : undefined} ListEmptyComponent={<View style={styles.center}><Text style={styles.emptyIcon}>◈</Text><Text style={styles.emptyTitle}>No events yet</Text><Text style={styles.emptyText}>Create an event or try another category.</Text></View>}/>}</View>;
}

const styles = StyleSheet.create({page:{flex:1,backgroundColor:colors.canvas,paddingHorizontal:spacing.lg,paddingTop:spacing.md},formContent:{paddingBottom:spacing.xl},detailContent:{paddingBottom:spacing.xl},header:{flexDirection:'row',alignItems:'center',gap:spacing.sm,marginBottom:spacing.sm},back:{fontSize:34,color:colors.ink},title:{flex:1,fontSize:28,fontWeight:'900',color:colors.ink},add:{fontSize:30,color:colors.blue},subtitle:{color:colors.muted,fontSize:14,marginBottom:spacing.md},tabs:{flexDirection:'row',backgroundColor:colors.surfaceAlt,borderRadius:radius.pill,padding:3,marginBottom:spacing.md},tab:{flex:1,alignItems:'center',paddingVertical:10,borderRadius:radius.pill},tabActive:{backgroundColor:colors.blue},tabText:{color:colors.muted,fontWeight:'800',fontSize:12},tabTextActive:{color:'#fff'},search:{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:radius.pill,paddingHorizontal:spacing.md,paddingVertical:12,color:colors.ink,marginBottom:spacing.sm},chips:{gap:spacing.sm,paddingBottom:spacing.md},chip:{paddingHorizontal:spacing.md,paddingVertical:8,borderRadius:radius.pill,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border},chipActive:{backgroundColor:colors.blue,borderColor:colors.blue},chipText:{color:colors.muted,fontSize:11,fontWeight:'800',textTransform:'capitalize'},chipTextActive:{color:'#fff'},list:{paddingBottom:spacing.xl},card:{backgroundColor:colors.surface,borderRadius:radius.lg,borderWidth:1,borderColor:colors.border,padding:spacing.md,marginBottom:spacing.sm,flexDirection:'row',...shadow},dateBadge:{width:52,height:58,borderRadius:radius.md,backgroundColor:colors.blueSoft,alignItems:'center',justifyContent:'center'},dateDay:{fontSize:22,fontWeight:'900',color:colors.blue},dateMonth:{fontSize:10,fontWeight:'900',color:colors.blue},cardCopy:{flex:1,marginLeft:spacing.md},cardTitle:{fontSize:16,fontWeight:'900',color:colors.ink,marginBottom:4},meta:{fontSize:12,color:colors.muted,lineHeight:18},cardFooter:{fontSize:11,fontWeight:'900',color:colors.blue,marginTop:5},center:{alignItems:'center',justifyContent:'center',paddingVertical:spacing.xl},emptyIcon:{fontSize:32,color:colors.blue},emptyTitle:{fontSize:18,fontWeight:'900',color:colors.ink,marginTop:spacing.sm},emptyText:{fontSize:13,color:colors.muted,textAlign:'center',marginTop:4},retry:{backgroundColor:colors.blue,borderRadius:radius.pill,paddingHorizontal:spacing.lg,paddingVertical:spacing.sm,marginTop:spacing.md},input:{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,padding:spacing.md,color:colors.ink,marginBottom:spacing.sm},uploadButton:{alignSelf:'flex-start',backgroundColor:colors.blueSoft,borderRadius:radius.pill,paddingHorizontal:spacing.md,paddingVertical:10},uploadText:{color:colors.blue,fontWeight:'900',fontSize:12},multiline:{height:110,textAlignVertical:'top'},fieldLabel:{fontSize:13,fontWeight:'900',color:colors.ink,marginTop:spacing.sm,marginBottom:spacing.xs},primary:{backgroundColor:colors.blue,borderRadius:radius.pill,alignItems:'center',paddingVertical:14,marginTop:spacing.lg},primaryText:{color:'#fff',fontWeight:'900'},detailCover:{width:'100%',height:180,borderRadius:radius.xl,marginBottom:spacing.md},detailCoverFallback:{height:180,borderRadius:radius.xl,backgroundColor:colors.blueSoft,alignItems:'center',justifyContent:'center',marginBottom:spacing.md},detailCoverIcon:{fontSize:46,color:colors.blue},detailCard:{backgroundColor:colors.surface,borderRadius:radius.xl,borderWidth:1,borderColor:colors.border,padding:spacing.lg,...shadow},detailTitle:{fontSize:22,fontWeight:'900',color:colors.ink,marginBottom:spacing.sm},description:{fontSize:14,color:colors.ink,lineHeight:22,marginTop:spacing.md},rsvpRow:{gap:spacing.sm,marginTop:spacing.lg},rsvpButton:{borderWidth:1,borderColor:colors.border,borderRadius:radius.pill,paddingVertical:11,alignItems:'center'},rsvpActive:{backgroundColor:colors.blue,borderColor:colors.blue},rsvpText:{fontWeight:'900',color:colors.ink},rsvpTextActive:{color:'#fff'}});
