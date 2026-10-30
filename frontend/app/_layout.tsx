import { useEffect, useState, type ReactNode } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { colors } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { PurchasesProvider, usePurchases } from '@/lib/purchases-context';
import SignInScreen from './sign-in';
import PaywallScreen from './paywall';
import ResetPasswordScreen from './reset-password';

SplashScreen.preventAutoHideAsync().catch(() => {});

/** Supabase's password-recovery link puts tokens in the URL fragment: margyn://reset-password#access_token=...&type=recovery */
function parseRecoveryTokens(url: string): { access_token: string; refresh_token: string } | null {
  const hashIndex = url.indexOf('#');
  const queryIndex = url.indexOf('?');
  const paramsString = hashIndex >= 0 ? url.slice(hashIndex + 1) : queryIndex >= 0 ? url.slice(queryIndex + 1) : '';
  if (!paramsString) return null;
  const params = new URLSearchParams(paramsString);
  if (params.get('type') !== 'recovery') return null;
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  if (!access_token || !refresh_token) return null;
  return { access_token, refresh_token };
}

function PurchasesGate({ children }: { children: ReactNode }) {
  const { loading, isEntitled } = usePurchases();
  if (loading) return null;
  if (!isEntitled) return <PaywallScreen />;
  return <>{children}</>;
}

function MainStack() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="job/[id]" options={{ headerShown: true, title: 'Job' }} />
      <Stack.Screen name="job/new" options={{ headerShown: true, title: 'New job', presentation: 'modal' }} />
      <Stack.Screen name="job/edit" options={{ headerShown: true, title: 'Edit job', presentation: 'modal' }} />
      <Stack.Screen name="job/material/[id]" options={{ headerShown: true, title: 'Material' }} />
      <Stack.Screen name="job/time/[id]" options={{ headerShown: true, title: 'Time entry' }} />
      <Stack.Screen name="trash" options={{ headerShown: true, title: 'Trash' }} />
      <Stack.Screen name="receipts/index" options={{ headerShown: true, title: 'Receipts' }} />
      <Stack.Screen name="receipts/[id]" options={{ headerShown: true, title: 'Allocate receipt' }} />
    </Stack>
  );
}

function AppShell() {
  const { session, loading: authLoading } = useAuth();
  const [fontsLoaded] = useFonts({
    Anton: require('@/assets/fonts/Anton-Regular.ttf'),
  });
  const [needsPasswordReset, setNeedsPasswordReset] = useState(false);

  const ready = fontsLoaded && !authLoading;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  useEffect(() => {
    const handleUrl = async (url: string | null) => {
      if (!url) return;
      const tokens = parseRecoveryTokens(url);
      if (!tokens) return;
      const { error } = await supabase.auth.setSession(tokens);
      if (!error) setNeedsPasswordReset(true);
    };
    Linking.getInitialURL().then(handleUrl);
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, []);

  if (!ready) return null;
  if (needsPasswordReset) return <ResetPasswordScreen onDone={() => setNeedsPasswordReset(false)} />;
  if (!session) return <SignInScreen />;

  return (
    <PurchasesProvider userId={session.user.id}>
      <PurchasesGate>
        <MainStack />
      </PurchasesGate>
    </PurchasesProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <SafeAreaProvider>
          <StatusBar style="dark" />
          <AppShell />
        </SafeAreaProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
