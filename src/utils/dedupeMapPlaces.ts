import { adPackageRank } from './mapPlacePromotion';

interface MapPlaceLike {
  placeId: string;
  name: string;
  latitude: number;
  longitude: number;
  model3DUrl?: string | null;
  vibes: string[];
  isOwnedByCurrentUser?: boolean;
  adPackageId?: string | null;
}

const SAME_PLACE_THRESHOLD = 0.00012;

/**
 * Collapse duplicate venue records at the same map point. Prefer the record
 * carrying a 3D model, then merge ownership and at most three unique vibes.
 */
export function dedupeMapPlaces<T extends MapPlaceLike>(places: T[]): T[] {
  const result: T[] = [];

  for (const place of places) {
    const duplicateIndex = result.findIndex(existing => (
      existing.name.trim().toLowerCase() === place.name.trim().toLowerCase()
      && Math.abs(existing.latitude - place.latitude) < SAME_PLACE_THRESHOLD
      && Math.abs(existing.longitude - place.longitude) < SAME_PLACE_THRESHOLD
    ));

    if (duplicateIndex < 0) {
      result.push(place);
      continue;
    }

    const existing = result[duplicateIndex];
    const preferred = place.model3DUrl && !existing.model3DUrl ? place : existing;
    const other = preferred === place ? existing : place;

    const preferredPackage = adPackageRank(place.adPackageId) >= adPackageRank(existing.adPackageId)
      ? place.adPackageId
      : existing.adPackageId;

    result[duplicateIndex] = {
      ...other,
      ...preferred,
      adPackageId: preferredPackage ?? null,
      isOwnedByCurrentUser: Boolean(
        existing.isOwnedByCurrentUser || place.isOwnedByCurrentUser,
      ),
      vibes: [...new Set([...preferred.vibes, ...other.vibes])].slice(0, 3),
    };
  }

  return result;
}
