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
  campaignPackageNameKey,
  formatCampaignPeriod,
  type BusinessAdCampaign,
} from '../../services/businessAdCampaignApi';

const STEP_KEYS = ['biz.success.step1', 'biz.success.step2', 'biz.success.step3'] as const;

export default function BusinessCampaignSuccessScreen({
  onBack,
  onViewBilling,
}: {
  onBack: () => void;
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
    <View style={[styles.root, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <LinearGradient colors={['#FAFAFC', '#EDE4FF']} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.iconWrap}>
          <LinearGradient colors={Gradients.primary} style={styles.iconGrad}>
            <Ionicons name="checkmark" size={40} color={Colors.white} />
          </LinearGradient>
        </View>
        <Text style={styles.title}>{t('biz.success.title')}</Text>
        <Text style={styles.sub}>{t('biz.success.sub')}</Text>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={Colors.primary} />
            <Text style={styles.loadingText}>{t('biz.success.loading')}</Text>
          </View>
        ) : null}

        {!loading && latest ? (
          <View style={styles.summary}>
            <Text style={styles.line}>
              {t(campaignPackageNameKey(latest))} · {latest.placeName}
            </Text>
            <Text style={styles.line}>{formatCampaignPeriod(latest.startDate, latest.endDate)}</Text>
            <Text style={styles.amount}>{amount}</Text>
            <Text style={styles.note}>
              {t(isPaid ? 'biz.success.paidNote' : 'biz.success.unpaidNote')}
            </Text>
          </View>
        ) : null}

        {!loading && !latest ? (
          <View style={styles.emptyBox}>
            <Ionicons name="cloud-offline-outline" size={28} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>{t('biz.success.empty')}</Text>
            <Text style={styles.emptyDesc}>{t('biz.success.emptyDesc')}</Text>
            <TouchableOpacity onPress={load} style={styles.retryBtn}>
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
                  color={done ? Colors.activeGreen : Colors.primary}
                />
                <Text style={[styles.checkText, done && styles.checkTextDone]}>{t(key)}</Text>
              </View>
            );
          })}
        </View>

        <TouchableOpacity onPress={onViewBilling} style={styles.secondary} activeOpacity={0.88}>
          <Text style={styles.secondaryText}>{t('biz.success.viewBilling')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onBack} style={styles.primary} activeOpacity={0.88}>
          <LinearGradient colors={Gradients.primary} style={styles.primaryGrad}>
            <Text style={styles.primaryText}>{t('biz.success.backDashboard')}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 24, alignItems: 'center', paddingBottom: 40 },
  iconWrap: { marginBottom: 20, ...Shadows.glow },
  iconGrad: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '900', color: Colors.textDark, textAlign: 'center' },
  sub: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', marginTop: 8, marginBottom: 12, lineHeight: 21 },
  loadingWrap: { alignItems: 'center', gap: 10, marginVertical: 16 },
  loadingText: { fontSize: 12, color: Colors.textMuted },
  summary: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#EEEAF5',
  },
  line: { fontSize: 13, color: Colors.textMid, marginBottom: 4 },
  amount: { fontSize: 22, fontWeight: '900', color: Colors.primary, marginTop: 8 },
  note: { fontSize: 11, color: Colors.textMuted, marginTop: 8, lineHeight: 16 },
  emptyBox: {
    width: '100%',
    alignItems: 'center',
    padding: 20,
    marginTop: 8,
    backgroundColor: Colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EEEAF5',
  },
  emptyTitle: { fontSize: 14, fontWeight: '800', color: Colors.textDark, marginTop: 8 },
  emptyDesc: { fontSize: 12, color: Colors.textMuted, textAlign: 'center', marginTop: 4 },
  retryBtn: { marginTop: 12, paddingHorizontal: 16, paddingVertical: 8 },
  retryText: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  checklist: { width: '100%', marginTop: 20, gap: 12 },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  checkText: { flex: 1, fontSize: 13, color: Colors.textDark, lineHeight: 19 },
  checkTextDone: { color: Colors.textMid },
  secondary: { marginTop: 24, paddingVertical: 12 },
  secondaryText: { color: Colors.primary, fontWeight: '800' },
  primary: { width: '100%', borderRadius: 18, overflow: 'hidden', marginTop: 8 },
  primaryGrad: { paddingVertical: 16, alignItems: 'center' },
  primaryText: { color: Colors.white, fontWeight: '900' },
});
