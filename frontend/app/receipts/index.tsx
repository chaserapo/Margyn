import { useCallback, useState } from 'react';
import { Alert, FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/lib/api';
import { colors, fonts, spacing } from '@/constants/theme';
import type { MaterialLine } from '@/lib/types';

export default function ReceiptsInboxScreen() {
  const router = useRouter();
  const [receipts, setReceipts] = useState<MaterialLine[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(false);
  const [capturing, setCapturing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.listUnassignedReceipts();
      setReceipts(list);
      const urls = await Promise.all(
        list.map(async (r) => [r.id, r.receipt_path ? await api.getReceiptUrl(r.receipt_path) : null] as const)
      );
      setThumbs(Object.fromEntries(urls));
    } catch (e) {
      Alert.alert('Failed to load receipts', e instanceof Error ? e.message : undefined);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const capture = async (localUri: string) => {
    setCapturing(true);
    try {
      const path = await api.uploadReceipt(localUri);
      const receipt = await api.captureReceipt(path);
      router.push(`/receipts/${receipt.id}`);
    } catch (e) {
      Alert.alert('Failed to save photo', e instanceof Error ? e.message : undefined);
    } finally {
      setCapturing(false);
    }
  };

  const addReceipt = () => {
    Alert.alert('Add receipt photo', undefined, [
      {
        text: 'Take photo',
        onPress: async () => {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) return;
          const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
          if (!result.canceled) capture(result.assets[0].uri);
        },
      },
      {
        text: 'Choose from library',
        onPress: async () => {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!perm.granted) return;
          const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
          if (!result.canceled) capture(result.assets[0].uri);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.subtitle}>Snap a receipt now, allocate it to a job later.</Text>
        <Pressable style={styles.addButton} onPress={addReceipt} disabled={capturing}>
          <Text style={styles.addButtonText}>{capturing ? '…' : '+ Receipt'}</Text>
        </Pressable>
      </View>

      <FlatList
        data={receipts}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>No unassigned receipts.</Text> : null}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => router.push(`/receipts/${item.id}`)}>
            {thumbs[item.id] ? (
              <Image source={{ uri: thumbs[item.id]! }} style={styles.thumb} />
            ) : (
              <View style={[styles.thumb, styles.thumbPlaceholder]} />
            )}
            <View style={styles.cardInfo}>
              <Text style={styles.cardDate}>{new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
              <Text style={styles.cardStatus}>Unassigned — tap to allocate</Text>
            </View>
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
    gap: spacing.sm,
  },
  subtitle: { color: colors.textMuted, flex: 1 },
  addButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  addButtonText: { color: colors.onPrimary, fontWeight: '600' },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.sm },
  empty: { color: colors.textMuted, marginTop: spacing.xl, textAlign: 'center' },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    gap: spacing.md,
    alignItems: 'center',
  },
  thumb: { width: 56, height: 56, borderRadius: 8, backgroundColor: colors.background },
  thumbPlaceholder: { borderWidth: 1, borderColor: colors.border },
  cardInfo: { flex: 1 },
  cardDate: { color: colors.text, fontWeight: '600', fontSize: 15 },
  cardStatus: { color: colors.textMuted, marginTop: 2, fontSize: 13 },
});
