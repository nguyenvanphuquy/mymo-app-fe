import { Platform } from 'react-native';
import * as Location from 'expo-location';

export type Coords = { latitude: number; longitude: number };

export type LocationEnsureResult =
  | { ok: true; coords: Coords }
  | { ok: false; reason: 'denied' | 'unavailable' | 'timeout' | 'error'; message?: string };

export type LocationAccessResult =
  | { ok: true; coords?: Coords }
  | { ok: false; reason: 'denied' | 'unavailable' | 'timeout' | 'error'; message?: string };

function webGetCurrentPosition(timeoutMs = 12000): Promise<Coords> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(Object.assign(new Error('Geolocation unavailable'), { reason: 'unavailable' as const }));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      (err) => {
        const code = err?.code;
        if (code === 1) reject(Object.assign(new Error('denied'), { reason: 'denied' as const }));
        else if (code === 3) reject(Object.assign(new Error('timeout'), { reason: 'timeout' as const }));
        else reject(Object.assign(new Error(err?.message || 'error'), { reason: 'error' as const }));
      },
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 60000 },
    );
  });
}

export async function webPermissionState(): Promise<'granted' | 'denied' | 'prompt' | 'unknown'> {
  try {
    if (typeof navigator === 'undefined' || !navigator.permissions?.query) return 'unknown';
    const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
    if (result.state === 'granted' || result.state === 'denied' || result.state === 'prompt') {
      return result.state;
    }
  } catch {
    // Safari / older browsers
  }
  return 'unknown';
}

/** Watch browser geolocation permission flips (e.g. user changes site settings). */
export function watchWebGeolocationPermission(
  onChange: (state: 'granted' | 'denied' | 'prompt') => void,
): () => void {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined' || !navigator.permissions?.query) {
    return () => {};
  }
  let status: PermissionStatus | null = null;
  let cancelled = false;

  void navigator.permissions.query({ name: 'geolocation' as PermissionName }).then((result) => {
    if (cancelled) return;
    status = result;
    const emit = () => {
      if (result.state === 'granted' || result.state === 'denied' || result.state === 'prompt') {
        onChange(result.state);
      }
    };
    result.addEventListener?.('change', emit);
    // Older Chromium
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (result as any).onchange = emit;
  });

  return () => {
    cancelled = true;
    if (status) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (status as any).onchange = null;
    }
  };
}

/**
 * Ask for location access to turn sharing ON.
 * Does NOT require a successful GPS fix — permission (or a coords read) is enough.
 */
export async function requestLocationAccess(): Promise<LocationAccessResult> {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.isSecureContext === false) {
        return {
          ok: false,
          reason: 'unavailable',
          message: 'Location requires HTTPS or localhost',
        };
      }

      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        return { ok: false, reason: 'unavailable' };
      }

      const permBefore = await webPermissionState();

      try {
        await Location.requestForegroundPermissionsAsync();
      } catch {
        // expo-location on web is optional
      }

      // Always attempt a read — this is what shows the browser prompt when state is "prompt".
      // If already denied in site settings, it fails instantly with code 1 (no re-prompt).
      try {
        const coords = await webGetCurrentPosition(10000);
        return { ok: true, coords };
      } catch (err) {
        const reason = (err as { reason?: string })?.reason;
        const permAfter = await webPermissionState();

        // Permission granted (or was granted) but GPS slow / Windows location off
        if (permBefore === 'granted' || permAfter === 'granted') {
          if (reason !== 'denied') return { ok: true };
        }

        if (reason === 'timeout' || reason === 'error' || reason === 'unavailable') {
          if (permAfter === 'granted' || permAfter === 'prompt') {
            // User may have allowed; fix just didn't arrive — still enable sharing
            if (permAfter === 'granted') return { ok: true };
          }
        }

        if (reason === 'denied' || permAfter === 'denied' || permBefore === 'denied') {
          return { ok: false, reason: 'denied' };
        }
        if (reason === 'timeout') return { ok: false, reason: 'timeout' };
        return {
          ok: false,
          reason: 'unavailable',
          message: err instanceof Error ? err.message : undefined,
        };
      }
    }

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return { ok: false, reason: 'denied' };
    }

    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      return {
        ok: true,
        coords: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        },
      };
    } catch {
      // Permission granted — sharing can turn on; coords sync later
      return { ok: true };
    }
  } catch (err) {
    return {
      ok: false,
      reason: 'error',
      message: err instanceof Error ? err.message : undefined,
    };
  }
}

/** Request permission + coordinates (needed when posting a moment). */
export async function ensureLocationForPosting(): Promise<LocationEnsureResult> {
  const access = await requestLocationAccess();
  if (!access.ok) {
    return { ok: false, reason: access.reason, message: access.message };
  }
  if (access.coords) {
    return { ok: true, coords: access.coords };
  }

  // Permission ok but no coords yet — try harder for posting
  try {
    if (Platform.OS === 'web') {
      const coords = await webGetCurrentPosition(15000);
      return { ok: true, coords };
    }
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      ok: true,
      coords: {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      },
    };
  } catch (err) {
    const reason = (err as { reason?: string })?.reason;
    if (reason === 'denied') return { ok: false, reason: 'denied' };
    if (reason === 'timeout') return { ok: false, reason: 'timeout' };
    return {
      ok: false,
      reason: 'unavailable',
      message: err instanceof Error ? err.message : undefined,
    };
  }
}

/** Permission-only check used by sheets (Allow button). */
export async function requestLocationPermission(): Promise<boolean> {
  const result = await requestLocationAccess();
  return result.ok;
}
