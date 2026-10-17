export function adPackageRank(packageId?: string | null): number {
  if (packageId === 'featured_venue') return 3;
  if (packageId === 'starter_spot' || packageId === 'event_boost') return 2;
  return 0;
}

export function sortPlacesByPromotion<T extends { adPackageId?: string | null; distanceKm?: number }>(places: T[]): T[] {
  return [...places].sort((a, b) => {
    const byPackage = adPackageRank(b.adPackageId) - adPackageRank(a.adPackageId);
    if (byPackage !== 0) return byPackage;
    return (a.distanceKm ?? 0) - (b.distanceKm ?? 0);
  });
}

/** Lower packages are painted first so featured pins stay on top. */
export function placesForMarkerPaint<T extends { adPackageId?: string | null }>(places: T[]): T[] {
  return [...places].sort((a, b) => adPackageRank(a.adPackageId) - adPackageRank(b.adPackageId));
}
