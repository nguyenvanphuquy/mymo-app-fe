import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BusinessScreenHeader from '../../components/business/BusinessScreenHeader';
import DemoBadge from '../../components/business/DemoBadge';
import BusinessEmptyState from '../../components/business/BusinessEmptyState';
import { Colors, Shadows } from '../../constants/colors';
import { useI18n } from '../../i18n';
import { listBillingOrders, type BillingOrderRecord } from '../../mocks/businessBillingDemo';

function formatVnd(n: number, lang: string) {
  return new Intl.NumberFormat(lang === 'vi' ? 'vi-VN' : 'en-US').format(n) + (lang === 'vi' ? 'đ' : ' VND');
}

function statusLabel(status: BillingOrderRecord['status'], t: (k: string) => string) {
  if (status === 'demo_paid') return t('biz.billing.paid');
  if (status === 'demo_pending') return t('biz.billing.pending');
  return t('biz.billing.unpaid');
}

export default function BusinessBillingScreen({ onBack }: { onBack: () => void }) {
  const { t, lang } = useI18n();
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<BillingOrderRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setOrders(await listBillingOrders());
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <BusinessScreenHeader title={t('biz.billing.title')} onBack={onBack} />
      <View style={styles.demoRow}>
        <DemoBadge />
        <Text style={styles.demoHint}>{t('biz.billing.demoHint')}</Text>
      </View>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
        refreshControl={(
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }}
            tintColor={Colors.primary}
          />
        )}
      >
        {orders.length === 0 ? (
          <BusinessEmptyState
            icon="receipt-outline"
            title={t('biz.billing.empty')}
            description={t('biz.billing.emptyDesc')}
          />
        ) : (
          orders.map(o => (
            <View key={o.id} style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.pkg}>{t(o.packageNameKey)}</Text>
                <Text style={styles.amount}>{formatVnd(o.amountVnd, lang)}</Text>
              </View>
              <Text style={styles.place}>{o.placeName}</Text>
              <Text style={styles.meta}>{o.periodLabel}</Text>
              <View style={styles.statusPill}>
                <Text style={styles.statusText}>{statusLabel(o.status, t)}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAFAFC' },
  demoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20 },
  demoHint: { fontSize: 11, color: Colors.textMuted, flex: 1 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EEEAF5',
    ...Shadows.soft,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  pkg: { fontSize: 15, fontWeight: '900', color: Colors.textDark, flex: 1 },
  amount: { fontSize: 15, fontWeight: '900', color: Colors.primary },
  place: { fontSize: 13, color: Colors.textMid, marginTop: 6 },
  meta: { fontSize: 11, color: Colors.textMuted, marginTop: 4 },
  statusPill: {
    alignSelf: 'flex-start',
    marginTop: 10,
    backgroundColor: Colors.primaryTint,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: { fontSize: 10, fontWeight: '800', color: Colors.primary },
});
