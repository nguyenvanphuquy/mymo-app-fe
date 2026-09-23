import AsyncStorage from '@react-native-async-storage/async-storage';
import type { B2bPackageId } from '../constants/b2bPromotionPackages';

export type BillingStatus = 'demo_unpaid' | 'demo_paid' | 'demo_pending';

export interface BillingOrderRecord {
  id: string;
  packageId: B2bPackageId;
  packageNameKey: string;
  placeName: string;
  amountVnd: number;
  status: BillingStatus;
  createdAt: string;
  periodLabel: string;
}

const KEY = 'mymo.businessBillingOrders';

export async function listBillingOrders(): Promise<BillingOrderRecord[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as BillingOrderRecord[];
  } catch {
    return [];
  }
}

export async function addBillingOrder(order: BillingOrderRecord): Promise<void> {
  const list = await listBillingOrders();
  await AsyncStorage.setItem(KEY, JSON.stringify([order, ...list].slice(0, 30)));
}
