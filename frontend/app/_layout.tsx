import { useEffect, type ReactNode } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { colors } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { PurchasesProvider, usePurchases } from '@/lib/purchases-context';
import SignInScreen from './sign-in';
import PaywallScreen from './paywall';

SplashScreen.preventAutoHideAsync().catch(() => {});

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

  const ready = fontsLoaded && !authLoading;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;
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
