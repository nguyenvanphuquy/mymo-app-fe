import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'mymo.businessProfileLocal';

export interface LocalBusinessProfile {
  displayName: string;
  description: string;
  phone: string;
  website: string;
  logoUri: string | null;
  notifyCampaign: boolean;
  notifyReviews: boolean;
  notifyPlaceStatus: boolean;
}

const DEFAULT: LocalBusinessProfile = {
  displayName: '',
  description: '',
  phone: '',
  website: '',
  logoUri: null,
  notifyCampaign: true,
  notifyReviews: true,
  notifyPlaceStatus: true,
};

export async function getLocalBusinessProfile(): Promise<LocalBusinessProfile> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return { ...DEFAULT };
  try {
    return { ...DEFAULT, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT };
  }
}

export async function saveLocalBusinessProfile(profile: LocalBusinessProfile): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(profile));
}
