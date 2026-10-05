import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import { getCurrentOffering, purchasePackage, restorePurchases } from '@/lib/purchases';
import { usePurchases } from '@/lib/purchases-context';
import { signOut } from '@/lib/auth';
import { colors, fonts, spacing } from '@/constants/theme';

const FEATURES = [
  'Track quotes, materials, time and travel on every job',
  'See your real profit margin while a job is still open',
  'Margin trends over time, and a PDF report for any closed job',
];

export default function PaywallScreen() {
  const { refresh } = usePurchases();
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyPackageId, setBusyPackageId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      getCurrentOffering()
        .then(setOffering)
        .finally(() => setLoading(false));
    }, [])
  );

  const buy = async (pkg: PurchasesPackage) => {
    setBusyPackageId(pkg.identifier);
    try {
      const entitled = await purchasePackage(pkg);
      if (entitled) await refresh();
    } catch (e: any) {
      if (!e?.userCancelled) {
        Alert.alert('Purchase failed', e instanceof Error ? e.message : undefined);
      }
    } finally {
      setBusyPackageId(null);
    }
  };

  const restore = async () => {
    setRestoring(true);
    try {
      const entitled = await restorePurchases();
      if (entitled) {
        await refresh();
      } else {
        Alert.alert('No active subscription found for this account');
      }
    } catch (e) {
      Alert.alert('Restore failed', e instanceof Error ? e.message : undefined);
    } finally {
      setRestoring(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Margyn</Text>
      <Text style={styles.subtitle}>Know your margin on every job.</Text>

      <View style={styles.features}>
        {FEATURES.map((f) => (
          <Text key={f} style={styles.feature}>
            {'•'} {f}
          </Text>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : offering && offering.availablePackages.length > 0 ? (
        <View style={styles.packages}>
          {offering.availablePackages.map((pkg) => (
            <Pressable
              key={pkg.identifier}
              style={styles.button}
              onPress={() => buy(pkg)}
              disabled={busyPackageId !== null}
            >
              <Text style={styles.buttonText}>
                {busyPackageId === pkg.identifier ? 'Please wait…' : 'Start free trial'}
              </Text>
              <Text style={styles.buttonSubtext}>{pkg.product.priceString} / month after your 7-day trial</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <Text style={styles.empty}>Subscription plans aren't available right now. Please try again shortly.</Text>
      )}

      <Pressable onPress={restore} disabled={restoring} style={styles.restoreLink}>
        <Text style={styles.restoreLinkText}>{restoring ? 'Restoring…' : 'Restore purchases'}</Text>
      </Pressable>

      <Pressable onPress={() => signOut().catch(() => {})} style={styles.signOutLink}>
        <Text style={styles.signOutLinkText}>Sign out</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg, justifyContent: 'center' },
  title: { fontSize: 40, fontFamily: fonts.display, color: colors.text, textAlign: 'center' },
  subtitle: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xs, marginBottom: spacing.xl },
  features: { gap: spacing.sm, marginBottom: spacing.xl },
  feature: { color: colors.text, fontSize: 15, lineHeight: 21 },
  packages: { gap: spacing.sm },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: spacing.md,
    alignItems: 'center',
  },
  buttonText: { color: colors.onPrimary, fontWeight: '700', fontSize: 16 },
  buttonSubtext: { color: colors.onPrimary, opacity: 0.8, fontSize: 12, marginTop: 2 },
  empty: { color: colors.textMuted, textAlign: 'center' },
  restoreLink: { marginTop: spacing.lg, alignItems: 'center' },
  restoreLinkText: { color: colors.text, fontWeight: '600' },
  signOutLink: { marginTop: spacing.md, alignItems: 'center', padding: spacing.sm },
  signOutLinkText: { color: colors.bad, fontWeight: '600' },
});
