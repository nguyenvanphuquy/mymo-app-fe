import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DemoBadge from '../../components/business/DemoBadge';
import { Colors, Gradients, Shadows } from '../../constants/colors';
import { useI18n } from '../../i18n';
import { getPackageById } from '../../constants/b2bPromotionPackages';
import { listCampaignHistory, type StoredCampaignRecord } from '../../utils/b2bCampaignStorage';

export default function BusinessCampaignSuccessScreen({
  onBack,
  onViewBilling,
}: {
  onBack: () => void;
  onViewBilling: () => void;
}) {
  const { t, lang } = useI18n();
  const insets = useSafeAreaInsets();
  const [latest, setLatest] = useState<StoredCampaignRecord | null>(null);

  useEffect(() => {
    listCampaignHistory().then(h => setLatest(h[0] ?? null));
  }, []);

  const pkg = latest ? getPackageById(latest.packageId) : null;
  const amount = latest
    ? new Intl.NumberFormat(lang === 'vi' ? 'vi-VN' : 'en-US').format(latest.totalVnd) + (lang === 'vi' ? 'đ' : ' VND')
    : '—';

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
        <DemoBadge />
        {latest && pkg ? (
          <View style={styles.summary}>
            <Text style={styles.line}>{t(pkg.nameKey)} · {latest.placeName}</Text>
            <Text style={styles.line}>{latest.startDate} → {latest.endDate}</Text>
            <Text style={styles.amount}>{amount}</Text>
            <Text style={styles.note}>{t('biz.success.unpaidNote')}</Text>
          </View>
        ) : null}
        <View style={styles.checklist}>
          {(['biz.success.step1', 'biz.success.step2', 'biz.success.step3'] as const).map(key => (
            <View key={key} style={styles.checkRow}>
              <Ionicons name="ellipse-outline" size={18} color={Colors.primary} />
              <Text style={styles.checkText}>{t(key)}</Text>
            </View>
          ))}
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
  summary: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#EEEAF5',
  },
  line: { fontSize: 13, color: Colors.textMid, marginBottom: 4 },
  amount: { fontSize: 22, fontWeight: '900', color: Colors.primary, marginTop: 8 },
  note: { fontSize: 11, color: Colors.textMuted, marginTop: 8, fontStyle: 'italic' },
  checklist: { width: '100%', marginTop: 20, gap: 10 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkText: { flex: 1, fontSize: 13, color: Colors.textDark },
  secondary: { marginTop: 24, paddingVertical: 12 },
  secondaryText: { color: Colors.primary, fontWeight: '800' },
  primary: { width: '100%', borderRadius: 18, overflow: 'hidden', marginTop: 8 },
  primaryGrad: { paddingVertical: 16, alignItems: 'center' },
  primaryText: { color: Colors.white, fontWeight: '900' },
});
