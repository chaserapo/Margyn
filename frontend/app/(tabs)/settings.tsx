import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/lib/api';
import { signOut } from '@/lib/auth';
import { colors, fonts, spacing } from '@/constants/theme';

export default function SettingsScreen() {
  const [hourlyRate, setHourlyRate] = useState('');
  const [targetMargin, setTargetMargin] = useState('');
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      api
        .getSettings()
        .then((s) => {
          setHourlyRate((s.hourly_rate_cents / 100).toString());
          setTargetMargin(s.target_margin_pct.toString());
        })
        .catch(() => {});
    }, [])
  );

  const save = async () => {
    setSaving(true);
    try {
      await api.updateSettings({
        hourly_rate_cents: Math.round(parseFloat(hourlyRate || '0') * 100),
        target_margin_pct: parseFloat(targetMargin || '0'),
      });
      Alert.alert('Saved');
    } catch (e) {
      Alert.alert('Failed to save', e instanceof Error ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>Settings</Text>

      <Text style={styles.label}>Your hourly rate ($)</Text>
      <TextInput
        style={styles.input}
        keyboardType="decimal-pad"
        value={hourlyRate}
        onChangeText={setHourlyRate}
        placeholder="65"
      />

      <Text style={styles.label}>Target margin (%)</Text>
      <TextInput
        style={styles.input}
        keyboardType="decimal-pad"
        value={targetMargin}
        onChangeText={setTargetMargin}
        placeholder="40"
      />

      <Pressable style={styles.button} onPress={save} disabled={saving}>
        <Text style={styles.buttonText}>{saving ? 'Saving…' : 'Save'}</Text>
      </Pressable>

      <Pressable style={styles.signOutButton} onPress={() => signOut().catch(() => {})}>
        <Text style={styles.signOutButtonText}>Sign out</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  title: { fontSize: 30, fontFamily: fonts.display, color: colors.text, marginTop: spacing.md, marginBottom: spacing.lg },
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
  signOutButton: { alignItems: 'center', marginTop: spacing.xl, padding: spacing.md },
  signOutButtonText: { color: colors.bad, fontWeight: '600' },
});
