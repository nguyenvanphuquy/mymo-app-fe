import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../../constants/colors';
import { useI18n } from '../../i18n';
import type { AdminDashboardData } from '../../services/adminDashboardApi';

function formatVnd(amount: number, lang: string): string {
  return `${Math.round(amount).toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US')} ₫`;
}

type Props = {
  data: AdminDashboardData;
  onOpenTab?: (tab: 'partners' | 'reports' | 'payments') => void;
};

export default function AdminLiveOverview({ data, onOpenTab }: Props) {
  const { t, lang } = useI18n();
  const { users, queues, payments } = data;

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionTitle}>{t('admin.overviewStats')}</Text>
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{users.total}</Text>
          <Text style={styles.statLabel}>{t('admin.statTotalUsers')}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: Colors.activeGreen }]}>{users.active}</Text>
          <Text style={styles.statLabel}>{t('admin.active')}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#E11D48' }]}>{users.banned}</Text>
          <Text style={styles.statLabel}>{t('admin.banned')}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{users.businessOwners}</Text>
          <Text style={styles.statLabel}>{t('admin.statBusinessOwners')}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>{t('admin.dashboardQueues')}</Text>
      <View style={styles.queueRow}>
        <QueueChip
          label={t('admin.tabPartners')}
          sub={t('admin.dashboardPendingBusiness')}
          count={queues.pendingBusinesses}
          onPress={onOpenTab ? () => onOpenTab('partners') : undefined}
        />
        <QueueChip
          label={t('admin.partnersPlaceBox')}
          sub={t('admin.dashboardPendingPlace')}
          count={queues.pendingPlaces}
          onPress={onOpenTab ? () => onOpenTab('partners') : undefined}
        />
        <QueueChip
          label={t('admin.tabReports')}
          sub={t('admin.reportsFilterPending')}
          count={queues.pendingReports}
          onPress={onOpenTab ? () => onOpenTab('reports') : undefined}
        />
      </View>

      <Text style={styles.sectionTitle}>{t('admin.tabPayments')}</Text>
      <TouchableOpacity
        style={styles.payCard}
        activeOpacity={onOpenTab ? 0.88 : 1}
        onPress={onOpenTab ? () => onOpenTab('payments') : undefined}
      >
        <View style={styles.payCol}>
          <Text style={styles.payLabel}>{t('admin.paymentsStatPending')}</Text>
          <Text style={[styles.payValue, { color: '#D97706' }]}>
            {formatVnd(payments.pendingAmountVnd, lang)}
          </Text>
          <Text style={styles.paySub}>{payments.pendingCount} {t('admin.paymentsStatTxns')}</Text>
        </View>
        <View style={styles.payDivider} />
        <View style={styles.payCol}>
          <Text style={styles.payLabel}>{t('admin.paymentsStatCollected')}</Text>
          <Text style={[styles.payValue, { color: Colors.activeGreen }]}>
            {formatVnd(payments.successAmountVnd, lang)}
          </Text>
          <Text style={styles.paySub}>{payments.successCount} {t('admin.paymentsStatTxns')}</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

function QueueChip({
  label,
  sub,
  count,
  onPress,
}: {
  label: string;
  sub: string;
  count: number;
  onPress?: () => void;
}) {
  const inner = (
    <>
      <Text style={styles.queueCount}>{count}</Text>
      <Text style={styles.queueLabel} numberOfLines={1}>{label}</Text>
      <Text style={styles.queueSub} numberOfLines={1}>{sub}</Text>
    </>
  );
  if (onPress) {
    return (
      <TouchableOpacity style={styles.queueChip} onPress={onPress} activeOpacity={0.85}>
        {inner}
      </TouchableOpacity>
    );
  }
  return <View style={styles.queueChip}>{inner}</View>;
}

const styles = StyleSheet.create({
  wrap: { gap: 10, marginBottom: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: Colors.textDark, marginTop: 4 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    width: '47%' as unknown as number,
    flexGrow: 1,
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.primarySoft,
    ...Shadows.soft,
  },
  statValue: { fontSize: 22, fontWeight: '900', color: Colors.textDark },
  statLabel: { fontSize: 11, fontWeight: '600', color: Colors.textMuted, marginTop: 2 },
  queueRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  queueChip: {
    flex: 1,
    minWidth: 100,
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0E7FF',
    ...Shadows.soft,
  },
  queueCount: { fontSize: 20, fontWeight: '900', color: Colors.primary },
  queueLabel: { fontSize: 12, fontWeight: '800', color: Colors.textDark, marginTop: 2 },
  queueSub: { fontSize: 10, color: Colors.textMuted, marginTop: 2 },
  payCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.primarySoft,
    ...Shadows.soft,
  },
  payCol: { flex: 1 },
  payDivider: { width: 1, backgroundColor: Colors.primarySoft, marginHorizontal: 10 },
  payLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted },
  payValue: { fontSize: 16, fontWeight: '900', marginTop: 4 },
  paySub: { fontSize: 10, color: Colors.textMuted, marginTop: 2 },
});
