import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/lib/api';
import { colors, spacing } from '@/constants/theme';

export default function NewJobScreen() {
  const router = useRouter();
  const [clientName, setClientName] = useState('');
  const [description, setDescription] = useState('');
  const [quotedPrice, setQuotedPrice] = useState('');
  const [billsTravel, setBillsTravel] = useState(false);
  const [travelRate, setTravelRate] = useState('');
  const [saving, setSaving] = useState(false);

  const create = async () => {
    if (!clientName.trim() || !quotedPrice) {
      Alert.alert('Client name and quoted price are required');
      return;
    }
    setSaving(true);
    try {
      const job = await api.createJob({
        client_name: clientName.trim(),
        description: description.trim() || undefined,
        quoted_price_cents: Math.round(parseFloat(quotedPrice) * 100),
        bills_travel: billsTravel,
        travel_rate_cents: billsTravel ? Math.round(parseFloat(travelRate || '0') * 100) : 0,
      });
      router.replace(`/job/${job.id}`);
    } catch (e) {
      Alert.alert('Failed to create job', e instanceof Error ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.label}>Client / job name</Text>
        <TextInput style={styles.input} value={clientName} onChangeText={setClientName} placeholder="Smith kitchen rewire" />

        <Text style={styles.label}>Description (optional)</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={description}
          onChangeText={setDescription}
          placeholder="Rewire kitchen circuit, add 4 outlets"
          multiline
        />

        <Text style={styles.label}>Quoted price ($)</Text>
        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          value={quotedPrice}
          onChangeText={setQuotedPrice}
          placeholder="1200"
        />

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Bill for travel time on this job</Text>
          <Switch value={billsTravel} onValueChange={setBillsTravel} trackColor={{ true: colors.primary }} />
        </View>
        {billsTravel && (
          <>
            <Text style={styles.label}>Travel rate ($ / hour)</Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={travelRate}
              onChangeText={setTravelRate}
              placeholder="40"
            />
          </>
        )}

        <Pressable style={styles.button} onPress={create} disabled={saving}>
          <Text style={styles.buttonText}>{saving ? 'Creating…' : 'Create job'}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xl },
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
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  toggleLabel: { color: colors.text, flex: 1, marginRight: spacing.sm },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  buttonText: { color: colors.onPrimary, fontWeight: '700', fontSize: 16 },
});
