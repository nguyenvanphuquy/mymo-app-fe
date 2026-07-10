import AsyncStorage from '@react-native-async-storage/async-storage';

const SHARING_KEY = 'mymo.locationSharing';
const INCOGNITO_KEY = 'mymo.incognito';

export interface LocationPrivacyPrefs {
  locationSharing: boolean;
  incognito: boolean;
}

export async function getLocationPrivacyPrefs(): Promise<LocationPrivacyPrefs | null> {
  try {
    const [sharing, incognito] = await AsyncStorage.multiGet([SHARING_KEY, INCOGNITO_KEY]);
    if (sharing[1] == null && incognito[1] == null) return null;

    return {
      locationSharing: sharing[1] !== '0',
      incognito: incognito[1] === '1',
    };
  } catch {
    return null;
  }
}

export async function saveLocationPrivacyPrefs(prefs: LocationPrivacyPrefs): Promise<void> {
  await AsyncStorage.multiSet([
    [SHARING_KEY, prefs.locationSharing ? '1' : '0'],
    [INCOGNITO_KEY, prefs.incognito ? '1' : '0'],
  ]);
}

export async function clearLocationPrivacyPrefs(): Promise<void> {
  await AsyncStorage.multiRemove([SHARING_KEY, INCOGNITO_KEY]);
}
