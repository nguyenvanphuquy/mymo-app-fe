export type B2bPackageId = 'starter_spot' | 'featured_venue' | 'event_boost';

export type B2bBillingUnit = 'campaign' | 'day';

export type B2bPackageDef = {
  id: B2bPackageId;
  nameKey: string;
  priceVnd: number;
  billingUnit: B2bBillingUnit;
  popular?: boolean;
  featureKeys: readonly string[];
};

export const B2B_VIBEMAP_PACKAGES: B2bPackageDef[] = [
  {
    id: 'starter_spot',
    nameKey: 'biz.ads.pkg.starter',
    priceVnd: 1_500_000,
    billingUnit: 'campaign',
    featureKeys: [
      'biz.ads.feat.starter.pin',
      'biz.ads.feat.starter.promo',
      'biz.ads.feat.starter.visibility',
    ],
  },
  {
    id: 'featured_venue',
    nameKey: 'biz.ads.pkg.featured',
    priceVnd: 3_500_000,
    billingUnit: 'campaign',
    popular: true,
    featureKeys: [
      'biz.ads.feat.featured.placement',
      'biz.ads.feat.featured.priority',
      'biz.ads.feat.featured.analytics',
      'biz.ads.feat.featured.insights',
      'biz.ads.feat.featured.push',
    ],
  },
  {
    id: 'event_boost',
    nameKey: 'biz.ads.pkg.event',
    priceVnd: 500_000,
    billingUnit: 'day',
    featureKeys: [
      'biz.ads.feat.event.highlight',
      'biz.ads.feat.event.card',
      'biz.ads.feat.event.notify',
      'biz.ads.feat.event.analytics',
    ],
  },
];

export function getPackageById(id: B2bPackageId): B2bPackageDef {
  return B2B_VIBEMAP_PACKAGES.find(p => p.id === id) ?? B2B_VIBEMAP_PACKAGES[0];
}

export function computeCampaignTotal(packageId: B2bPackageId, campaignDays: number): number {
  const pkg = getPackageById(packageId);
  const days = Math.max(1, campaignDays);
  if (pkg.billingUnit === 'day') return pkg.priceVnd * days;
  return pkg.priceVnd;
}

export function computeEstimatedReachDemo(packageId: B2bPackageId, campaignDays: number): number {
  const days = Math.max(1, campaignDays);
  const daily =
    packageId === 'featured_venue' ? 4200 : packageId === 'starter_spot' ? 1800 : 2600;
  return Math.round(daily * days * 1.15);
}
