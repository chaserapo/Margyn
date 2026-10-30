import { useCallback, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/lib/api';
import { signOut } from '@/lib/auth';
import { colors, fonts, spacing } from '@/constants/theme';

export default function SettingsScreen() {
  const [hourlyRate, setHourlyRate] = useState('');
  const [targetMargin, setTargetMargin] = useState('');
  const [notifyBelowTarget, setNotifyBelowTarget] = useState(true);
  const [notifyOverBudget, setNotifyOverBudget] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      api
        .getSettings()
        .then((s) => {
          setHourlyRate((s.hourly_rate_cents / 100).toString());
          setTargetMargin(s.target_margin_pct.toString());
          setNotifyBelowTarget(s.notify_below_target);
          setNotifyOverBudget(s.notify_over_budget);
        })
        .catch(() => {});
    }, [])
  );

  const save = async () => {
    setSaving(true);
    try {
      await api.updateSettings({
        hourly_rate_cents: Math.round(parseFloat(hourlyRate || '0') * 100),
        target_margin_pct: parseFloat(targetMargin || '0'),
        notify_below_target: notifyBelowTarget,
        notify_over_budget: notifyOverBudget,
      });
      Alert.alert('Saved');
    } catch (e) {
      Alert.alert('Failed to save', e instanceof Error ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  const manageSubscription = () => {
    Linking.openURL('https://apps.apple.com/account/subscriptions').catch(() => {});
  };

  const deleteAccount = () => {
    Alert.alert(
      'Delete your account?',
      'This permanently deletes your account and all your jobs, materials, time entries, and receipts. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Are you absolutely sure?', 'This is permanent and cannot be undone.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete forever',
                style: 'destructive',
                onPress: async () => {
                  setDeleting(true);
                  try {
                    await api.deleteAccount();
                  } catch (e) {
                    Alert.alert('Failed to delete account', e instanceof Error ? e.message : undefined);
                    setDeleting(false);
                  }
                },
              },
            ]);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Settings</Text>

        <Text style={styles.label}>Your hourly rate ($)</Text>
        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          value={hourlyRate}
          onChangeText={setHourlyRate}
          placeholder="65"
        />

        <Text style={styles.label}>Target margin (%)</Text>
        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          value={targetMargin}
          onChangeText={setTargetMargin}
          placeholder="40"
        />

        <Text style={styles.section}>Notifications</Text>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Warn when margin drops below target</Text>
          <Switch
            value={notifyBelowTarget}
            onValueChange={setNotifyBelowTarget}
            trackColor={{ true: colors.primary }}
          />
        </View>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Warn when a job goes over budget</Text>
          <Switch
            value={notifyOverBudget}
            onValueChange={setNotifyOverBudget}
            trackColor={{ true: colors.primary }}
          />
        </View>

        <Pressable style={styles.button} onPress={save} disabled={saving}>
          <Text style={styles.buttonText}>{saving ? 'Saving…' : 'Save'}</Text>
        </Pressable>

        <Text style={styles.section}>Account</Text>
        <Pressable style={styles.linkRow} onPress={manageSubscription}>
          <Text style={styles.linkRowText}>Manage subscription</Text>
        </Pressable>

        <Pressable onPress={() => signOut().catch(() => {})} style={styles.signOutButton}>
          <Text style={styles.signOutButtonText}>Sign out</Text>
        </Pressable>

        <Pressable onPress={deleteAccount} disabled={deleting} style={styles.deleteButton}>
          <Text style={styles.deleteButtonText}>{deleting ? 'Deleting…' : 'Delete account'}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  title: { fontSize: 30, fontFamily: fonts.display, color: colors.text, marginTop: spacing.md, marginBottom: spacing.lg },
  section: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
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
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.sm,
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
  linkRow: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
  },
  linkRowText: { color: colors.text, fontWeight: '600' },
  signOutButton: { alignItems: 'center', marginTop: spacing.xl, padding: spacing.md },
  signOutButtonText: { color: colors.bad, fontWeight: '600' },
  deleteButton: { alignItems: 'center', padding: spacing.md },
  deleteButtonText: { color: colors.textMuted, fontWeight: '600', fontSize: 13 },
});
