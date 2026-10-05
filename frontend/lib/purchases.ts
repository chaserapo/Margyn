import { Platform } from 'react-native';
import type { CustomerInfo, PurchasesOffering, PurchasesPackage } from 'react-native-purchases';

/** The RevenueCat entitlement identifier gating the app - set this up in the RevenueCat dashboard. */
export const ENTITLEMENT_ID = 'pro';

// react-native-purchases is iOS/Android only - guard it out so web (used for dev smoke-testing) never loads it.
const Purchases = Platform.OS === 'ios' || Platform.OS === 'android' ? require('react-native-purchases').default : null;

function apiKeyForPlatform(): string | undefined {
  if (Platform.OS === 'ios') return process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
  if (Platform.OS === 'android') return process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;
  return undefined;
}

function isEntitled(info: CustomerInfo): boolean {
  return typeof info.entitlements.active[ENTITLEMENT_ID] !== 'undefined';
}

/** Call once, after the user's Supabase session is known, so purchases attach to the right account. */
export async function configurePurchases(userId: string): Promise<void> {
  if (!Purchases) return;
  const apiKey = apiKeyForPlatform();
  if (!apiKey) return;
  Purchases.configure({ apiKey, appUserID: userId });
}

export async function getIsEntitled(): Promise<boolean> {
  if (!Purchases) return true; // web / unsupported platform - never block, there's nothing to purchase there
  if (!apiKeyForPlatform()) return true; // no RevenueCat key configured yet (local dev) - don't lock the dev out
  try {
    const info: CustomerInfo = await Purchases.getCustomerInfo();
    return isEntitled(info);
  } catch {
    return false;
  }
}

export async function getCurrentOffering(): Promise<PurchasesOffering | null> {
  if (!Purchases) return null;
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current ?? null;
  } catch {
    return null;
  }
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<boolean> {
  if (!Purchases) throw new Error('Purchases are not available on this platform');
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return isEntitled(customerInfo);
}

export async function restorePurchases(): Promise<boolean> {
  if (!Purchases) return false;
  const info: CustomerInfo = await Purchases.restorePurchases();
  return isEntitled(info);
}
