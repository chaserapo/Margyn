import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/lib/api';
import { colors, spacing } from '@/constants/theme';

export default function TimeEntryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [hours, setHours] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      setLoading(true);
      api
        .getTimeEntry(id)
        .then((t) => {
          setHours(t.hours.toString());
          setNote(t.note ?? '');
        })
        .catch((e) => Alert.alert('Failed to load', e instanceof Error ? e.message : undefined))
        .finally(() => setLoading(false));
    }, [id])
  );

  const save = async () => {
    if (!id || !hours) {
      Alert.alert('Hours are required');
      return;
    }
    setSaving(true);
    try {
      await api.updateTimeEntry(id, { hours: parseFloat(hours), note: note.trim() || undefined });
      router.back();
    } catch (e) {
      Alert.alert('Failed to save', e instanceof Error ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  const remove = () => {
    if (!id) return;
    Alert.alert('Delete this time entry?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await api.deleteTimeEntry(id);
          router.back();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.label}>Hours</Text>
      <TextInput style={styles.input} keyboardType="decimal-pad" value={hours} onChangeText={setHours} />

      <Text style={styles.label}>Note (optional)</Text>
      <TextInput style={styles.input} value={note} onChangeText={setNote} />

      <Pressable style={styles.button} onPress={save} disabled={saving}>
        <Text style={styles.buttonText}>{saving ? 'Saving…' : 'Save'}</Text>
      </Pressable>

      <Pressable style={styles.deleteButton} onPress={remove}>
        <Text style={styles.deleteButtonText}>Delete entry</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
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
  deleteButton: { alignItems: 'center', marginTop: spacing.lg, padding: spacing.md },
  deleteButtonText: { color: colors.bad, fontWeight: '600' },
});
