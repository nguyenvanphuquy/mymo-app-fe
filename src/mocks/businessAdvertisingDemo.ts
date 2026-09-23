/**
 * UI-only demo metrics for B2B advertising dashboard.
 * NOT backed by production APIs — replace when campaign analytics endpoints exist.
 */
export const DEMO_CAMPAIGN_ANALYTICS_FLAG = 'demo_ui_preview' as const;

export type DemoCampaignStatus = 'draft' | 'scheduled' | 'active' | 'completed';

export interface DemoCampaignSnapshot {
  source: typeof DEMO_CAMPAIGN_ANALYTICS_FLAG;
  status: DemoCampaignStatus;
  views: number;
  saves: number;
  checkIns: number;
  visits: number;
  engagementRate: number;
  startDate: string;
  endDate: string;
  chartPoints: { label: string; value: number }[];
}

export function buildDemoCampaignSnapshot(
  packageId: 'starter_spot' | 'featured_venue' | 'event_boost',
  startDate: string,
  endDate: string,
): DemoCampaignSnapshot {
  const mult =
    packageId === 'featured_venue' ? 1.8 : packageId === 'event_boost' ? 1.25 : 1;
  return {
    source: DEMO_CAMPAIGN_ANALYTICS_FLAG,
    status: 'scheduled',
    views: Math.round(8400 * mult),
    saves: Math.round(620 * mult),
    checkIns: Math.round(210 * mult),
    visits: Math.round(95 * mult),
    engagementRate: Number((4.2 * mult).toFixed(1)),
    startDate,
    endDate,
    chartPoints: [
      { label: 'Mon', value: Math.round(40 * mult) },
      { label: 'Tue', value: Math.round(55 * mult) },
      { label: 'Wed', value: Math.round(48 * mult) },
      { label: 'Thu', value: Math.round(72 * mult) },
      { label: 'Fri', value: Math.round(88 * mult) },
      { label: 'Sat', value: Math.round(95 * mult) },
      { label: 'Sun', value: Math.round(70 * mult) },
    ],
  };
}
