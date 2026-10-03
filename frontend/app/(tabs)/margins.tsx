import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { G, Line, Rect, Text as SvgText } from 'react-native-svg';
import { api } from '@/lib/api';
import { colors, fonts, marginColor, spacing } from '@/constants/theme';
import type { JobSummary, Settings } from '@/lib/types';

type Period = 'daily' | 'weekly' | 'monthly';

const PERIOD_LABELS: Record<Period, string> = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' };
const PERIOD_COUNT: Record<Period, number> = { daily: 14, weekly: 8, monthly: 6 };

function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = (day + 6) % 7; // Monday = 0
  copy.setDate(copy.getDate() - diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function bucketDate(d: Date, period: Period): Date {
  if (period === 'daily') {
    const copy = new Date(d);
    copy.setHours(0, 0, 0, 0);
    return copy;
  }
  if (period === 'weekly') return startOfWeek(d);
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function bucketKey(d: Date, period: Period): string {
  return bucketDate(d, period).toISOString();
}

function bucketLabel(d: Date, period: Period): string {
  if (period === 'daily') return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  if (period === 'weekly') return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
}

function stepBucket(d: Date, period: Period, count: number): Date {
  const copy = new Date(d);
  if (period === 'daily') copy.setDate(copy.getDate() + count);
  else if (period === 'weekly') copy.setDate(copy.getDate() + count * 7);
  else copy.setMonth(copy.getMonth() + count);
  return copy;
}

interface Bucket {
  key: string;
  label: string;
  avgMargin: number | null;
  count: number;
}

function buildBuckets(jobs: JobSummary[], period: Period): Bucket[] {
  const closed = jobs.filter((j) => j.status === 'closed' && j.closed_at);
  const sums = new Map<string, { total: number; count: number }>();
  for (const job of closed) {
    const key = bucketKey(new Date(job.closed_at as string), period);
    const entry = sums.get(key) ?? { total: 0, count: 0 };
    entry.total += job.margin_pct;
    entry.count += 1;
    sums.set(key, entry);
  }

  const n = PERIOD_COUNT[period];
  const anchor = bucketDate(new Date(), period);
  const buckets: Bucket[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = stepBucket(anchor, period, -i);
    const key = d.toISOString();
    const entry = sums.get(key);
    const avg = entry ? entry.total / entry.count : null;
    buckets.push({
      key,
      label: bucketLabel(d, period),
      avgMargin: avg !== null && Number.isFinite(avg) ? avg : null,
      count: entry?.count ?? 0,
    });
  }
  return buckets;
}

const CHART_HEIGHT = 200;
const BAR_WIDTH = 36;
const BAR_GAP = 16;

function MarginChart({ buckets, targetPct }: { buckets: Bucket[]; targetPct: number }) {
  const safeTargetPct = Number.isFinite(targetPct) ? targetPct : 40;
  const values = buckets
    .map((b) => b.avgMargin)
    .filter((v): v is number => v !== null && Number.isFinite(v));
  const maxVal = Math.max(safeTargetPct, ...values, 10);
  const minVal = Math.min(0, ...values);
  const range = maxVal - minVal || 1;
  const plotHeight = CHART_HEIGHT - 40;
  const zeroY = 20 + (plotHeight * (maxVal - 0)) / range;

  const valueToY = (v: number) => 20 + (plotHeight * (maxVal - v)) / range;
  const width = buckets.length * (BAR_WIDTH + BAR_GAP) + BAR_GAP;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg }}>
      <Svg width={width} height={CHART_HEIGHT + 24}>
        <Line x1={0} y1={zeroY} x2={width} y2={zeroY} stroke={colors.border} strokeWidth={1} />
        {buckets.map((b, i) => {
          const x = BAR_GAP + i * (BAR_WIDTH + BAR_GAP);
          if (b.avgMargin === null || !Number.isFinite(b.avgMargin)) {
            return (
              <SvgText key={b.key} x={x + BAR_WIDTH / 2} y={CHART_HEIGHT + 16} fontSize={10} fill={colors.textMuted} textAnchor="middle">
                {b.label}
              </SvgText>
            );
          }
          const barY = Math.min(valueToY(b.avgMargin), zeroY);
          const barHeight = Math.max(Math.abs(valueToY(b.avgMargin) - zeroY), 2);
          const color = marginColor(b.avgMargin, safeTargetPct);
          return (
            <G key={b.key}>
              <Rect x={x} y={barY} width={BAR_WIDTH} height={barHeight} fill={color} rx={4} />
              <SvgText
                x={x + BAR_WIDTH / 2}
                y={valueToY(b.avgMargin) - (b.avgMargin >= 0 ? 6 : -14)}
                fontSize={11}
                fontWeight="700"
                fill={colors.text}
                textAnchor="middle"
              >
                {b.avgMargin.toFixed(0)}%
              </SvgText>
              <SvgText x={x + BAR_WIDTH / 2} y={CHART_HEIGHT + 16} fontSize={10} fill={colors.textMuted} textAnchor="middle">
                {b.label}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    </ScrollView>
  );
}

export default function MarginsScreen() {
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [period, setPeriod] = useState<Period>('weekly');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [j, s] = await Promise.all([api.listJobs(), api.getSettings()]);
      setJobs(j);
      setSettings(s);
    } catch (e) {
      Alert.alert('Failed to load margin data', e instanceof Error ? e.message : undefined);
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
  const buckets = useMemo(() => buildBuckets(jobs, period), [jobs, period]);
  const closedJobs = useMemo(() => jobs.filter((j) => j.status === 'closed'), [jobs]);

  const overall = useMemo(() => {
    if (closedJobs.length === 0) return null;
    const avg = closedJobs.reduce((sum, j) => sum + j.margin_pct, 0) / closedJobs.length;
    return Number.isFinite(avg) ? avg : null;
  }, [closedJobs]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Margin</Text>
      </View>

      <View style={styles.pillGroup}>
        {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
          <Pressable key={p} style={[styles.pill, period === p && styles.pillActive]} onPress={() => setPeriod(p)}>
            <Text style={[styles.pillText, period === p && styles.pillTextActive]}>{PERIOD_LABELS[p]}</Text>
          </Pressable>
        ))}
      </View>

      {closedJobs.length === 0 && !loading ? (
        <Text style={styles.empty}>Close some jobs to start seeing margin trends here.</Text>
      ) : (
        <>
          <View style={styles.summaryRow}>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>Overall avg margin</Text>
              <Text style={[styles.summaryValue, { color: overall !== null ? marginColor(overall, targetPct) : colors.text }]}>
                {overall !== null ? `${overall.toFixed(0)}%` : '—'}
              </Text>
            </View>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>Target</Text>
              <Text style={styles.summaryValue}>{targetPct}%</Text>
            </View>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>Closed jobs</Text>
              <Text style={styles.summaryValue}>{closedJobs.length}</Text>
            </View>
          </View>

          <MarginChart buckets={buckets} targetPct={targetPct} />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: { fontSize: 30, fontFamily: fonts.display, color: colors.text },
  pillGroup: { flexDirection: 'row', gap: spacing.xs, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
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
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl, paddingHorizontal: spacing.lg },
  summaryRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  summaryBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.sm,
  },
  summaryLabel: { fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  summaryValue: { fontSize: 20, fontFamily: fonts.display, color: colors.text, marginTop: 2 },
});
