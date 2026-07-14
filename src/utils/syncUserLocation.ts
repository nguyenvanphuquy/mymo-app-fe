import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { updateUserLocation } from '../services/userApi';
import { ensureLocationForPosting, requestLocationAccess } from './ensureLocation';

/** Push current device coordinates to the server (after sharing is re-enabled). */
export async function syncCurrentLocationToServer(): Promise<boolean> {
  try {
    // Prefer the shared helper (works on web via navigator.geolocation)
    const loc = await ensureLocationForPosting();
    if (loc.ok) {
      await updateUserLocation(loc.coords.latitude, loc.coords.longitude);
      return true;
    }

    // Native fallback if helper only got permission earlier
    if (Platform.OS !== 'web') {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') return false;
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      await updateUserLocation(position.coords.latitude, position.coords.longitude);
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/** Soft enable: permission first, then best-effort GPS sync. */
export async function enableSharingAndSync(): Promise<{
  enabled: boolean;
  reason?: 'denied' | 'unavailable' | 'timeout' | 'error';
}> {
  const access = await requestLocationAccess();
  if (!access.ok) {
    return { enabled: false, reason: access.reason };
  }

  if (access.coords) {
    try {
      await updateUserLocation(access.coords.latitude, access.coords.longitude);
    } catch {
      // CORS / API — local sharing still on
    }
    return { enabled: true };
  }

  // Fire-and-forget sync
  void syncCurrentLocationToServer();
  return { enabled: true };
}
