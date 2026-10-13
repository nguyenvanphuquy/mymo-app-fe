import AsyncStorage from '@react-native-async-storage/async-storage';
import { getPremiumStatus } from '../services/userPremiumApi';

export type PremiumPlanId = string;

const STORAGE_KEY = 'mymo.premiumPlan';

export async function getPremiumPlan(): Promise<PremiumPlanId> {
  const raw = (await AsyncStorage.getItem(STORAGE_KEY))?.trim();
  return raw && raw.length > 0 ? raw : 'free';
}

export async function setPremiumPlan(plan: PremiumPlanId): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, plan);
}

export function isPremiumActive(plan: PremiumPlanId): boolean {
  return plan.trim().length > 0 && plan !== 'free';
}

export async function hasActivePremium(): Promise<boolean> {
  const plan = await syncPremiumPlanFromServer();
  return isPremiumActive(plan);
}

/** Khi đã đăng nhập: đồng bộ gói MYMO+ từ server (sau thanh toán SePay). */
export async function syncPremiumPlanFromServer(): Promise<PremiumPlanId> {
  const token = await AsyncStorage.getItem('mymo.accessToken');
  if (!token) return getPremiumPlan();
  try {
    const status = await getPremiumStatus();
    await setPremiumPlan(status.activePlanId);
    return status.activePlanId;
  } catch {
    return getPremiumPlan();
  }
}
