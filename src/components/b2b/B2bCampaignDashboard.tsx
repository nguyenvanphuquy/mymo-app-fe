import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../../constants/colors';
import { useI18n } from '../../i18n';
import type { PlaceAnalyticsDto } from '../../services/businessApi';
import type { BusinessAdCampaign, CampaignRunStatus } from '../../services/businessAdCampaignApi';
import { campaignPackageNameKey, formatCampaignPeriod } from '../../services/businessAdCampaignApi';

function Metric({ label, value, icon }: { label: string; value: string; icon: React.ComponentProps<typeof Ionicons>['name'] }) {
  return (
    <View style={styles.metric}>
      <Ionicons name={icon} size={15} color={Colors.primary} />
      <Text style={styles.metricVal}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function statusI18nKey(runStatus: CampaignRunStatus): string {
  if (runStatus === 'awaiting_payment') return 'biz.ads.status.awaitingPayment';
  return `biz.ads.status.${runStatus}`;
}

export default function B2bCampaignDashboard({
  campaign,
  runStatus,
  placeAnalytics,
  loadingAnalytics,
  analyticsError,
}: {
  campaign: BusinessAdCampaign;
  runStatus: CampaignRunStatus;
  placeAnalytics: PlaceAnalyticsDto | null;
  loadingAnalytics?: boolean;
  analyticsError?: boolean;
}) {
  const { t } = useI18n();
  const period = formatCampaignPeriod(campaign.startDate, campaign.endDate);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{t('biz.ads.dashboardTitle')}</Text>
      <Text style={styles.pkgLine}>
        {t(campaignPackageNameKey(campaign))} · {campaign.placeName}
      </Text>
      <Text style={styles.meta}>
        {t('biz.ads.status')}: {t(statusI18nKey(runStatus))} · {period}
      </Text>

      {loadingAnalytics ? (
        <ActivityIndicator color={Colors.primary} style={{ marginVertical: 20 }} />
      ) : analyticsError ? (
        <Text style={styles.errorNote}>{t('biz.ads.analyticsUnavailable')}</Text>
      ) : placeAnalytics ? (
        <>
          <View style={styles.grid}>
            <Metric
              label={t('biz.ads.metric.checkins')}
              value={placeAnalytics.totalCheckIns.toLocaleString()}
              icon="footsteps-outline"
            />
            <Metric
              label={t('biz.ads.metric.todayCheckins')}
              value={placeAnalytics.todayCheckIns.toLocaleString()}
              icon="today-outline"
            />
            <Metric
              label={t('biz.ads.metric.weekCheckins')}
              value={placeAnalytics.weeklyCheckIns.toLocaleString()}
              icon="calendar-outline"
            />
            <Metric
              label={t('biz.ads.metric.monthCheckins')}
              value={placeAnalytics.monthlyCheckIns.toLocaleString()}
              icon="stats-chart-outline"
            />
          </View>
          <Text style={styles.sourceNote}>{t('biz.ads.analyticsLive')}</Text>
          <Text style={styles.comingSoon}>{t('biz.ads.chartComingSoon')}</Text>
        </>
      ) : null}

      {runStatus === 'awaiting_payment' ? (
        <View style={styles.payHint}>
          <Ionicons name="card-outline" size={16} color="#92400E" />
          <Text style={styles.payHintText}>{t('biz.ads.dashboardPayHint')}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EEEAF5',
    ...Shadows.soft,
  },
  title: { fontSize: 14, fontWeight: '900', color: Colors.textDark },
  pkgLine: { fontSize: 12, fontWeight: '700', color: Colors.textMid, marginTop: 4 },
  meta: { fontSize: 11, color: Colors.textMuted, marginTop: 4, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metric: {
    width: '47%',
    backgroundColor: Colors.primaryTint,
    borderRadius: 10,
    padding: 8,
    gap: 2,
  },
  metricVal: { fontSize: 15, fontWeight: '900', color: Colors.textDark },
  metricLabel: { fontSize: 9, fontWeight: '700', color: Colors.textMuted },
  sourceNote: { fontSize: 10, color: Colors.textMuted, marginTop: 10, lineHeight: 14 },
  comingSoon: { fontSize: 9, color: Colors.textMuted, marginTop: 6, fontStyle: 'italic' },
  errorNote: { fontSize: 13, color: '#B45309', marginVertical: 12 },
  payHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 14,
    padding: 12,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
  },
  payHintText: { flex: 1, fontSize: 12, fontWeight: '700', color: '#92400E', lineHeight: 18 },
});
