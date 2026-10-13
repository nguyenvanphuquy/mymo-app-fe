import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Gradients, Shadows } from '../../constants/colors';
import { useI18n } from '../../i18n';
import type { AdminPaymentItem, AdminPaymentStatus } from '../../services/adminBillingApi';

function formatVnd(amount: number, lang: string): string {
  return `${Math.round(amount).toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US')} ₫`;
}

function dayKey(iso: string): string | null {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  } catch {
    return null;
  }
}

function shortDayLabel(isoDate: string, lang: string): string {
  const d = new Date(`${isoDate}T12:00:00`);
  return d.toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', { weekday: 'short', day: '2-digit' });
}

export type PaymentAnalytics = {
  totalCount: number;
  pendingCount: number;
  pendingAmount: number;
  successCount: number;
  successAmount: number;
  premiumCount: number;
  campaignCount: number;
  successPremiumAmount: number;
  successCampaignAmount: number;
  byStatus: Record<AdminPaymentStatus, number>;
  last7Days: { key: string; label: string; count: number; successAmount: number }[];
};

export function computePaymentAnalytics(payments: AdminPaymentItem[], lang: string): PaymentAnalytics {
  const byStatus: Record<AdminPaymentStatus, number> = {
    Pending: 0,
    Success: 0,
    Failed: 0,
    Refunded: 0,
  };

  let pendingAmount = 0;
  let successAmount = 0;
  let successPremiumAmount = 0;
  let successCampaignAmount = 0;
  let premiumCount = 0;
  let campaignCount = 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayBuckets = new Map<string, { count: number; successAmount: number }>();
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dayBuckets.set(key, { count: 0, successAmount: 0 });
  }

  for (const p of payments) {
    byStatus[p.paymentStatus] += 1;
    if (p.kind === 'premium') premiumCount += 1;
    else campaignCount += 1;

    if (p.paymentStatus === 'Pending') pendingAmount += p.amountVnd;
    if (p.paymentStatus === 'Success') {
      successAmount += p.amountVnd;
      if (p.kind === 'premium') successPremiumAmount += p.amountVnd;
      else successCampaignAmount += p.amountVnd;
    }

    const key = dayKey(p.createdAt);
    if (key && dayBuckets.has(key)) {
      const b = dayBuckets.get(key)!;
      b.count += 1;
      if (p.paymentStatus === 'Success') b.successAmount += p.amountVnd;
    }
  }

  const last7Days = [...dayBuckets.entries()].map(([key, v]) => ({
    key,
    label: shortDayLabel(key, lang),
    count: v.count,
    successAmount: v.successAmount,
  }));

  return {
    totalCount: payments.length,
    pendingCount: byStatus.Pending,
    pendingAmount,
    successCount: byStatus.Success,
    successAmount,
    premiumCount,
    campaignCount,
    successPremiumAmount,
    successCampaignAmount,
    byStatus,
    last7Days,
  };
}

function StatTile({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <View style={[styles.statTile, accent ? { borderColor: accent } : null]}>
      <Text style={styles.statTileLabel} numberOfLines={2}>{label}</Text>
      <Text style={[styles.statTileValue, accent ? { color: accent } : null]}>{value}</Text>
      {sub ? <Text style={styles.statTileSub} numberOfLines={1}>{sub}</Text> : null}
    </View>
  );
}

function HorizontalBars({
  items,
}: {
  items: { label: string; value: number; color: string; suffix?: string }[];
}) {
  const max = Math.max(...items.map(i => i.value), 1);
  return (
    <View style={styles.barBlock}>
      {items.map(item => (
        <View key={item.label} style={styles.barRow}>
          <Text style={styles.barLabel} numberOfLines={1}>{item.label}</Text>
          <View style={styles.barTrack}>
            <View
              style={[
                styles.barFill,
                {
                  width: `${Math.max(item.value > 0 ? 8 : 0, (item.value / max) * 100)}%`,
                  backgroundColor: item.color,
                },
              ]}
            />
          </View>
          <Text style={styles.barValue} numberOfLines={1}>
            {item.suffix ?? String(item.value)}
          </Text>
        </View>
      ))}
    </View>
  );
}

