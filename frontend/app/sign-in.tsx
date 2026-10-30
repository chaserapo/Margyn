import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { requestPasswordReset, signIn, signUp } from '@/lib/auth';
import { colors, fonts, spacing } from '@/constants/theme';

type Mode = 'sign-in' | 'sign-up' | 'forgot';

export default function SignInScreen() {
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (mode === 'forgot') {
      if (!email.trim()) {
        Alert.alert('Enter your email');
        return;
      }
      setSubmitting(true);
      try {
        await requestPasswordReset(email.trim());
        Alert.alert('Check your email', "We've sent a link to reset your password.");
        setMode('sign-in');
      } catch (e) {
        Alert.alert('Failed to send reset email', e instanceof Error ? e.message : undefined);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!email.trim() || !password) {
      Alert.alert('Enter an email and password');
      return;
    }
    setSubmitting(true);
    try {
      if (mode === 'sign-in') {
        await signIn(email.trim(), password);
      } else {
        const { needsEmailConfirmation } = await signUp(email.trim(), password);
        if (needsEmailConfirmation) {
          Alert.alert('Check your email', 'Confirm your address, then sign in.');
          setMode('sign-in');
        }
      }
    } catch (e) {
      Alert.alert(mode === 'sign-in' ? 'Sign in failed' : 'Sign up failed', e instanceof Error ? e.message : undefined);
    } finally {
      setSubmitting(false);
    }
  };

  const titleMap: Record<Mode, string> = {
    'sign-in': 'Sign in to your account',
    'sign-up': 'Create an account',
    forgot: 'Reset your password',
  };

  const buttonLabel: Record<Mode, string> = {
    'sign-in': 'Sign in',
    'sign-up': 'Sign up',
    forgot: 'Send reset link',
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Margyn</Text>
      <Text style={styles.subtitle}>{titleMap[mode]}</Text>

      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
      />

      {mode !== 'forgot' && (
        <>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            autoCapitalize="none"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
          />
        </>
      )}

      {mode === 'sign-in' && (
        <Pressable onPress={() => setMode('forgot')} style={styles.forgotLink}>
          <Text style={styles.forgotLinkText}>Forgot password?</Text>
        </Pressable>
      )}

      <Pressable style={styles.button} onPress={submit} disabled={submitting}>
        <Text style={styles.buttonText}>{submitting ? 'Please wait…' : buttonLabel[mode]}</Text>
      </Pressable>

      {mode === 'forgot' ? (
        <Pressable onPress={() => setMode('sign-in')} style={styles.switchLink}>
          <Text style={styles.switchLinkText}>Back to sign in</Text>
        </Pressable>
      ) : (
        <Pressable onPress={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')} style={styles.switchLink}>
          <Text style={styles.switchLinkText}>
            {mode === 'sign-in' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </Text>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg, justifyContent: 'center' },
  title: { fontSize: 40, fontFamily: fonts.display, color: colors.text, textAlign: 'center' },
  subtitle: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xs, marginBottom: spacing.xl },
  label: { color: colors.textMuted, marginBottom: spacing.xs, marginTop: spacing.md },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
  forgotLink: { alignItems: 'flex-end', marginTop: spacing.sm },
  forgotLinkText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  buttonText: { color: colors.onPrimary, fontWeight: '700', fontSize: 16 },
  switchLink: { marginTop: spacing.lg, alignItems: 'center' },
  switchLinkText: { color: colors.text, fontWeight: '600' },
});
