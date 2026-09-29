import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/lib/api';
import { formatCents } from '@/lib/format';
import { colors, fonts, marginColor, spacing } from '@/constants/theme';
import type { JobSummary, Settings } from '@/lib/types';

type Tab = 'open' | 'closed';
type SortMode = 'date' | 'margin';

export default function JobsScreen() {
  const router = useRouter();
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('open');
  const [sortMode, setSortMode] = useState<SortMode>('date');

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

  const filtered = useMemo(() => {
    const rows = jobs.filter((j) => j.status === tab);
    if (sortMode === 'margin') return [...rows].sort((a, b) => a.margin_pct - b.margin_pct);
    return rows;
  }, [jobs, tab, sortMode]);

  const stats = useMemo(() => {
    if (tab !== 'closed' || filtered.length === 0) return null;
    const avg = filtered.reduce((sum, j) => sum + j.margin_pct, 0) / filtered.length;
    const best = filtered.reduce((a, b) => (b.margin_pct > a.margin_pct ? b : a));
    const worst = filtered.reduce((a, b) => (b.margin_pct < a.margin_pct ? b : a));
    return { avg, best, worst };
  }, [filtered, tab]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Jobs</Text>
        <Pressable style={styles.addButton} onPress={() => router.push('/job/new')}>
          <Text style={styles.addButtonText}>+ New job</Text>
        </Pressable>
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
        <Pressable
          style={styles.sortButton}
          onPress={() => setSortMode(sortMode === 'date' ? 'margin' : 'date')}
        >
          <Text style={styles.sortButtonText}>{sortMode === 'date' ? 'Newest' : 'Worst margin'} ↕</Text>
        </Pressable>
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

      <FlatList
        data={filtered}
        keyExtractor={(job) => job.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.empty}>
              {tab === 'open' ? 'No open jobs. Add your first job to start tracking margin.' : 'No closed jobs yet.'}
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => router.push(`/job/${item.id}`)}>
            <View style={styles.cardRow}>
              <Text style={styles.clientName}>{item.client_name}</Text>
              <Text style={[styles.marginBadge, { color: marginColor(item.margin_pct, targetPct) }]}>
                {item.margin_pct.toFixed(0)}%
              </Text>
            </View>
            <Text style={styles.quoted}>Quoted {formatCents(item.quoted_price_cents)}</Text>
          </Pressable>
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
  sortButton: { paddingVertical: 6 },
  sortButtonText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
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
