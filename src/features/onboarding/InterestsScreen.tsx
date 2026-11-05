import React from 'react';
import {ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {apiRequest} from '../../services/api/client';
import {colors, radius, spacing} from '../../theme/tokens';

const topics = ['Technology','Programming','Gaming','Sports','Fitness','Business','Education','Science','Photography','Travel','Entertainment','Fashion','Food','News','Art and Design','Music','Movies','Lifestyle','Automotive','Health and Wellness'];

export function InterestsScreen({accessToken, onDone}: {accessToken: string; onDone: (interests: string[]) => void}) {
  const [selected, setSelected] = React.useState<string[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const toggle = (topic: string) => setSelected(current => current.includes(topic) ? current.filter(value => value !== topic) : current.length < 8 ? [...current, topic] : current);
  const save = async () => {
    setSaving(true); setError('');
    try { const interests = await apiRequest<string[]>('/users/me/interests', {method:'PUT', body:JSON.stringify({interests:selected})}, accessToken); onDone(interests); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to save your interests.'); }
    finally { setSaving(false); }
  };
  return <View style={styles.page}><ScrollView contentContainerStyle={styles.content}><Text style={styles.eyebrow}>MAKE CONNECTLY YOURS</Text><Text style={styles.title}>What are you into?</Text><Text style={styles.subtitle}>Choose a few interests to make your For You feed more relevant. You can change these anytime.</Text><View style={styles.grid}>{topics.map(topic => <Pressable key={topic} onPress={() => toggle(topic)} style={[styles.topic, selected.includes(topic) && styles.topicActive]}><Text style={[styles.topicText, selected.includes(topic) && styles.topicTextActive]}>{topic}</Text></Pressable>)}</View>{error ? <Text style={styles.error}>{error}</Text> : null}<Pressable style={[styles.primary, !selected.length && styles.primarySecondary]} onPress={() => void save()} disabled={saving}>{saving ? <ActivityIndicator color="#fff"/> : <Text style={styles.primaryText}>{selected.length ? `Continue with ${selected.length} selected` : 'Continue without selecting'}</Text>}</Pressable><Pressable onPress={() => onDone([])} disabled={saving}><Text style={styles.skip}>Skip for now</Text></Pressable></ScrollView></View>;
}

const styles = StyleSheet.create({page:{flex:1,backgroundColor:colors.canvas},content:{padding:spacing.xl,paddingTop:spacing.xxxl},eyebrow:{color:colors.blue,fontSize:10,fontWeight:'900',letterSpacing:1.8},title:{color:colors.ink,fontSize:32,fontWeight:'900',letterSpacing:-1,marginTop:spacing.sm},subtitle:{color:colors.muted,fontSize:14,lineHeight:21,marginTop:spacing.sm},grid:{flexDirection:'row',flexWrap:'wrap',gap:spacing.sm,marginTop:spacing.xl},topic:{paddingHorizontal:spacing.md,paddingVertical:11,borderRadius:radius.pill,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border},topicActive:{backgroundColor:colors.blueSoft,borderColor:colors.blue},topicText:{color:colors.muted,fontSize:12,fontWeight:'800'},topicTextActive:{color:colors.blue},error:{color:colors.danger,fontSize:12,marginTop:spacing.md},primary:{height:52,borderRadius:radius.md,backgroundColor:colors.blue,alignItems:'center',justifyContent:'center',marginTop:spacing.xxl},primarySecondary:{backgroundColor:colors.inkLight},primaryText:{color:'#fff',fontSize:14,fontWeight:'900'},skip:{color:colors.blue,textAlign:'center',fontSize:13,fontWeight:'900',marginTop:spacing.lg}});
