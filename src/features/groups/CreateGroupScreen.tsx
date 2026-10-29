import React from 'react';
import {ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Avatar} from '../../components/common/Avatar';
import {apiRequest} from '../../services/api/client';
import {pickMedia, uploadMedia} from '../../services/media/cloudinary';
import {colors, radius, shadow, spacing} from '../../theme/tokens';

type Privacy = 'public'|'private';
type Category = 'Technology'|'Education'|'Gaming'|'Fitness'|'Business'|'Entertainment'|'Community';
type Person = {_id: string; name: string; username: string; avatarUrl?: string};
type Group = {_id: string; name: string};
const categories: Category[] = ['Technology','Education','Gaming','Fitness','Business','Entertainment','Community'];

export function CreateGroupScreen({accessToken, onBack, onCreated}: {accessToken: string; onBack: () => void; onCreated: (group: Group) => void}) {
  const insets = useSafeAreaInsets();
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [privacy, setPrivacy] = React.useState<Privacy>('public');
  const [category, setCategory] = React.useState<Category>('Community');
  const [approval, setApproval] = React.useState(false);
  const [cover, setCover] = React.useState<{uri: string; type?: string; fileName?: string} | null>(null);
  const [coverUrl, setCoverUrl] = React.useState('');
  const [coverUploading, setCoverUploading] = React.useState(false);
  const [peopleQuery, setPeopleQuery] = React.useState('');
  const [people, setPeople] = React.useState<Person[]>([]);
  const [selectedPeople, setSelectedPeople] = React.useState<Person[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const descriptionLimit = 1000;

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (!peopleQuery.trim()) { setPeople([]); return; }
      setSearching(true);
      void apiRequest<Person[]>(`/users/search?q=${encodeURIComponent(peopleQuery.trim())}`, {}, accessToken).then(result => setPeople(result.filter(person => !selectedPeople.some(selected => selected._id === person._id)))).catch(() => setPeople([])).finally(() => setSearching(false));
    }, 280);
    return () => clearTimeout(timer);
  }, [accessToken, peopleQuery, selectedPeople]);

  const chooseCover = async () => {
    if (coverUploading) return;
    setCoverUploading(true); setError('');
    try {
      const selected = await pickMedia('photo');
      if (!selected[0]) return;
      setCover({uri: selected[0].uri ?? '', type: selected[0].type, fileName: selected[0].fileName});
      const uploaded = await uploadMedia(selected[0], accessToken);
      setCoverUrl(uploaded.url);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to upload the cover image.'); }
    finally { setCoverUploading(false); }
  };
  const submit = async () => {
    const cleanName = name.trim();
    const cleanDescription = description.trim();
    if (cleanName.length < 2) { setError('Group name must be at least 2 characters.'); return; }
    if (cleanName.length > 100) { setError('Group name must be 100 characters or fewer.'); return; }
    if (cleanDescription.length > descriptionLimit) { setError(`Description must be ${descriptionLimit} characters or fewer.`); return; }
    setSaving(true); setError('');
    try {
      const group = await apiRequest<Group>('/groups', {method: 'POST', body: JSON.stringify({name: cleanName, description: cleanDescription, coverUrl: coverUrl || undefined, visibility: privacy, category, joinApprovalRequired: approval})}, accessToken);
      if (selectedPeople.length) await apiRequest(`/groups/${group._id}/invites`, {method: 'POST', body: JSON.stringify({userIds: selectedPeople.map(person => person._id)})}, accessToken);
      onCreated(group);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to create the group.'); }
    finally { setSaving(false); }
  };
  const togglePerson = (person: Person) => setSelectedPeople(value => value.some(item => item._id === person._id) ? value.filter(item => item._id !== person._id) : [...value, person]);
  return <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View style={styles.header}><Pressable onPress={onBack} accessibilityLabel="Back" style={styles.backButton}><Text style={styles.back}>‹</Text></Pressable><Text style={styles.title}>Create Group</Text><View style={styles.headerSpacer}/></View>
    <ScrollView contentContainerStyle={[styles.content, {paddingBottom: 120 + insets.bottom}]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <Pressable style={styles.cover} onPress={() => void chooseCover()} accessibilityRole="button" accessibilityLabel="Add group cover image">
        {cover?.uri ? <Image source={{uri: cover.uri}} style={styles.coverImage}/> : <View style={styles.coverPlaceholder}><Text style={styles.coverIcon}>＋</Text><Text style={styles.coverTitle}>{coverUploading ? 'Uploading cover…' : 'Add a cover photo'}</Text><Text style={styles.coverHint}>A wide image helps people recognize your group</Text></View>}
        {cover?.uri && !coverUploading ? <View style={styles.coverActions}><Pressable onPress={() => void chooseCover()} style={styles.coverAction}><Text style={styles.coverActionText}>Change</Text></Pressable><Pressable onPress={() => {setCover(null); setCoverUrl('');}} style={styles.removeAction}><Text style={styles.removeText}>Remove</Text></Pressable></View> : null}
        {coverUploading ? <ActivityIndicator color={colors.blue} style={styles.coverLoader}/> : null}
      </Pressable>
      <Text style={styles.label}>Group name <Text style={styles.required}>*</Text></Text>
      <TextInput value={name} onChangeText={setName} placeholder="e.g. Karachi Tech Community" placeholderTextColor={colors.muted} style={styles.input} maxLength={100} autoCapitalize="words"/>
      <Text style={styles.label}>Description</Text>
      <TextInput value={description} onChangeText={value => setDescription(value.slice(0, descriptionLimit))} placeholder="Tell people what your group is about" placeholderTextColor={colors.muted} style={[styles.input, styles.descriptionInput]} multiline textAlignVertical="top"/><Text style={styles.counter}>{description.length}/{descriptionLimit}</Text>
      <Text style={styles.sectionTitle}>Privacy</Text>
      <View style={styles.optionRow}>{(['public','private'] as Privacy[]).map(item => <Pressable key={item} onPress={() => setPrivacy(item)} style={[styles.optionCard, privacy === item && styles.optionActive]} accessibilityRole="radio" accessibilityState={{selected: privacy === item}}><Text style={styles.optionIcon}>{item === 'public' ? '◉' : '◆'}</Text><View style={styles.optionCopy}><Text style={styles.optionTitle}>{item === 'public' ? 'Public group' : 'Private group'}</Text><Text style={styles.optionDescription}>{item === 'public' ? 'Anyone can find and see posts.' : 'Only members can see group posts.'}</Text></View><Text style={[styles.radio, privacy === item && styles.radioActive]}>{privacy === item ? '✓' : ''}</Text></Pressable>)}</View>
      <Text style={styles.sectionTitle}>Category</Text><View style={styles.chips}>{categories.map(item => <Pressable key={item} onPress={() => setCategory(item)} style={[styles.chip, category === item && styles.chipActive]}><Text style={[styles.chipText, category === item && styles.chipTextActive]}>{item}</Text></Pressable>)}</View>
      <Pressable onPress={() => setApproval(value => !value)} style={styles.setting} accessibilityRole="switch" accessibilityState={{checked: approval}}><View style={styles.settingCopy}><Text style={styles.settingTitle}>Approve membership requests</Text><Text style={styles.settingDescription}>{approval ? 'Admins review people before they join.' : 'Anyone can join when the group is public.'}</Text></View><View style={[styles.toggle, approval && styles.toggleOn]}><View style={[styles.toggleKnob, approval && styles.toggleKnobOn]}/></View></Pressable>
      <Text style={styles.sectionTitle}>Invite friends <Text style={styles.optional}>Optional</Text></Text>
      <TextInput value={peopleQuery} onChangeText={setPeopleQuery} placeholder="Search friends to invite" placeholderTextColor={colors.muted} style={styles.input}/>
      {searching ? <ActivityIndicator color={colors.blue}/> : people.map(person => <Pressable key={person._id} onPress={() => togglePerson(person)} style={styles.person}><Avatar initials={person.name.split(' ').map(part => part[0]).join('').slice(0, 2)} avatarUrl={person.avatarUrl} size={38}/><View style={styles.personCopy}><Text style={styles.personName}>{person.name}</Text><Text style={styles.personMeta}>@{person.username}</Text></View><Text style={[styles.check, selectedPeople.some(item => item._id === person._id) && styles.checkSelected]}>{selectedPeople.some(item => item._id === person._id) ? '✓' : '+'}</Text></Pressable>)}
      {selectedPeople.length ? <Text style={styles.selectedText}>{selectedPeople.length} friend{selectedPeople.length === 1 ? '' : 's'} selected</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </ScrollView>
    <View style={[styles.footer, {paddingBottom: Math.max(spacing.sm, insets.bottom)}]}><Pressable onPress={() => void submit()} disabled={saving || coverUploading} style={[styles.primary, (saving || coverUploading) && styles.primaryDisabled]}><Text style={styles.primaryText}>{saving ? 'Creating group…' : 'Create Group'}</Text></Pressable></View>
  </KeyboardAvoidingView>;
}
const styles = StyleSheet.create({page:{flex:1,backgroundColor:colors.canvas},header:{height:64,flexDirection:'row',alignItems:'center',paddingHorizontal:spacing.lg,borderBottomWidth:1,borderBottomColor:colors.border,backgroundColor:colors.surface},backButton:{width:44,height:44,alignItems:'center',justifyContent:'center'},back:{fontSize:34,color:colors.ink,lineHeight:38},title:{flex:1,textAlign:'center',fontSize:20,fontWeight:'900',color:colors.ink},headerSpacer:{width:44},content:{padding:spacing.lg},cover:{height:190,borderRadius:radius.xl,overflow:'hidden',backgroundColor:colors.blueSoft,marginBottom:spacing.lg,...shadow},coverImage:{width:'100%',height:'100%'},coverPlaceholder:{flex:1,alignItems:'center',justifyContent:'center',padding:spacing.lg},coverIcon:{fontSize:34,color:colors.blue},coverTitle:{fontSize:16,fontWeight:'900',color:colors.ink,marginTop:spacing.xs},coverHint:{fontSize:12,color:colors.muted,textAlign:'center',marginTop:4},coverActions:{position:'absolute',left:spacing.md,right:spacing.md,bottom:spacing.md,flexDirection:'row',gap:spacing.sm},coverAction:{backgroundColor:'rgba(255,255,255,.94)',borderRadius:radius.pill,paddingHorizontal:spacing.md,paddingVertical:9},coverActionText:{color:colors.blue,fontWeight:'900'},removeAction:{backgroundColor:'rgba(255,255,255,.94)',borderRadius:radius.pill,paddingHorizontal:spacing.md,paddingVertical:9},removeText:{color:colors.danger,fontWeight:'900'},coverLoader:{position:'absolute',alignSelf:'center',top:'50%'},label:{fontSize:13,fontWeight:'900',color:colors.ink,marginBottom:spacing.xs},required:{color:colors.danger},input:{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,paddingHorizontal:spacing.md,paddingVertical:13,color:colors.ink,fontSize:14,marginBottom:spacing.md},descriptionInput:{height:110},counter:{color:colors.muted,fontSize:10,textAlign:'right',marginTop:-spacing.sm,marginBottom:spacing.md},sectionTitle:{fontSize:17,fontWeight:'900',color:colors.ink,marginTop:spacing.md,marginBottom:spacing.sm},optional:{fontSize:11,fontWeight:'700',color:colors.muted},optionRow:{gap:spacing.sm},optionCard:{flexDirection:'row',alignItems:'center',padding:spacing.md,borderRadius:radius.lg,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface},optionActive:{borderColor:colors.blue,backgroundColor:colors.blueSoft},optionIcon:{fontSize:20,color:colors.blue,width:28},optionCopy:{flex:1},optionTitle:{fontSize:14,fontWeight:'900',color:colors.ink},optionDescription:{fontSize:11,color:colors.muted,marginTop:3},radio:{width:22,height:22,borderRadius:11,borderWidth:1,borderColor:colors.border,textAlign:'center',lineHeight:20,color:colors.blue,fontWeight:'900'},radioActive:{borderColor:colors.blue,backgroundColor:'#fff'},chips:{flexDirection:'row',flexWrap:'wrap',gap:spacing.sm},chip:{paddingHorizontal:spacing.md,paddingVertical:9,borderRadius:radius.pill,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface},chipActive:{backgroundColor:colors.blue,borderColor:colors.blue},chipText:{fontSize:11,fontWeight:'800',color:colors.muted},chipTextActive:{color:'#fff'},setting:{marginTop:spacing.lg,padding:spacing.md,borderRadius:radius.lg,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface,flexDirection:'row',alignItems:'center'},settingCopy:{flex:1},settingTitle:{fontSize:14,fontWeight:'900',color:colors.ink},settingDescription:{fontSize:11,color:colors.muted,marginTop:4,lineHeight:16},toggle:{width:46,height:27,borderRadius:14,backgroundColor:colors.surfaceAlt,padding:3},toggleOn:{backgroundColor:colors.blue},toggleKnob:{width:21,height:21,borderRadius:11,backgroundColor:'#fff'},toggleKnobOn:{alignSelf:'flex-end'},person:{flexDirection:'row',alignItems:'center',padding:spacing.sm,borderBottomWidth:1,borderBottomColor:colors.border},personCopy:{flex:1,marginLeft:spacing.sm},personName:{fontSize:13,fontWeight:'900',color:colors.ink},personMeta:{fontSize:11,color:colors.muted,marginTop:2},check:{width:28,height:28,borderRadius:14,backgroundColor:colors.surfaceAlt,color:colors.blue,textAlign:'center',lineHeight:28,fontSize:18,fontWeight:'900'},checkSelected:{backgroundColor:colors.blue,color:'#fff'},selectedText:{fontSize:12,color:colors.blue,fontWeight:'800',marginTop:spacing.sm},error:{color:colors.danger,fontSize:12,fontWeight:'800',marginTop:spacing.md},footer:{position:'absolute',left:0,right:0,bottom:0,paddingHorizontal:spacing.lg,backgroundColor:colors.canvas,borderTopWidth:1,borderTopColor:colors.border},primary:{backgroundColor:colors.blue,borderRadius:radius.pill,alignItems:'center',paddingVertical:14,...shadow},primaryDisabled:{opacity:.6},primaryText:{color:'#fff',fontSize:15,fontWeight:'900'}});
