import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SwipeableRow } from '@/components/SwipeableRow';
import { api } from '@/lib/api';
import { formatCents } from '@/lib/format';
import { colors, fonts, marginColor, spacing } from '@/constants/theme';
import type { JobSummary, Settings } from '@/lib/types';

type Tab = 'open' | 'closed';
type GroupMode = 'date' | 'alpha' | 'margin_high' | 'margin_low';

const GROUP_LABELS: Record<GroupMode, string> = {
  date: 'Date',
  alpha: 'A–Z',
  margin_high: 'Margin ↓',
  margin_low: 'Margin ↑',
};

function dateLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(d, today)) return 'Today';
  if (sameDay(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function buildSections(jobs: JobSummary[], groupMode: GroupMode) {
  if (groupMode === 'alpha') {
    const sorted = [...jobs].sort((a, b) => a.client_name.localeCompare(b.client_name));
    return sorted.length ? [{ title: 'All jobs', data: sorted }] : [];
  }
  if (groupMode === 'margin_high' || groupMode === 'margin_low') {
    const sorted = [...jobs].sort((a, b) =>
      groupMode === 'margin_high' ? b.margin_pct - a.margin_pct : a.margin_pct - b.margin_pct
    );
    return sorted.length ? [{ title: groupMode === 'margin_high' ? 'Highest margin first' : 'Lowest margin first', data: sorted }] : [];
  }
  const sorted = [...jobs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const groups: { title: string; data: JobSummary[] }[] = [];
  for (const job of sorted) {
    const label = dateLabel(job.created_at);
    const last = groups[groups.length - 1];
    if (last && last.title === label) last.data.push(job);
    else groups.push({ title: label, data: [job] });
  }
  return groups;
}

export default function JobsScreen() {
  const router = useRouter();
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('open');
  const [groupMode, setGroupMode] = useState<GroupMode>('date');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [j, s] = await Promise.all([api.listJobs(), api.getSettings()]);
      setJobs(j);
      setSettings(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const targetPct = settings?.target_margin_pct ?? 40;

  const filtered = useMemo(() => jobs.filter((j) => j.status === tab), [jobs, tab]);
  const sections = useMemo(() => buildSections(filtered, groupMode), [filtered, groupMode]);

  const stats = useMemo(() => {
    if (tab !== 'closed' || filtered.length === 0) return null;
    const avg = filtered.reduce((sum, j) => sum + j.margin_pct, 0) / filtered.length;
    const best = filtered.reduce((a, b) => (b.margin_pct > a.margin_pct ? b : a));
    const worst = filtered.reduce((a, b) => (b.margin_pct < a.margin_pct ? b : a));
    return { avg, best, worst };
  }, [filtered, tab]);

  const confirmDelete = (job: JobSummary) => {
    Alert.alert('Move this job to Trash?', `"${job.client_name}" will move to Trash. You can restore it from there.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteJob(job.id);
            setJobs((prev) => prev.filter((j) => j.id !== job.id));
          } catch (e) {
            Alert.alert('Failed to delete', e instanceof Error ? e.message : undefined);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Jobs</Text>
        <View style={styles.headerButtons}>
          <Pressable style={styles.trashButton} onPress={() => router.push('/trash')}>
            <Text style={styles.trashButtonText}>Trash</Text>
          </Pressable>
          <Pressable style={styles.addButton} onPress={() => router.push('/job/new')}>
            <Text style={styles.addButtonText}>+ New job</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.controls}>
        <View style={styles.pillGroup}>
          <Pressable style={[styles.pill, tab === 'open' && styles.pillActive]} onPress={() => setTab('open')}>
            <Text style={[styles.pillText, tab === 'open' && styles.pillTextActive]}>Open</Text>
          </Pressable>
          <Pressable style={[styles.pill, tab === 'closed' && styles.pillActive]} onPress={() => setTab('closed')}>
            <Text style={[styles.pillText, tab === 'closed' && styles.pillTextActive]}>Closed</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.groupRow}>
        {(Object.keys(GROUP_LABELS) as GroupMode[]).map((mode) => (
          <Pressable
            key={mode}
            style={[styles.groupPill, groupMode === mode && styles.groupPillActive]}
            onPress={() => setGroupMode(mode)}
          >
            <Text style={[styles.groupPillText, groupMode === mode && styles.groupPillTextActive]}>
              {GROUP_LABELS[mode]}
            </Text>
          </Pressable>
        ))}
      </View>

      {stats && (
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Avg margin</Text>
            <Text style={[styles.statValue, { color: marginColor(stats.avg, targetPct) }]}>
              {stats.avg.toFixed(0)}%
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Best</Text>
            <Text style={styles.statValueSmall} numberOfLines={1}>{stats.best.client_name}</Text>
            <Text style={[styles.statValue, { color: colors.good }]}>{stats.best.margin_pct.toFixed(0)}%</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Worst</Text>
            <Text style={styles.statValueSmall} numberOfLines={1}>{stats.worst.client_name}</Text>
            <Text style={[styles.statValue, { color: colors.bad }]}>{stats.worst.margin_pct.toFixed(0)}%</Text>
          </View>
        </View>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      <SectionList
        sections={sections}
        keyExtractor={(job) => job.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.empty}>
              {tab === 'open' ? 'No open jobs. Add your first job to start tracking margin.' : 'No closed jobs yet.'}
            </Text>
          ) : null
        }
        renderSectionHeader={({ section }) => <Text style={styles.sectionHeader}>{section.title}</Text>}
        renderItem={({ item }) => (
          <SwipeableRow onDelete={() => confirmDelete(item)}>
            <Pressable style={styles.card} onPress={() => router.push(`/job/${item.id}`)}>
              <View style={styles.cardRow}>
                <Text style={styles.clientName}>{item.client_name}</Text>
                <Text style={[styles.marginBadge, { color: marginColor(item.margin_pct, targetPct) }]}>
                  {item.margin_pct.toFixed(0)}%
                </Text>
              </View>
              <Text style={styles.quoted}>Quoted {formatCents(item.quoted_price_cents)}</Text>
            </Pressable>
          </SwipeableRow>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: { fontSize: 30, fontFamily: fonts.display, color: colors.text },
  headerButtons: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  trashButton: { paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
  trashButtonText: { color: colors.textMuted, fontWeight: '600', fontSize: 13 },
  addButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  addButtonText: { color: colors.onPrimary, fontWeight: '600' },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  pillGroup: { flexDirection: 'row', gap: spacing.xs },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText: { color: colors.textMuted, fontWeight: '600', fontSize: 13 },
  pillTextActive: { color: colors.onPrimary },
  groupRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  groupPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  groupPillActive: { backgroundColor: colors.text, borderColor: colors.text },
  groupPillText: { color: colors.textMuted, fontWeight: '600', fontSize: 11 },
  groupPillTextActive: { color: colors.background },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.sm,
    minWidth: 0,
  },
  statLabel: { fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  statValue: { fontSize: 18, fontFamily: fonts.display, marginTop: 2 },
  statValueSmall: { fontSize: 11, color: colors.text, marginTop: 2 },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.sm },
  empty: { color: colors.textMuted, marginTop: spacing.xl, textAlign: 'center' },
  error: { color: colors.bad, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  clientName: { fontSize: 17, fontWeight: '600', color: colors.text, flexShrink: 1 },
  marginBadge: { fontSize: 15, fontWeight: '800' },
  quoted: { color: colors.textMuted, marginTop: spacing.xs },
});
