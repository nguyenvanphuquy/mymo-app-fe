import AsyncStorage from '@react-native-async-storage/async-storage';
import type { B2bPackageId } from '../constants/b2bPromotionPackages';
import type { DemoCampaignSnapshot } from '../mocks/businessAdvertisingDemo';

const PKG_KEY = 'mymo.b2bVibemapPackage';
const DRAFT_KEY = 'mymo.b2bCampaignDraft';
const DEMO_SNAPSHOT_KEY = 'mymo.b2bCampaignDemoSnapshot';

export interface B2bCampaignDraft {
  packageId: B2bPackageId;
  placeId: string;
  startDate: string;
  endDate: string;
}

export async function getB2bPackage(): Promise<B2bPackageId | null> {
  const raw = await AsyncStorage.getItem(PKG_KEY);
  if (raw === 'starter_spot' || raw === 'featured_venue' || raw === 'event_boost') return raw;
  return null;
}

export async function setB2bPackage(id: B2bPackageId): Promise<void> {
  await AsyncStorage.setItem(PKG_KEY, id);
}

export async function getCampaignDraft(): Promise<B2bCampaignDraft | null> {
  const raw = await AsyncStorage.getItem(DRAFT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as B2bCampaignDraft;
  } catch {
    return null;
  }
}

export async function saveCampaignDraft(draft: B2bCampaignDraft): Promise<void> {
  await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export async function getDemoCampaignSnapshot(): Promise<DemoCampaignSnapshot | null> {
  const raw = await AsyncStorage.getItem(DEMO_SNAPSHOT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DemoCampaignSnapshot;
  } catch {
    return null;
  }
}

export async function saveDemoCampaignSnapshot(snapshot: DemoCampaignSnapshot): Promise<void> {
  await AsyncStorage.setItem(DEMO_SNAPSHOT_KEY, JSON.stringify(snapshot));
}

export interface StoredCampaignRecord {
  id: string;
  packageId: B2bPackageId;
  placeId: string;
  placeName: string;
  startDate: string;
  endDate: string;
  totalVnd: number;
  createdAt: string;
}

const HISTORY_KEY = 'mymo.b2bCampaignHistory';

export async function listCampaignHistory(): Promise<StoredCampaignRecord[]> {
  const raw = await AsyncStorage.getItem(HISTORY_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as StoredCampaignRecord[];
  } catch {
    return [];
  }
}

export async function appendCampaignHistory(record: StoredCampaignRecord): Promise<void> {
  const list = await listCampaignHistory();
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify([record, ...list].slice(0, 20)));
}
