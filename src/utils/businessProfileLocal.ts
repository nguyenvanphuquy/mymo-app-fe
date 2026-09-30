import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIFY_KEY = 'mymo.businessNotifyPrefs';
/** @deprecated legacy key from local-only profile demo */
const LEGACY_KEY = 'mymo.businessProfileLocal';

export interface BusinessNotifyPrefs {
  notifyCampaign: boolean;
  notifyReviews: boolean;
  notifyPlaceStatus: boolean;
}

const DEFAULT: BusinessNotifyPrefs = {
  notifyCampaign: true,
  notifyReviews: true,
  notifyPlaceStatus: true,
};

export async function getBusinessNotifyPrefs(): Promise<BusinessNotifyPrefs> {
  const raw = await AsyncStorage.getItem(NOTIFY_KEY);
  if (raw) {
    try {
      return { ...DEFAULT, ...JSON.parse(raw) };
    } catch {
      return { ...DEFAULT };
    }
  }

  const legacy = await AsyncStorage.getItem(LEGACY_KEY);
  if (legacy) {
    try {
      const parsed = JSON.parse(legacy) as Partial<BusinessNotifyPrefs>;
      const prefs: BusinessNotifyPrefs = {
        notifyCampaign: parsed.notifyCampaign ?? DEFAULT.notifyCampaign,
        notifyReviews: parsed.notifyReviews ?? DEFAULT.notifyReviews,
        notifyPlaceStatus: parsed.notifyPlaceStatus ?? DEFAULT.notifyPlaceStatus,
      };
      await AsyncStorage.setItem(NOTIFY_KEY, JSON.stringify(prefs));
      return prefs;
    } catch {
      return { ...DEFAULT };
    }
  }

  return { ...DEFAULT };
}

export async function saveBusinessNotifyPrefs(prefs: BusinessNotifyPrefs): Promise<void> {
  await AsyncStorage.setItem(NOTIFY_KEY, JSON.stringify(prefs));
}
