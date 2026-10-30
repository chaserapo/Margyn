import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { updatePassword } from '@/lib/auth';
import { colors, fonts, spacing } from '@/constants/theme';

export default function ResetPasswordScreen({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!password || password.length < 6) {
      Alert.alert('Password must be at least 6 characters');
      return;
    }
    if (password !== confirm) {
      Alert.alert("Passwords don't match");
      return;
    }
    setSubmitting(true);
    try {
      await updatePassword(password);
      Alert.alert('Password updated', "You're signed in with your new password.");
      onDone();
    } catch (e) {
      Alert.alert('Failed to update password', e instanceof Error ? e.message : undefined);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>New password</Text>
      <Text style={styles.subtitle}>Choose a new password for your account.</Text>

      <Text style={styles.label}>New password</Text>
      <TextInput
        style={styles.input}
        secureTextEntry
        autoCapitalize="none"
        value={password}
        onChangeText={setPassword}
        placeholder="••••••••"
      />

      <Text style={styles.label}>Confirm password</Text>
      <TextInput
        style={styles.input}
        secureTextEntry
        autoCapitalize="none"
        value={confirm}
        onChangeText={setConfirm}
        placeholder="••••••••"
      />

      <Pressable style={styles.button} onPress={submit} disabled={submitting}>
        <Text style={styles.buttonText}>{submitting ? 'Saving…' : 'Update password'}</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg, justifyContent: 'center' },
  title: { fontSize: 32, fontFamily: fonts.display, color: colors.text, textAlign: 'center' },
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
  button: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  buttonText: { color: colors.onPrimary, fontWeight: '700', fontSize: 16 },
});
