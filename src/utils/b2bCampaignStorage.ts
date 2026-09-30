import AsyncStorage from '@react-native-async-storage/async-storage';
import type { B2bPackageId } from '../constants/b2bPromotionPackages';
import type { DemoCampaignSnapshot } from '../mocks/businessAdvertisingDemo';

const DRAFT_KEY = 'mymo.b2bCampaignDraft';
const DEMO_SNAPSHOT_KEY = 'mymo.b2bCampaignDemoSnapshot';

export interface B2bCampaignDraft {
  packageId: B2bPackageId;
  placeId: string;
  startDate: string;
  endDate: string;
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
