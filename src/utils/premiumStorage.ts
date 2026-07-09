import AsyncStorage from '@react-native-async-storage/async-storage';

export type PremiumPlanId = 'free' | 'monthly' | 'yearly';

const STORAGE_KEY = 'mymo.premiumPlan';

export async function getPremiumPlan(): Promise<PremiumPlanId> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (raw === 'monthly' || raw === 'yearly') return raw;
  return 'free';
}

export async function setPremiumPlan(plan: PremiumPlanId): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, plan);
}

export function isPremiumActive(plan: PremiumPlanId): boolean {
  return plan === 'monthly' || plan === 'yearly';
}
