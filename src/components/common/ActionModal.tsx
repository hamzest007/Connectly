import React from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../../theme/tokens';

export type ActionModalAction = {
  label: string;
  onPress: () => void | Promise<void>;
  tone?: 'primary' | 'destructive' | 'secondary';
  disabled?: boolean;
  icon?: string;
  destructive?: boolean;
};

export function ActionModal({
  visible,
  title,
  message,
  subtitle,
  icon = '✦',
  actions,
  onClose,
}: {
  visible: boolean;
  title: string;
  message?: string;
  subtitle?: string;
  icon?: string;
  actions: ActionModalAction[];
  onClose: () => void;
}) {
  const [busy, setBusy] = React.useState(false);
  const run = async (action: ActionModalAction) => {
    if (busy || action.disabled) return;
    setBusy(true);
    try { await action.onPress(); } finally { setBusy(false); }
  };
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
    <View style={styles.backdrop}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close dialog" />
      <View style={styles.sheet} accessibilityViewIsModal>
        <View style={styles.handle} />
        <View style={styles.icon}><Text style={styles.iconText}>{icon}</Text></View>
        <Text style={styles.title}>{title}</Text>
        {(message ?? subtitle) ? <Text style={styles.message}>{message ?? subtitle}</Text> : null}
        <View style={styles.actions}>{actions.map(action => {
          const tone = action.destructive ? 'destructive' : action.tone;
          return <Pressable key={action.label} disabled={busy || action.disabled} onPress={() => void run(action)} accessibilityRole="button" style={({ pressed }) => [styles.action, tone === 'primary' && styles.primary, tone === 'destructive' && styles.destructive, tone === 'secondary' && styles.secondary, (pressed || busy || action.disabled) && styles.disabled]}>{busy && tone === 'primary' ? <ActivityIndicator color="#fff" /> : <>{action.icon ? <Text style={styles.actionIcon}>{action.icon}</Text> : null}<Text style={[styles.actionText, tone === 'primary' && styles.primaryText, tone === 'destructive' && styles.destructiveText]}>{action.label}</Text></>}</Pressable>;
        })}</View>
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,.42)' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: spacing.lg, paddingBottom: spacing.xl },
  handle: { alignSelf: 'center', width: 42, height: 5, borderRadius: 3, backgroundColor: colors.border, marginBottom: spacing.lg },
  icon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: spacing.sm },
  iconText: { color: colors.blue, fontSize: 22, fontWeight: '900' },
  title: { color: colors.ink, fontSize: 21, fontWeight: '900', textAlign: 'center' },
  message: { color: colors.muted, fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: spacing.sm },
  actions: { gap: spacing.sm, marginTop: spacing.lg },
  action: { minHeight: 50, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md },
  primary: { backgroundColor: colors.blue },
  secondary: { backgroundColor: colors.surfaceAlt },
  destructive: { backgroundColor: '#FFF0F1' },
  actionText: { color: colors.inkLight, fontSize: 15, fontWeight: '800' },
  actionIcon: { color: colors.blue, fontSize: 17, fontWeight: '900', marginRight: spacing.sm },
  primaryText: { color: '#fff' },
  destructiveText: { color: colors.danger },
  disabled: { opacity: 0.5 },
});
