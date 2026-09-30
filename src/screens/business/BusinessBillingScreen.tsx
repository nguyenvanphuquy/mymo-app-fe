import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import BusinessScreenHeader from '../../components/business/BusinessScreenHeader';
import BusinessEmptyState from '../../components/business/BusinessEmptyState';
import { Colors, Shadows } from '../../constants/colors';
import { useI18n } from '../../i18n';
import {
  campaignPackageNameKey,
  completeCampaignPayment,
  formatCampaignPeriod,
  listBillingCampaigns,
  type BusinessAdCampaign,
  type CampaignPaymentStatus,
} from '../../services/businessAdCampaignApi';

function formatVnd(n: number, lang: string) {
  return new Intl.NumberFormat(lang === 'vi' ? 'vi-VN' : 'en-US').format(n) + (lang === 'vi' ? 'đ' : ' VND');
}

function statusLabel(status: CampaignPaymentStatus, t: (k: string) => string) {
  if (status === 'Success') return t('biz.billing.paid');
  if (status === 'Pending') return t('biz.billing.unpaid');
  if (status === 'Failed') return t('biz.billing.failed');
  return t('biz.billing.pending');
}

export default function BusinessBillingScreen({ onBack }: { onBack: () => void }) {
  const { t, lang } = useI18n();
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<BusinessAdCampaign[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setOrders(await listBillingCampaigns());
  }, []);

  useEffect(() => { load().catch(() => setOrders([])); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } catch {
      setOrders([]);
    } finally {
      setRefreshing(false);
    }
  };

  const pay = async (campaign: BusinessAdCampaign) => {
    if (busyId || campaign.paymentStatus === 'Success') return;
    setBusyId(campaign.campaignId);
    try {
      const updated = await completeCampaignPayment(campaign.campaignId);
      setOrders(prev => prev.map(o => (o.campaignId === updated.campaignId ? updated : o)));
      Toast.show({ type: 'success', text1: t('biz.billing.paySuccess') });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: err instanceof Error ? err.message : t('biz.billing.payError'),
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <BusinessScreenHeader title={t('biz.billing.title')} onBack={onBack} />
      <Text style={styles.hint}>{t('biz.billing.hint')}</Text>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
        refreshControl={(
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
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
            <View key={o.campaignId} style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.pkg}>{t(campaignPackageNameKey(o))}</Text>
                <Text style={styles.amount}>{formatVnd(o.amountVnd, lang)}</Text>
              </View>
              <Text style={styles.place}>{o.placeName}</Text>
              <Text style={styles.meta}>{formatCampaignPeriod(o.startDate, o.endDate)}</Text>
              <View style={styles.statusPill}>
                <Text style={styles.statusText}>{statusLabel(o.paymentStatus, t)}</Text>
              </View>
              {o.paymentStatus === 'Pending' ? (
                <TouchableOpacity
                  style={styles.payBtn}
                  onPress={() => pay(o)}
                  disabled={busyId === o.campaignId}
                >
                  {busyId === o.campaignId ? (
                    <ActivityIndicator color={Colors.white} size="small" />
                  ) : (
                    <Text style={styles.payBtnText}>{t('biz.billing.confirmPay')}</Text>
                  )}
                </TouchableOpacity>
              ) : null}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAFAFC' },
  hint: { fontSize: 11, color: Colors.textMuted, paddingHorizontal: 20, marginBottom: 4 },
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
  payBtn: {
    marginTop: 12,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  payBtnText: { color: Colors.white, fontWeight: '800', fontSize: 13 },
});
