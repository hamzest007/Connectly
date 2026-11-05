import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { apiRequest } from '../../services/api/client';
import { Session } from '../../services/storage/session';
import { colors, radius, shadow, spacing } from '../../theme/tokens';

export function AuthScreen({
  onAuthenticated,
}: {
  onAuthenticated: (session: Session) => void;
}) {
  const [registering, setRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [usernameState, setUsernameState] = useState<'idle' | 'checking' | 'available' | 'taken' | 'error'>('idle');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const emailInput = useRef<any>(null);
  const [emailSelection, setEmailSelection] = useState({ start: 0, end: 0 });
  useEffect(() => {
    if (!registering || username.trim().length < 3) { setUsernameState('idle'); return; }
    setUsernameState('checking');
    const timer = setTimeout(() => {
      void apiRequest<{available: boolean}>('/auth/check-username/' + encodeURIComponent(username.trim().toLowerCase()))
        .then(result => setUsernameState(result.available ? 'available' : 'taken'))
        .catch(() => setUsernameState('error'));
    }, 450);
    return () => clearTimeout(timer);
  }, [registering, username]);
  const insertAtCursor = (value: string) => {
    const start = emailSelection.start ?? email.length;
    const end = emailSelection.end ?? start;
    setEmail(`${email.slice(0, start)}${value}${email.slice(end)}`);
    const next = start + value.length;
    setEmailSelection({ start: next, end: next });
    emailInput.current?.focus();
  };
  const submit = async () => {
    setError('');
    if (!email.trim() || !password) {
      setError(registering ? 'Enter your email and password to continue.' : 'Enter your identifier and password to continue.');
      return;
    }
    if (registering && (name.trim().length < 2 || name.trim().length > 60)) {
      setError('Full name must be between 2 and 60 characters.');
      return;
    }
    if (registering && !/^[a-z0-9_]{3,30}$/i.test(username.trim())) {
      setError('Username must be 3–30 characters using only letters, numbers, or underscores.');
      return;
    }
    if (registering && usernameState === 'taken') {
      setError('That username is already taken.');
      return;
    }
    if (registering && password.length < 8) {
      setError('Your password must be at least 8 characters.');
      return;
    }
    if (registering && !/[A-Z]/.test(password) && !/[0-9]/.test(password)) {
      setError('Use a stronger password with a number or uppercase letter.');
      return;
    }
    if (registering && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (registering && !acceptedTerms) {
      setError('Accept the Terms and Privacy Policy to continue.');
      return;
    }
    setLoading(true);
    try {
      const data = await apiRequest<Session>(
        registering ? '/auth/register' : '/auth/login',
        {
          method: 'POST',
          body: JSON.stringify(
            registering
              ? {
                  fullName: name.trim(),
                  username: username.trim().toLowerCase(),
                  email: email.trim().toLowerCase(),
                  password,
                  phoneNumber: phone.trim(),
                  acceptedTerms,
                }
              : { identifier: email.trim().toLowerCase(), password },
          ),
        },
      );
      onAuthenticated(data);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Unable to connect to Connectly.',
      );
    } finally {
      setLoading(false);
    }
  };
  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.page}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.orbLarge} />
        <View style={styles.orbSmall} />
        <View style={styles.brand}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>C</Text>
          </View>
          <Text style={styles.eyebrow}>WELCOME TO</Text>
          <Text style={styles.title}>Connectly</Text>
          <Text style={styles.subtitle}>
            A calmer place for your real world.
          </Text>
        </View>
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>
            {registering ? 'Create your account' : 'Welcome back'}
          </Text>
          <Text style={styles.formSubtitle}>
            {registering
              ? 'Join conversations that matter.'
              : 'Sign in to continue your journey.'}
          </Text>
          {registering && (
            <>
              <Text style={styles.label}>FULL NAME</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Alex Morgan"
                placeholderTextColor={colors.muted}
                style={styles.input}
                autoCapitalize="words"
              />
              <Text style={styles.label}>USERNAME</Text>
              <TextInput
                value={username}
                onChangeText={setUsername}
                placeholder="alexmorgan"
                placeholderTextColor={colors.muted}
                style={styles.input}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {usernameState !== 'idle' ? <Text style={[styles.fieldHint, usernameState === 'available' && styles.successHint, usernameState === 'taken' && styles.errorHint]}>{usernameState === 'checking' ? 'Checking availability…' : usernameState === 'available' ? 'Username is available' : usernameState === 'taken' ? 'Username is already taken' : 'Could not check username right now'}</Text> : null}
              <Text style={styles.label}>PHONE NUMBER <Text style={styles.optional}>(OPTIONAL)</Text></Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="+1 555 123 4567"
                placeholderTextColor={colors.muted}
                style={styles.input}
                keyboardType="phone-pad"
                autoComplete="tel"
                textContentType="telephoneNumber"
              />
            </>
          )}
          <Text style={styles.label}>EMAIL</Text>
          <View style={styles.emailWrap}>
            <TextInput
              ref={emailInput}
              value={email}
              onChangeText={setEmail}
              selection={emailSelection}
              onSelectionChange={event =>
                setEmailSelection(event.nativeEvent.selection)
              }
              placeholder="you@example.com"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
              style={styles.emailInput}
            />
            <Pressable
              accessibilityLabel="Insert at sign"
              onPress={() => insertAtCursor('@')}
              style={styles.atButton}
            >
              <Text style={styles.atText}>@</Text>
            </Pressable>
          </View>
          <Text style={styles.label}>PASSWORD</Text>
          <View style={styles.passwordWrap}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Your password"
              placeholderTextColor={colors.muted}
              secureTextEntry={!showPassword}
              style={styles.passwordInput}
            />
            <Pressable onPress={() => setShowPassword(value => !value)}>
              <Text style={styles.show}>{showPassword ? 'Hide' : 'Show'}</Text>
            </Pressable>
          </View>
          {registering ? <>
            <Text style={styles.label}>CONFIRM PASSWORD</Text>
            <View style={styles.passwordWrap}>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Repeat your password"
                placeholderTextColor={colors.muted}
                secureTextEntry={!showPassword}
                style={styles.passwordInput}
              />
            </View>
            <Pressable style={styles.termsRow} onPress={() => setAcceptedTerms(value => !value)} accessibilityRole="checkbox" accessibilityState={{checked: acceptedTerms}}>
              <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}><Text style={styles.checkboxMark}>{acceptedTerms ? '✓' : ''}</Text></View>
              <Text style={styles.termsCopy}>I agree to the <Text style={styles.link}>Terms and Conditions</Text> and <Text style={styles.link}>Privacy Policy</Text>.</Text>
            </Pressable>
          </> : null}
          {!registering && (
            <Pressable>
              <Text style={styles.forgot}>Forgot password?</Text>
            </Pressable>
          )}
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.error}>{error}</Text>
            </View>
          ) : null}
          <Pressable style={styles.primary} onPress={submit} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryText}>
                {registering ? 'Create account' : 'Log in'}
              </Text>
            )}
          </Pressable>
          {registering && (
            <Text style={styles.terms}>Your account will be created securely. You can update your profile after signing in.</Text>
          )}
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.switchHint}>
            {registering ? 'Already have an account?' : 'New to Connectly?'}
          </Text>
          <Pressable
            onPress={() => {
              setRegistering(value => !value);
              setError('');
            }}
          >
            <Text style={styles.switch}>
              {registering ? ' Log in' : ' Create an account'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  page: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    overflow: 'hidden',
  },
  orbLarge: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: '#E8EDFF',
    top: -120,
    right: -110,
  },
  orbSmall: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#E9F7F7',
    bottom: -45,
    left: -70,
  },
  brand: { alignItems: 'center', marginBottom: spacing.lg },
  logo: {
    width: 62,
    height: 62,
    borderRadius: 21,
    backgroundColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  logoText: { color: '#fff', fontSize: 30, fontWeight: '900' },
  eyebrow: {
    fontSize: 10,
    color: colors.blue,
    fontWeight: '900',
    letterSpacing: 2,
    marginTop: spacing.md,
  },
  title: {
    fontSize: 35,
    fontWeight: '900',
    color: colors.ink,
    letterSpacing: -1,
    marginTop: spacing.xs,
  },
  subtitle: { color: colors.muted, fontSize: 14, marginTop: spacing.xs },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
  },
  formTitle: { fontSize: 22, fontWeight: '900', color: colors.ink },
  formSubtitle: {
    fontSize: 13,
    color: colors.muted,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 10,
    color: colors.muted,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  optional: { color: colors.mutedLight, fontSize: 9, letterSpacing: 0 },
  fieldHint: { color: colors.muted, fontSize: 11, marginTop: spacing.xs },
  successHint: { color: colors.success },
  errorHint: { color: colors.danger },
  input: {
    height: 50,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    color: colors.ink,
    fontSize: 14,
  },
  emailWrap: {
    height: 50,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  emailInput: {
    flex: 1,
    height: 50,
    paddingHorizontal: spacing.md,
    color: colors.ink,
    fontSize: 14,
  },
  atButton: {
    height: 36,
    minWidth: 36,
    borderRadius: radius.sm,
    marginRight: spacing.xs,
    backgroundColor: colors.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  atText: { color: colors.blue, fontWeight: '900', fontSize: 16 },
  passwordWrap: {
    height: 50,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    height: 50,
    paddingHorizontal: spacing.md,
    color: colors.ink,
    fontSize: 14,
  },
  show: {
    color: colors.blue,
    fontWeight: '800',
    fontSize: 12,
    paddingHorizontal: spacing.md,
  },
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: spacing.lg },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: colors.blue, borderColor: colors.blue },
  checkboxMark: { color: '#fff', fontSize: 14, fontWeight: '900' },
  termsCopy: { flex: 1, color: colors.muted, fontSize: 11, lineHeight: 17, marginLeft: spacing.sm },
  link: { color: colors.blue, fontWeight: '800' },
  forgot: {
    alignSelf: 'flex-end',
    color: colors.blue,
    fontSize: 12,
    fontWeight: '800',
    marginTop: spacing.sm,
  },
  errorBox: {
    backgroundColor: '#FFF1F2',
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginTop: spacing.md,
  },
  error: { color: colors.danger, fontSize: 12, lineHeight: 18 },
  primary: {
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  primaryText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  terms: {
    fontSize: 11,
    lineHeight: 17,
    color: colors.muted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  switchHint: { color: colors.muted, fontSize: 13 },
  switch: { color: colors.blue, fontSize: 13, fontWeight: '900' },
});
