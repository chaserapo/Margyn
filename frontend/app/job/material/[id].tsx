import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/lib/api';
import { colors, spacing } from '@/constants/theme';
import type { MaterialLine } from '@/lib/types';

export default function MaterialDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [material, setMaterial] = useState<MaterialLine | null>(null);
  const [name, setName] = useState('');
  const [cost, setCost] = useState('');
  const [qty, setQty] = useState('1');
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [localPhotoUri, setLocalPhotoUri] = useState<string | null>(null);
  const [removeReceipt, setRemoveReceipt] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      setLoading(true);
      setRemoveReceipt(false);
      setLocalPhotoUri(null);
      api
        .getMaterial(id)
        .then(async (m) => {
          setMaterial(m);
          setName(m.name);
          setCost((m.cost_cents / 100).toString());
          setQty(m.qty.toString());
          if (m.receipt_path) setReceiptUrl(await api.getReceiptUrl(m.receipt_path));
          else setReceiptUrl(null);
        })
        .catch((e) => Alert.alert('Failed to load', e instanceof Error ? e.message : undefined))
        .finally(() => setLoading(false));
    }, [id])
  );

  const pickPhoto = () => {
    Alert.alert('Receipt photo', undefined, [
      {
        text: 'Take photo',
        onPress: async () => {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) return;
          const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
          if (!result.canceled) {
            setLocalPhotoUri(result.assets[0].uri);
            setRemoveReceipt(false);
          }
        },
      },
      {
        text: 'Choose from library',
        onPress: async () => {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!perm.granted) return;
          const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
          if (!result.canceled) {
            setLocalPhotoUri(result.assets[0].uri);
            setRemoveReceipt(false);
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const save = async () => {
    if (!id || !material || !name.trim() || !cost) {
      Alert.alert('Item name and cost are required');
      return;
    }
    setSaving(true);
    try {
      let receiptPath: string | null | undefined = undefined;
      if (localPhotoUri) {
        receiptPath = await api.uploadReceipt(localPhotoUri);
        if (material.receipt_path) await api.deleteReceipt(material.receipt_path);
      } else if (removeReceipt && material.receipt_path) {
        await api.deleteReceipt(material.receipt_path);
        receiptPath = null;
      }
      await api.updateMaterial(id, {
        name: name.trim(),
        cost_cents: Math.round(parseFloat(cost) * 100),
        qty: parseInt(qty || '1', 10),
        ...(receiptPath !== undefined ? { receipt_path: receiptPath } : {}),
      });
      router.back();
    } catch (e) {
      Alert.alert('Failed to save', e instanceof Error ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  const remove = () => {
    if (!id) return;
    Alert.alert('Delete this item?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
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

  const showPreview = localPhotoUri || (receiptUrl && !removeReceipt);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.label}>Item</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} />

      <Text style={styles.label}>Cost ($)</Text>
      <TextInput style={styles.input} keyboardType="decimal-pad" value={cost} onChangeText={setCost} />

      <Text style={styles.label}>Quantity</Text>
      <TextInput style={styles.input} keyboardType="number-pad" value={qty} onChangeText={setQty} />

      <Text style={styles.label}>Receipt</Text>
      {showPreview ? (
        <View>
          <Image source={{ uri: localPhotoUri ?? receiptUrl! }} style={styles.preview} />
          <View style={styles.photoActions}>
            <Pressable onPress={pickPhoto}><Text style={styles.linkText}>Replace</Text></Pressable>
            <Pressable
              onPress={() => {
                setLocalPhotoUri(null);
                setRemoveReceipt(true);
              }}
            >
              <Text style={[styles.linkText, { color: colors.bad }]}>Remove</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable style={styles.photoButton} onPress={pickPhoto}>
          <Text style={styles.photoButtonText}>Add receipt photo</Text>
        </Pressable>
      )}

      <Pressable style={styles.button} onPress={save} disabled={saving}>
        <Text style={styles.buttonText}>{saving ? 'Saving…' : 'Save'}</Text>
      </Pressable>

      <Pressable style={styles.deleteButton} onPress={remove}>
        <Text style={styles.deleteButtonText}>Delete item</Text>
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
  preview: { width: '100%', height: 180, borderRadius: 8, backgroundColor: colors.surface },
  photoActions: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.sm },
  linkText: { color: colors.text, fontWeight: '600' },
  photoButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: spacing.md,
    alignItems: 'center',
  },
  photoButtonText: { color: colors.textMuted, fontWeight: '600' },
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
