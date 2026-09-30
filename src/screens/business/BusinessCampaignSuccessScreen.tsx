import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Gradients, Shadows } from '../../constants/colors';
import { useI18n } from '../../i18n';
import {
  listMyCampaigns,
  campaignNeedsPayment,
  campaignPackageNameKey,
  formatCampaignPeriod,
  type BusinessAdCampaign,
} from '../../services/businessAdCampaignApi';

const STEP_KEYS = ['biz.success.step1', 'biz.success.step2', 'biz.success.step3'] as const;

export default function BusinessCampaignSuccessScreen({
  onBack,
  onPayNow,
  onViewBilling,
}: {
  onBack: () => void;
  onPayNow: (campaign: BusinessAdCampaign) => void;
  onViewBilling: () => void;
}) {
  const { t, lang } = useI18n();
  const insets = useSafeAreaInsets();
  const [latest, setLatest] = useState<BusinessAdCampaign | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listMyCampaigns();
      setLatest(list[0] ?? null);
    } catch {
      setLatest(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const isPaid = latest?.paymentStatus === 'Success';
  const needsPay = latest ? campaignNeedsPayment(latest.paymentStatus) : false;
  const amount = latest
    ? new Intl.NumberFormat(lang === 'vi' ? 'vi-VN' : 'en-US').format(latest.amountVnd)
      + (lang === 'vi' ? 'đ' : ' VND')
    : '—';

  const stepDone = (index: number) => {
    if (index === 0) return Boolean(latest);
    if (index === 1) return isPaid;
    return isPaid;
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}>
      <LinearGradient colors={['#FAFAFC', '#EDE4FF']} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={[styles.iconWrap, isPaid && styles.iconWrapPaid]}>
            <LinearGradient colors={isPaid ? ['#22C55E', '#16A34A'] : Gradients.primary} style={styles.iconGrad}>
              <Ionicons name={isPaid ? 'checkmark' : 'wallet-outline'} size={36} color={Colors.white} />
            </LinearGradient>
          </View>
          <Text style={styles.title}>
            {t(isPaid ? 'biz.success.titlePaid' : 'biz.success.titleUnpaid')}
          </Text>
          <Text style={styles.sub}>{t(isPaid ? 'biz.success.subPaid' : 'biz.success.subUnpaid')}</Text>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={Colors.primary} />
          </View>
        ) : null}

        {!loading && latest ? (
          <View style={styles.summary}>
            <Text style={styles.pkg}>{t(campaignPackageNameKey(latest))}</Text>
            <Text style={styles.place}>{latest.placeName}</Text>
            <Text style={styles.period}>{formatCampaignPeriod(latest.startDate, latest.endDate)}</Text>
            <Text style={styles.amount}>{amount}</Text>
            {needsPay && latest.transferReferenceCode ? (
              <View style={styles.refRow}>
                <Text style={styles.refLabel}>{t('biz.bankPay.transferContent')}</Text>
                <Text style={styles.refCode} selectable>{latest.transferReferenceCode}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {!loading && !latest ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>{t('biz.success.empty')}</Text>
            <TouchableOpacity onPress={load}>
              <Text style={styles.retryText}>{t('common.retry')}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.checklist}>
          {STEP_KEYS.map((key, index) => {
            const done = stepDone(index);
            return (
              <View key={key} style={styles.checkRow}>
                <Ionicons
                  name={done ? 'checkmark-circle' : 'ellipse-outline'}
                  size={20}
                  color={done ? Colors.activeGreen : Colors.textMuted}
                />
                <Text style={[styles.checkText, done && styles.checkTextDone]}>{t(key)}</Text>
              </View>
            );
          })}
        </View>

        {needsPay && latest ? (
          <TouchableOpacity
            onPress={() => onPayNow(latest)}
            style={styles.primary}
            activeOpacity={0.88}
          >
            <LinearGradient colors={Gradients.primary} style={styles.primaryGrad}>
              <Ionicons name="qr-code-outline" size={20} color={Colors.white} />
              <Text style={styles.primaryText}>{t('biz.success.payNow')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity onPress={onBack} style={styles.ghostBtn} activeOpacity={0.88}>
          <Text style={styles.ghostText}>
            {t(isPaid ? 'biz.success.backDashboard' : 'biz.success.payLater')}
          </Text>
        </TouchableOpacity>

        {needsPay ? (
          <TouchableOpacity onPress={onViewBilling} style={styles.linkBtn}>
            <Text style={styles.linkText}>{t('biz.success.viewBilling')}</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  hero: { alignItems: 'center', marginBottom: 20 },
  iconWrap: { marginBottom: 16, ...Shadows.glow },
  iconWrapPaid: { ...Shadows.soft },
  iconGrad: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '900', color: Colors.textDark, textAlign: 'center' },
  sub: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', marginTop: 8, lineHeight: 21, paddingHorizontal: 8 },
  loadingWrap: { paddingVertical: 24 },
  summary: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#EEEAF5',
    ...Shadows.soft,
  },
  pkg: { fontSize: 16, fontWeight: '900', color: Colors.textDark },
  place: { fontSize: 13, color: Colors.textMid, marginTop: 4 },
  period: { fontSize: 12, color: Colors.textMuted, marginTop: 6 },
  amount: { fontSize: 26, fontWeight: '900', color: Colors.primary, marginTop: 12 },
  refRow: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F0EEF5',
  },
  refLabel: { fontSize: 10, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase' },
  refCode: { fontSize: 15, fontWeight: '900', color: Colors.textDark, marginTop: 4, letterSpacing: 0.5 },
  emptyBox: { alignItems: 'center', padding: 20 },
  emptyTitle: { fontSize: 14, fontWeight: '800', color: Colors.textDark },
  retryText: { marginTop: 12, fontSize: 13, fontWeight: '700', color: Colors.primary },
  checklist: { marginTop: 24, gap: 14 },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  checkText: { flex: 1, fontSize: 13, color: Colors.textDark, lineHeight: 19 },
  checkTextDone: { color: Colors.textMid },
  primary: { width: '100%', borderRadius: 18, overflow: 'hidden', marginTop: 28 },
  primaryGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  primaryText: { color: Colors.white, fontWeight: '900', fontSize: 16 },
  ghostBtn: { marginTop: 14, paddingVertical: 12, alignItems: 'center' },
  ghostText: { fontSize: 14, fontWeight: '700', color: Colors.textMid },
  linkBtn: { marginTop: 4, paddingVertical: 8, alignItems: 'center' },
  linkText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
});
