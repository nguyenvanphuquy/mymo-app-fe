import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../../constants/colors';
import { useI18n } from '../../i18n';
import type { DailyCheckInPoint, PlaceAnalyticsDto } from '../../services/businessApi';
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

function formatDayLabel(iso: string, lang: string): string {
  const [, month, day] = iso.slice(0, 10).split('-');
  if (!month || !day) return iso.slice(5);
  const d = Number(day);
  const m = Number(month);
  return lang === 'vi' ? `${d}/${m}` : `${m}/${d}`;
}

function campaignSpanDays(start: string, end: string): number {
  const startMs = Date.parse(`${start.slice(0, 10)}T00:00:00Z`);
  const endMs = Date.parse(`${end.slice(0, 10)}T00:00:00Z`);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) return 0;
  return Math.floor((endMs - startMs) / 86_400_000) + 1;
}

function DailyCheckInChart({
  points,
  truncated,
  title,
  emptyText,
  barColor,
}: {
  points: DailyCheckInPoint[];
  truncated: boolean;
  title: string;
  emptyText: string;
  barColor: string;
}) {
  const { t, lang } = useI18n();
  const max = Math.max(1, ...points.map(point => point.count));
  const total = points.reduce((sum, point) => sum + point.count, 0);
  const wide = points.length > 12;
  const labelStep = points.length <= 10 ? 1 : points.length <= 21 ? 2 : 4;
  const columns = points.map((point, index) => {
    const height = Math.max(4, Math.round((point.count / max) * 72));
    const showLabel = index % labelStep === 0 || index === points.length - 1;
    const showCount = point.count > 0 && (points.length <= 16 || point.count === max);
    return (
      <View key={point.date} style={[styles.barCol, wide ? styles.barColWide : styles.barColFlex]}>
        <Text style={styles.barCount}>{showCount ? String(point.count) : ' '}</Text>
        <View style={styles.barTrack}>
          <View
            style={[
              styles.bar,
              {
                height,
                backgroundColor: point.count > 0 ? barColor : '#E7D7EA',
              },
            ]}
          />
        </View>
        <Text style={styles.barLabel} numberOfLines={1}>
          {showLabel ? formatDayLabel(point.date, lang) : ' '}
        </Text>
      </View>
    );
  });
  const row = <View style={[styles.chartRow, !wide && styles.chartRowFill]}>{columns}</View>;

  return (
    <View style={[styles.chartBlock, styles.chartHalf]}>
      <Text style={styles.chartTitle}>{title}</Text>
      {truncated ? <Text style={styles.chartNote}>{t('biz.ads.chartRecent')}</Text> : null}
      {total === 0 ? <Text style={styles.chartEmpty}>{emptyText}</Text> : null}
      {wide ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {row}
        </ScrollView>
      ) : row}
    </View>
  );
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
            <Metric
              label={t('biz.ads.metric.mapViews')}
              value={placeAnalytics.totalMapViews.toLocaleString()}
              icon="eye-outline"
            />
          </View>
          <Text style={styles.sourceNote}>{t('biz.ads.analyticsLive')}</Text>
          {placeAnalytics.dailyCheckIns.length > 0 || placeAnalytics.dailyMapViews.length > 0 ? (
            <View style={styles.chartPair}>
              {placeAnalytics.dailyCheckIns.length > 0 ? (
                <DailyCheckInChart
                  points={placeAnalytics.dailyCheckIns}
                  truncated={campaignSpanDays(campaign.startDate, campaign.endDate) > placeAnalytics.dailyCheckIns.length}
                  title={t('biz.ads.chartTitle')}
                  emptyText={t('biz.ads.chartEmpty')}
                  barColor={Colors.primary}
                />
              ) : null}
              {placeAnalytics.dailyMapViews.length > 0 ? (
                <DailyCheckInChart
                  points={placeAnalytics.dailyMapViews}
                  truncated={campaignSpanDays(campaign.startDate, campaign.endDate) > placeAnalytics.dailyMapViews.length}
                  title={t('biz.ads.chartMapTitle')}
                  emptyText={t('biz.ads.chartMapEmpty')}
                  barColor="#7C5CBF"
                />
              ) : null}
            </View>
          ) : null}
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
    borderColor: '#F2DAF0',
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
  chartPair: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  chartBlock: { marginTop: 14 },
  chartHalf: { flex: 1, minWidth: 0 },
  chartTitle: { fontSize: 12, fontWeight: '800', color: Colors.textDark, marginBottom: 8 },
  chartNote: { fontSize: 10, color: Colors.textMuted, marginBottom: 6 },
  chartEmpty: { fontSize: 11, color: Colors.textMuted, marginBottom: 8 },
  chartRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, minHeight: 108 },
  chartRowFill: { width: '100%' },
  barCol: { alignItems: 'center' },
  barColFlex: { flex: 1, minWidth: 0 },
  barColWide: { width: 28 },
  barCount: { fontSize: 9, fontWeight: '800', color: Colors.textMid, height: 12 },
  barTrack: { height: 76, justifyContent: 'flex-end' },
  bar: { width: 10, borderRadius: 5, alignSelf: 'center' },
  barLabel: { fontSize: 8, fontWeight: '700', color: Colors.textMuted, marginTop: 4, height: 12 },
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
