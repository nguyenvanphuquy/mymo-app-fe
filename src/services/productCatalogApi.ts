import { API_URL } from '../config/apiConfig';
import type { B2bPackageId } from '../constants/b2bPromotionPackages';
import { computeCampaignTotal } from '../constants/b2bPromotionPackages';

export type ProductPackageSegment = 'B2C' | 'B2B';

export type PublicProductPackage = {
  segment: ProductPackageSegment;
  code: string;
  displayName: string | null;
  priceVnd: number;
  durationDays: number | null;
  billingUnit: 'campaign' | 'day' | null;
  sortOrder: number;
};

let cachedPackages: PublicProductPackage[] | null = null;

export function invalidateProductCatalogCache(): void {
  cachedPackages = null;
}

function normalizePackage(raw: Record<string, unknown>): PublicProductPackage {
  const unitRaw = raw.billingUnit ?? raw.BillingUnit;
  const unit = unitRaw != null ? String(unitRaw) : null;
  return {
    segment: String(raw.segment ?? raw.Segment ?? 'B2C') as ProductPackageSegment,
    code: String(raw.code ?? raw.Code ?? ''),
    displayName: (raw.displayName ?? raw.DisplayName ?? null) as string | null,
    priceVnd: Number(raw.priceVnd ?? raw.PriceVnd ?? 0),
    durationDays: raw.durationDays != null || raw.DurationDays != null
      ? Number(raw.durationDays ?? raw.DurationDays)
      : null,
    billingUnit: unit === 'day' ? 'day' : unit === 'campaign' ? 'campaign' : null,
    sortOrder: Number(raw.sortOrder ?? raw.SortOrder ?? 0),
  };
}

export async function fetchPublicProductCatalog(force = false): Promise<PublicProductPackage[]> {
  if (cachedPackages && !force) return cachedPackages;
  const response = await fetch(`${API_URL}/catalog/product-packages`, {
    method: 'GET',
    headers: { Accept: '*/*' },
  });
  const rawText = await response.text();
  const data = rawText ? JSON.parse(rawText) : {};
  if (!response.ok) throw new Error(data.message ?? 'Failed to load product catalog');
  const list = (data.data ?? []) as Record<string, unknown>[];
  cachedPackages = list.map(normalizePackage);
  return cachedPackages;
}

export function computeB2bTotalFromCatalog(
  catalog: PublicProductPackage[],
  packageId: B2bPackageId,
  campaignDays: number,
): number {
  const pkg = catalog.find(p => p.segment === 'B2B' && p.code === packageId);
  if (!pkg) return computeCampaignTotal(packageId, campaignDays);
  const days = Math.max(1, campaignDays);
  if (pkg.billingUnit === 'day') return pkg.priceVnd * days;
  return pkg.priceVnd;
}

export function getB2bBasePriceFromCatalog(
  catalog: PublicProductPackage[],
  packageId: B2bPackageId,
): number | null {
  const pkg = catalog.find(p => p.segment === 'B2B' && p.code === packageId);
  return pkg ? pkg.priceVnd : null;
}

export function getB2cPlanFromCatalog(
  catalog: PublicProductPackage[],
  planId: 'monthly' | 'yearly',
): PublicProductPackage | null {
  return catalog.find(p => p.segment === 'B2C' && p.code === planId) ?? null;
}
