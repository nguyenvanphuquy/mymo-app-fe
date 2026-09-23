import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../../constants/colors';
import { useI18n } from '../../i18n';
import type { DemoCampaignSnapshot } from '../../mocks/businessAdvertisingDemo';
import { DEMO_CAMPAIGN_ANALYTICS_FLAG } from '../../mocks/businessAdvertisingDemo';

function Metric({ label, value, icon }: { label: string; value: string; icon: React.ComponentProps<typeof Ionicons>['name'] }) {
  return (
    <View style={styles.metric}>
      <Ionicons name={icon} size={18} color={Colors.primary} />
      <Text style={styles.metricVal}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

export default function B2bCampaignDashboard({ snapshot }: { snapshot: DemoCampaignSnapshot }) {
  const { t } = useI18n();
  const max = Math.max(...snapshot.chartPoints.map(p => p.value), 1);

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.title}>{t('biz.ads.dashboardTitle')}</Text>
        <View style={styles.demoPill}>
          <Ionicons name="flask-outline" size={12} color="#92400E" />
          <Text style={styles.demoPillText}>{t('biz.ads.demoBadge')}</Text>
        </View>
      </View>
      <Text style={styles.meta}>
        {t('biz.ads.status')}: {t(`biz.ads.status.${snapshot.status}`)} · {snapshot.startDate} → {snapshot.endDate}
      </Text>

      <View style={styles.grid}>
        <Metric label={t('biz.ads.metric.views')} value={snapshot.views.toLocaleString()} icon="eye-outline" />
        <Metric label={t('biz.ads.metric.saves')} value={snapshot.saves.toLocaleString()} icon="bookmark-outline" />
        <Metric label={t('biz.ads.metric.checkins')} value={snapshot.checkIns.toLocaleString()} icon="footsteps-outline" />
        <Metric label={t('biz.ads.metric.engagement')} value={`${snapshot.engagementRate}%`} icon="pulse-outline" />
      </View>

      <Text style={styles.chartTitle}>{t('biz.ads.chartTitle')}</Text>
      <View style={styles.chart}>
        {snapshot.chartPoints.map(p => (
          <View key={p.label} style={styles.barCol}>
            <View style={[styles.bar, { height: Math.max(8, (p.value / max) * 80) }]} />
            <Text style={styles.barLabel}>{p.label}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.sourceNote}>
        {t('biz.ads.demoSource').replace('{flag}', DEMO_CAMPAIGN_ANALYTICS_FLAG)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#EEEAF5',
    ...Shadows.soft,
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  title: { fontSize: 17, fontWeight: '900', color: Colors.textDark },
  demoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  demoPillText: { fontSize: 10, fontWeight: '800', color: '#92400E' },
  meta: { fontSize: 12, color: Colors.textMuted, marginTop: 8, marginBottom: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metric: {
    width: '47%',
    backgroundColor: Colors.primaryTint,
    borderRadius: 14,
    padding: 12,
    gap: 4,
  },
  metricVal: { fontSize: 18, fontWeight: '900', color: Colors.textDark },
  metricLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted },
  chartTitle: { fontSize: 13, fontWeight: '800', color: Colors.textDark, marginTop: 18, marginBottom: 10 },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 100,
    gap: 6,
    paddingHorizontal: 4,
  },
  barCol: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  bar: {
    width: '100%',
    minHeight: 8,
    backgroundColor: Colors.primary,
    borderRadius: 6,
    opacity: 0.85,
  },
  barLabel: { fontSize: 9, fontWeight: '700', color: Colors.textMuted, marginTop: 6 },
  sourceNote: { fontSize: 10, color: Colors.textMuted, marginTop: 12, fontStyle: 'italic' },
});
