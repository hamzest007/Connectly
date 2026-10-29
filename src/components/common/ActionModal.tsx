import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadow, spacing } from '../../theme/tokens';

export type ActionModalItem = {
  label: string;
  icon?: string;
  destructive?: boolean;
  disabled?: boolean;
  onPress: () => void;
};

type Props = {
  visible: boolean;
  title: string;
  subtitle?: string;
  actions: ActionModalItem[];
  onClose: () => void;
};

export function ActionModal({ visible, title, subtitle, actions, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <View style={styles.card}>
          <View style={styles.handle} />
          <View style={styles.heading}>
            <View style={styles.headingCopy}>
              <Text style={styles.eyebrow}>ACTIONS</Text>
              <Text style={styles.title}>{title}</Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
            <Pressable onPress={onClose} style={styles.close} accessibilityLabel="Close actions">
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>
          <View style={styles.actions}>
            {actions.map(action => (
              <Pressable
                key={action.label}
                disabled={action.disabled}
                onPress={() => { onClose(); action.onPress(); }}
                style={({ pressed }) => [
                  styles.action,
                  action.destructive && styles.destructiveAction,
                  action.disabled && styles.disabled,
                  pressed && styles.pressed,
                ]}
              >
                <View style={[styles.icon, action.destructive && styles.destructiveIcon]}>
                  <Text style={[styles.iconText, action.destructive && styles.destructiveText]}>
                    {action.icon ?? '•'}
                  </Text>
                </View>
                <Text style={[styles.actionText, action.destructive && styles.destructiveText]}>
                  {action.label}
                </Text>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            ))}
          </View>
          <Pressable onPress={onClose} style={styles.cancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(12, 20, 35, 0.52)',
    justifyContent: 'flex-end',
    padding: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 28,
    padding: spacing.lg,
    paddingTop: spacing.sm,
    ...shadow,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: spacing.lg },
  heading: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md },
  headingCopy: { flex: 1 },
  eyebrow: { color: colors.blue, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  title: { color: colors.ink, fontSize: 23, fontWeight: '900', marginTop: 3 },
  subtitle: { color: colors.muted, fontSize: 13, marginTop: 4 },
  close: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: colors.ink, fontSize: 24, lineHeight: 25 },
  actions: { gap: spacing.sm },
  action: { minHeight: 56, borderRadius: radius.lg, backgroundColor: colors.surfaceAlt, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md },
  destructiveAction: { backgroundColor: '#FFF1F2' },
  pressed: { opacity: 0.72, transform: [{ scale: 0.985 }] },
  disabled: { opacity: 0.45 },
  icon: { width: 34, height: 34, borderRadius: 12, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  destructiveIcon: { backgroundColor: '#FFE4E6' },
  iconText: { color: colors.blue, fontSize: 17, fontWeight: '900' },
  actionText: { flex: 1, color: colors.ink, fontSize: 15, fontWeight: '800' },
  destructiveText: { color: colors.danger },
  chevron: { color: colors.muted, fontSize: 25, lineHeight: 25 },
  cancel: { minHeight: 52, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm, borderWidth: 1, borderColor: colors.border },
  cancelText: { color: colors.ink, fontSize: 15, fontWeight: '900' },
});