function WeekChart({ days, lang }: { days: PaymentAnalytics['last7Days']; lang: string }) {
  const max = Math.max(...days.map(d => d.successAmount), 1);
  return (
    <View>
      <View style={styles.weekChartRow}>
        {days.map(d => {
          const h = d.successAmount > 0 ? Math.max(6, (d.successAmount / max) * 72) : 4;
          return (
            <View key={d.key} style={styles.weekCol}>
              <Text style={styles.weekAmount} numberOfLines={1}>
                {d.successAmount > 0 ? formatVnd(d.successAmount, lang).replace(' ₫', '') : '—'}
              </Text>
              <LinearGradient
                colors={d.successAmount > 0 ? Gradients.primary : (['#E5E7EB', '#E5E7EB'] as [string, string])}
                style={[styles.weekBar, { height: h }]}
              />
              <Text style={styles.weekLabel}>{d.label}</Text>
              <Text style={styles.weekCount}>{d.count}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function AdminPaymentAnalytics({ payments }: { payments: AdminPaymentItem[] }) {
  const { t, lang } = useI18n();
  const stats = useMemo(() => computePaymentAnalytics(payments, lang), [payments, lang]);

  const statusBars = [
    { label: t('admin.paymentsStatusPending'), value: stats.byStatus.Pending, color: '#F59E0B' },
    { label: t('admin.paymentsStatusSuccess'), value: stats.byStatus.Success, color: Colors.activeGreen },
    { label: t('admin.paymentsStatusFailed'), value: stats.byStatus.Failed, color: '#EF4444' },
    { label: t('admin.paymentsStatusRefunded'), value: stats.byStatus.Refunded, color: '#94A3B8' },
  ];

  const kindBars = [
    {
      label: t('admin.paymentsKindPremium'),
      value: stats.premiumCount,
      color: '#D97706',
      suffix: '',
    },
    {
      label: t('admin.paymentsKindCampaign'),
      value: stats.campaignCount,
      color: Colors.primary,
      suffix: '',
    },
  ];

  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        <Ionicons name="analytics-outline" size={20} color={Colors.primary} />
        <Text style={styles.title}>{t('admin.paymentsAnalyticsTitle')}</Text>
      </View>

      <View style={styles.statGrid}>
        <StatTile
          label={t('admin.paymentsStatCollected')}
          value={formatVnd(stats.successAmount, lang)}
          sub={`${stats.successCount} ${t('admin.paymentsStatTxns')}`}
          accent={Colors.activeGreen}
        />
        <StatTile
          label={t('admin.paymentsStatPending')}
          value={formatVnd(stats.pendingAmount, lang)}
          sub={`${stats.pendingCount} ${t('admin.paymentsStatTxns')}`}
          accent="#F59E0B"
        />
        <StatTile
          label={t('admin.paymentsStatTotal')}
          value={String(stats.totalCount)}
          sub={t('admin.paymentsStatAllTxns')}
        />
        <StatTile
          label={t('admin.paymentsStatB2cB2b')}
          value={`${stats.premiumCount} / ${stats.campaignCount}`}
          sub={t('admin.paymentsStatB2cB2bHint')}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('admin.paymentsChartStatus')}</Text>
        <HorizontalBars items={statusBars} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('admin.paymentsChartRevenueKind')}</Text>
        <HorizontalBars
          items={[
            {
              label: t('admin.paymentsKindPremium'),
              value: stats.successPremiumAmount,
              color: '#D97706',
              suffix: ` · ${formatVnd(stats.successPremiumAmount, lang)}`,
            },
            {
              label: t('admin.paymentsKindCampaign'),
              value: stats.successCampaignAmount,
              color: Colors.primary,
              suffix: ` · ${formatVnd(stats.successCampaignAmount, lang)}`,
            },
          ]}
        />
        <Text style={styles.cardFoot}>{t('admin.paymentsChartRevenueKindHint')}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('admin.paymentsChartWeek')}</Text>
        <Text style={styles.cardSub}>{t('admin.paymentsChartWeekHint')}</Text>
        <WeekChart days={stats.last7Days} lang={lang} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('admin.paymentsChartVolumeKind')}</Text>
        <HorizontalBars items={kindBars} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16, gap: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  title: { fontSize: 15, fontWeight: '800', color: Colors.textDark },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statTile: {
    width: '47%' as unknown as number,
    flexGrow: 1,
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.primarySoft,
    ...Shadows.soft,
  },
  statTileLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, marginBottom: 4 },
  statTileValue: { fontSize: 17, fontWeight: '900', color: Colors.textDark },
  statTileSub: { fontSize: 10, color: Colors.textMuted, marginTop: 2 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.primarySoft,
    ...Shadows.soft,
  },
  cardTitle: { fontSize: 13, fontWeight: '800', color: Colors.textDark, marginBottom: 10 },
  cardSub: { fontSize: 11, color: Colors.textMuted, marginTop: -6, marginBottom: 10 },
  cardFoot: { fontSize: 10, color: Colors.textMuted, marginTop: 8 },
  barBlock: { gap: 8 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel: { width: 72, fontSize: 11, fontWeight: '600', color: Colors.textMid },
  barTrack: {
    flex: 1,
    height: 10,
    backgroundColor: Colors.primaryTint,
    borderRadius: 6,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 6 },
  barValue: { flex: 0, minWidth: 88, maxWidth: 120, fontSize: 9, fontWeight: '800', color: Colors.textDark, textAlign: 'right' },
  weekChartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 4,
    minHeight: 110,
    paddingTop: 8,
  },
  weekCol: { flex: 1, alignItems: 'center', minWidth: 0 },
  weekAmount: { fontSize: 8, fontWeight: '700', color: Colors.textMuted, marginBottom: 4, maxWidth: '100%' },
  weekBar: { width: '85%', borderRadius: 6, minHeight: 4 },
  weekLabel: { fontSize: 9, fontWeight: '700', color: Colors.textMid, marginTop: 6, textAlign: 'center' },
  weekCount: { fontSize: 8, color: Colors.textMuted, marginTop: 2 },
});
