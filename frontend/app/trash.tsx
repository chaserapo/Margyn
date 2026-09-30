import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/lib/api';
import { formatCents } from '@/lib/format';
import { colors, spacing } from '@/constants/theme';
import type { Job } from '@/lib/types';

export default function TrashScreen() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setJobs(await api.listDeletedJobs());
    } catch (e) {
      Alert.alert('Failed to load trash', e instanceof Error ? e.message : undefined);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const restore = async (job: Job) => {
    try {
      await api.restoreJob(job.id);
      setJobs((prev) => prev.filter((j) => j.id !== job.id));
    } catch (e) {
      Alert.alert('Failed to restore', e instanceof Error ? e.message : undefined);
    }
  };

  const deleteForever = (job: Job) => {
    Alert.alert('Delete forever?', `"${job.client_name}" and all its materials, time, and receipts will be permanently deleted. This can't be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete forever',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.permanentlyDeleteJob(job.id);
            setJobs((prev) => prev.filter((j) => j.id !== job.id));
          } catch (e) {
            Alert.alert('Failed to delete', e instanceof Error ? e.message : undefined);
          }
        },
      },
    ]);
  };

  const emptyTrash = () => {
    if (jobs.length === 0) return;
    Alert.alert('Empty trash?', `Permanently delete all ${jobs.length} job(s) in Trash. This can't be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Empty trash',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.emptyTrash();
            setJobs([]);
          } catch (e) {
            Alert.alert('Failed to empty trash', e instanceof Error ? e.message : undefined);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.subtitle}>Jobs here can be restored, or deleted for good.</Text>
        {jobs.length > 0 && (
          <Pressable onPress={emptyTrash}>
            <Text style={styles.emptyLink}>Empty trash</Text>
          </Pressable>
        )}
      </View>

      <FlatList
        data={jobs}
        keyExtractor={(job) => job.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>Trash is empty.</Text> : null}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.clientName}>{item.client_name}</Text>
            <Text style={styles.quoted}>Quoted {formatCents(item.quoted_price_cents)}</Text>
            <View style={styles.actions}>
              <Pressable style={styles.restoreButton} onPress={() => restore(item)}>
                <Text style={styles.restoreButtonText}>Restore</Text>
              </Pressable>
              <Pressable style={styles.deleteButton} onPress={() => deleteForever(item)}>
                <Text style={styles.deleteButtonText}>Delete forever</Text>
              </Pressable>
            </View>
          </View>
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
  subtitle: { color: colors.textMuted, flex: 1, marginRight: spacing.sm },
  emptyLink: { color: colors.bad, fontWeight: '600' },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.sm },
  empty: { color: colors.textMuted, marginTop: spacing.xl, textAlign: 'center' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  clientName: { fontSize: 17, fontWeight: '600', color: colors.text },
  quoted: { color: colors.textMuted, marginTop: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  restoreButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  restoreButtonText: { color: colors.text, fontWeight: '600' },
  deleteButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.bad,
    alignItems: 'center',
  },
  deleteButtonText: { color: '#fff', fontWeight: '600' },
});
