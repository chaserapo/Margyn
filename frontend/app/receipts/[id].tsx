import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/lib/api';
import { colors, spacing } from '@/constants/theme';
import type { JobSummary, MaterialLine } from '@/lib/types';

export default function AllocateReceiptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [receipt, setReceipt] = useState<MaterialLine | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [openJobs, setOpenJobs] = useState<JobSummary[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [cost, setCost] = useState('');
  const [qty, setQty] = useState('1');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      setLoading(true);
      Promise.all([api.getMaterial(id), api.listJobs()])
        .then(async ([m, jobs]) => {
          setReceipt(m);
          setName(m.name);
          setCost(m.cost_cents ? (m.cost_cents / 100).toString() : '');
          setQty(m.qty.toString());
          setSelectedJobId(m.job_id);
          setOpenJobs(jobs.filter((j) => j.status === 'open'));
          if (m.receipt_path) setReceiptUrl(await api.getReceiptUrl(m.receipt_path));
        })
        .catch((e) => Alert.alert('Failed to load', e instanceof Error ? e.message : undefined))
        .finally(() => setLoading(false));
    }, [id])
  );

  const save = async () => {
    if (!id || !selectedJobId || !name.trim() || !cost) {
      Alert.alert('Pick a job, then fill in item name and cost');
      return;
    }
    setSaving(true);
    try {
      await api.assignReceipt(id, {
        job_id: selectedJobId,
        name: name.trim(),
        cost_cents: Math.round(parseFloat(cost) * 100),
        qty: parseInt(qty || '1', 10),
      });
      router.back();
    } catch (e) {
      Alert.alert('Failed to allocate', e instanceof Error ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  const discard = () => {
    if (!id) return;
    Alert.alert('Discard this receipt?', 'The photo will be permanently deleted.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: async () => {
          await api.deleteMaterial(id);
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
      <ScrollView contentContainerStyle={styles.scroll}>
        {receiptUrl && <Image source={{ uri: receiptUrl }} style={styles.preview} />}

        <Text style={styles.label}>Job</Text>
        {openJobs.length === 0 ? (
          <Text style={styles.noJobs}>No open jobs to allocate this to.</Text>
        ) : (
          <View style={styles.jobList}>
            {openJobs.map((j) => (
              <Pressable
                key={j.id}
                style={[styles.jobRow, selectedJobId === j.id && styles.jobRowSelected]}
                onPress={() => setSelectedJobId(j.id)}
              >
                <Text style={[styles.jobRowText, selectedJobId === j.id && styles.jobRowTextSelected]}>
                  {j.client_name}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        <Text style={styles.label}>Item</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Timber, fittings" />

        <Text style={styles.label}>Cost ($)</Text>
        <TextInput style={styles.input} keyboardType="decimal-pad" value={cost} onChangeText={setCost} />

        <Text style={styles.label}>Quantity</Text>
        <TextInput style={styles.input} keyboardType="number-pad" value={qty} onChangeText={setQty} />

        <Pressable style={styles.button} onPress={save} disabled={saving}>
          <Text style={styles.buttonText}>{saving ? 'Saving…' : 'Allocate to job'}</Text>
        </Pressable>

        <Pressable style={styles.discardButton} onPress={discard}>
          <Text style={styles.discardButtonText}>Discard receipt</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xl },
  preview: { width: '100%', height: 220, borderRadius: 8, backgroundColor: colors.surface, marginBottom: spacing.md },
  label: { color: colors.textMuted, marginBottom: spacing.xs, marginTop: spacing.md },
  noJobs: { color: colors.textMuted, fontStyle: 'italic' },
  jobList: { gap: spacing.xs },
  jobRow: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
  },
  jobRowSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  jobRowText: { color: colors.text, fontWeight: '600' },
  jobRowTextSelected: { color: colors.onPrimary },
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
  discardButton: { alignItems: 'center', marginTop: spacing.lg, padding: spacing.md },
  discardButtonText: { color: colors.bad, fontWeight: '600' },
});
