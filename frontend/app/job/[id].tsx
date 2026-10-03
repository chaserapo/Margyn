import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { api } from '@/lib/api';
import { formatCents } from '@/lib/format';
import { buildJobReportHtml } from '@/lib/report';
import { colors, fonts, marginColor, spacing } from '@/constants/theme';
import type { JobDetail, Settings } from '@/lib/types';

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);

  const [materialName, setMaterialName] = useState('');
  const [materialCost, setMaterialCost] = useState('');
  const [materialQty, setMaterialQty] = useState('1');

  const [hours, setHours] = useState('');
  const [note, setNote] = useState('');

  const [travelHours, setTravelHours] = useState('');
  const [travelNote, setTravelNote] = useState('');

  const targetPct = settings?.target_margin_pct ?? 40;

  const load = useCallback(async () => {
    if (!id) return;
    const [j, s] = await Promise.all([api.getJob(id), api.getSettings()]);
    setJob(j);
    setSettings(s);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load().catch((e) => Alert.alert('Failed to load job', e instanceof Error ? e.message : undefined));
    }, [load])
  );

  const refreshAndWarn = useCallback(async () => {
    if (!id) return;
    const [updated, s] = await Promise.all([api.getJob(id), api.getSettings()]);
    setJob(updated);
    setSettings(s);
    if (updated.status !== 'open') return;
    if (s.notify_over_budget && updated.margin_cents < 0) {
      Alert.alert('Over budget', `This job has gone over budget — costs now exceed the ${formatCents(updated.quoted_price_cents)} quote.`);
    } else if (s.notify_below_target && updated.margin_pct < s.target_margin_pct) {
      Alert.alert(
        'Below target margin',
        `This job is now at ${updated.margin_pct.toFixed(0)}% margin — below your ${s.target_margin_pct}% target.`
      );
    }
  }, [id]);

  if (!job) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loading}>Loading…</Text>
      </SafeAreaView>
    );
  }

  const isClosed = job.status === 'closed';
  const laborEntries = job.time_entries.filter((t) => t.kind !== 'travel');
  const travelEntries = job.time_entries.filter((t) => t.kind === 'travel');

  const addMaterial = async () => {
    if (!materialName.trim() || !materialCost) return;
    await api.addMaterial(job.id, {
      name: materialName.trim(),
      cost_cents: Math.round(parseFloat(materialCost) * 100),
      qty: parseInt(materialQty || '1', 10),
    });
    setMaterialName('');
    setMaterialCost('');
    setMaterialQty('1');
    refreshAndWarn();
  };

  const addTime = async () => {
    if (!hours) return;
    await api.addTimeEntry(job.id, { hours: parseFloat(hours), note: note.trim() || undefined, kind: 'labor' });
    setHours('');
    setNote('');
    refreshAndWarn();
  };

  const addTravel = async () => {
    if (!travelHours) return;
    await api.addTimeEntry(job.id, { hours: parseFloat(travelHours), note: travelNote.trim() || undefined, kind: 'travel' });
    setTravelHours('');
    setTravelNote('');
    refreshAndWarn();
  };

  const close = async () => {
    Alert.alert('Close job?', 'This locks in the final margin.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Close job',
        style: 'destructive',
        onPress: async () => {
          await api.closeJob(job.id);
          load();
        },
      },
    ]);
  };

  const deleteJob = () => {
    Alert.alert('Move this job to Trash?', 'You can restore it from Trash, or delete it for good from there.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Move to Trash',
        style: 'destructive',
        onPress: async () => {
          await api.deleteJob(job.id);
          router.back();
        },
      },
    ]);
  };

  const share = async () => {
    try {
      const html = buildJobReportHtml(job);
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `${job.client_name} — job report` });
      } else {
        Alert.alert('Sharing not available on this device');
      }
    } catch (e) {
      Alert.alert('Failed to export PDF', e instanceof Error ? e.message : undefined);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <View style={styles.headerActions}>
              {!isClosed && (
                <Pressable onPress={() => router.push(`/job/edit?id=${job.id}`)} hitSlop={8}>
                  <Text style={styles.headerActionText}>Edit</Text>
                </Pressable>
              )}
              {isClosed && (
                <Pressable onPress={share} hitSlop={8}>
                  <Text style={styles.headerActionText}>Share</Text>
                </Pressable>
              )}
              <Pressable onPress={deleteJob} hitSlop={8}>
                <Text style={[styles.headerActionText, { color: colors.bad }]}>Delete</Text>
              </Pressable>
            </View>
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.clientName}>{job.client_name}</Text>
        {!!job.description && <Text style={styles.description}>{job.description}</Text>}

        <View style={[styles.marginBanner, { borderColor: marginColor(job.margin_pct, targetPct) }]}>
          <Text style={[styles.marginPct, { color: marginColor(job.margin_pct, targetPct) }]}>
            {job.margin_pct.toFixed(0)}% margin
          </Text>
          <Text style={styles.marginTarget}>Target {targetPct}%</Text>
          <Text style={styles.marginCents}>{formatCents(job.margin_cents)} profit</Text>
        </View>

        <View style={styles.breakdown}>
          <Row label="Quoted price" value={formatCents(job.quoted_price_cents)} />
          <Row label="Materials" value={`- ${formatCents(job.materials_cost_cents)}`} />
          <Row label="Labor" value={`- ${formatCents(job.labor_cost_cents)}`} />
          {job.bills_travel && <Row label="Travel" value={`- ${formatCents(job.travel_cost_cents)}`} />}
          <View style={styles.divider} />
          <Row label="Profit" value={formatCents(job.margin_cents)} bold />
        </View>

        <Section title="Materials">
          {job.materials.map((m) => (
            <Pressable key={m.id} onPress={() => router.push(`/job/material/${m.id}`)}>
              <Row
                label={`${m.name} × ${m.qty}${m.receipt_path ? '  · receipt' : ''}`}
                value={formatCents(m.cost_cents * m.qty)}
                tappable
              />
            </Pressable>
          ))}
          {!isClosed && (
            <View style={styles.addRow}>
              <TextInput
                style={[styles.input, styles.flex2]}
                placeholder="Item"
                value={materialName}
                onChangeText={setMaterialName}
              />
              <TextInput
                style={[styles.input, styles.flex1]}
                placeholder="$"
                keyboardType="decimal-pad"
                value={materialCost}
                onChangeText={setMaterialCost}
              />
              <TextInput
                style={[styles.input, styles.flexSmall]}
                placeholder="Qty"
                keyboardType="number-pad"
                value={materialQty}
                onChangeText={setMaterialQty}
              />
              <Pressable style={styles.addSmallButton} onPress={addMaterial}>
                <Text style={styles.addSmallButtonText}>+</Text>
              </Pressable>
            </View>
          )}
        </Section>

        <Section title="Time">
          {laborEntries.map((t) => (
            <Pressable key={t.id} onPress={() => router.push(`/job/time/${t.id}`)}>
              <Row label={t.note || 'Logged time'} value={`${t.hours}h`} tappable />
            </Pressable>
          ))}
          {!isClosed && (
            <View style={styles.addRow}>
              <TextInput
                style={[styles.input, styles.flex1]}
                placeholder="Hours"
                keyboardType="decimal-pad"
                value={hours}
                onChangeText={setHours}
              />
              <TextInput
                style={[styles.input, styles.flex2]}
                placeholder="Note (optional)"
                value={note}
                onChangeText={setNote}
              />
              <Pressable style={styles.addSmallButton} onPress={addTime}>
                <Text style={styles.addSmallButtonText}>+</Text>
              </Pressable>
            </View>
          )}
        </Section>

        {job.bills_travel && (
          <Section title="Travel">
            {travelEntries.map((t) => (
              <Pressable key={t.id} onPress={() => router.push(`/job/time/${t.id}`)}>
                <Row label={t.note || 'Travel'} value={`${t.hours}h`} tappable />
              </Pressable>
            ))}
            {!isClosed && (
              <View style={styles.addRow}>
                <TextInput
                  style={[styles.input, styles.flex1]}
                  placeholder="Hours"
                  keyboardType="decimal-pad"
                  value={travelHours}
                  onChangeText={setTravelHours}
                />
                <TextInput
                  style={[styles.input, styles.flex2]}
                  placeholder="Note (optional)"
                  value={travelNote}
                  onChangeText={setTravelNote}
                />
                <Pressable style={styles.addSmallButton} onPress={addTravel}>
                  <Text style={styles.addSmallButtonText}>+</Text>
                </Pressable>
              </View>
            )}
          </Section>
        )}

        {!isClosed && (
          <Pressable style={styles.closeButton} onPress={close}>
            <Text style={styles.closeButtonText}>Close job</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, bold, tappable }: { label: string; value: string; bold?: boolean; tappable?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, bold && styles.rowBold, tappable && styles.rowTappable]}>{label}</Text>
      <Text style={[styles.rowValue, bold && styles.rowBold]}>{value}</Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, gap: spacing.md },
  loading: { padding: spacing.lg, color: colors.textMuted },
  headerActions: { flexDirection: 'row', gap: spacing.md, paddingRight: spacing.xs },
  headerActionText: { color: colors.text, fontWeight: '600', fontSize: 15 },
  clientName: { fontSize: 26, fontFamily: fonts.display, color: colors.text },
  description: { color: colors.textMuted, marginTop: spacing.xs, lineHeight: 20 },
  marginBanner: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: 'center',
  },
  marginPct: { fontSize: 40, fontFamily: fonts.display },
  marginTarget: { color: colors.textMuted, marginTop: spacing.xs },
  marginCents: { color: colors.text, marginTop: spacing.xs, fontWeight: '600' },
  breakdown: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
  },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs },
  rowLabel: { color: colors.textMuted },
  rowTappable: { color: colors.text },
  rowValue: { color: colors.text },
  rowBold: { fontWeight: '700', color: colors.text },
  section: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
  },
  sectionTitle: { fontWeight: '700', fontSize: 16, marginBottom: spacing.sm, color: colors.text },
  addRow: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm, alignItems: 'center' },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  flex1: { flex: 1, minWidth: 0 },
  flex2: { flex: 2, minWidth: 0 },
  flexSmall: { width: 56, flexShrink: 0 },
  addSmallButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    width: 40,
    height: 40,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSmallButtonText: { color: colors.onPrimary, fontSize: 20, fontWeight: '700' },
  closeButton: {
    borderWidth: 1,
    borderColor: colors.bad,
    borderRadius: 8,
    padding: spacing.md,
    alignItems: 'center',
  },
  closeButtonText: { color: colors.bad, fontWeight: '700' },
});
