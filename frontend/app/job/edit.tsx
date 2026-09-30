import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/lib/api';
import { colors, spacing } from '@/constants/theme';

export default function EditJobScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [clientName, setClientName] = useState('');
  const [description, setDescription] = useState('');
  const [quotedPrice, setQuotedPrice] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      setLoading(true);
      api
        .getJob(id)
        .then((job) => {
          setClientName(job.client_name);
          setDescription(job.description ?? '');
          setQuotedPrice((job.quoted_price_cents / 100).toString());
        })
        .catch((e) => Alert.alert('Failed to load job', e instanceof Error ? e.message : undefined))
        .finally(() => setLoading(false));
    }, [id])
  );

  const save = async () => {
    if (!id || !clientName.trim() || !quotedPrice) {
      Alert.alert('Client name and quoted price are required');
      return;
    }
    setSaving(true);
    try {
      await api.updateJob(id, {
        client_name: clientName.trim(),
        description: description.trim() || null,
        quoted_price_cents: Math.round(parseFloat(quotedPrice) * 100),
      });
      router.back();
    } catch (e) {
      Alert.alert('Failed to save', e instanceof Error ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Text style={styles.label}>Loading…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.label}>Client / job name</Text>
      <TextInput style={styles.input} value={clientName} onChangeText={setClientName} />

      <Text style={styles.label}>Description (optional)</Text>
      <TextInput style={[styles.input, styles.multiline]} value={description} onChangeText={setDescription} multiline />

      <Text style={styles.label}>Quoted price ($)</Text>
      <TextInput style={styles.input} keyboardType="decimal-pad" value={quotedPrice} onChangeText={setQuotedPrice} />

      <Pressable style={styles.button} onPress={save} disabled={saving}>
        <Text style={styles.buttonText}>{saving ? 'Saving…' : 'Save'}</Text>
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
  multiline: { minHeight: 70, textAlignVertical: 'top' },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  buttonText: { color: colors.onPrimary, fontWeight: '700', fontSize: 16 },
});
