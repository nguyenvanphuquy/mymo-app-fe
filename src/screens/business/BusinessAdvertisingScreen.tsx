import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Platform, ActivityIndicator, TextInput, TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Colors, Gradients, Shadows } from '../../constants/colors';
import { useI18n } from '../../i18n';
import B2bPricingSection from '../../components/b2b/B2bPricingSection';
import B2bMapPreview from '../../components/b2b/B2bMapPreview';
import B2bValueFunnel from '../../components/b2b/B2bValueFunnel';
import B2bCampaignDashboard from '../../components/b2b/B2bCampaignDashboard';
import {
  computeCampaignTotal,
  computeEstimatedReachDemo,
  getPackageById,
  type B2bPackageId,
} from '../../constants/b2bPromotionPackages';
import { buildDemoCampaignSnapshot, type DemoCampaignSnapshot } from '../../mocks/businessAdvertisingDemo';
import {
  getCampaignDraft,
  getDemoCampaignSnapshot,
  saveCampaignDraft,
  saveDemoCampaignSnapshot,
} from '../../utils/b2bCampaignStorage';
import BusinessScreenHeader from '../../components/business/BusinessScreenHeader';
import { getMyPlaces, type BusinessPlaceDto, type BusinessSession } from '../../services/businessApi';
import {
  createAdCampaign,
  listMyCampaigns,
  type BusinessAdCampaign,
  campaignPackageNameKey,
} from '../../services/businessAdCampaignApi';

function padDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function defaultEndDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return padDate(d);
}

function campaignDays(startDate: string, endDate: string): number {
  const s = new Date(startDate);
  const e = new Date(endDate);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return 7;
  const diff = Math.ceil((e.getTime() - s.getTime()) / 86400000) + 1;
  return Math.max(1, diff);
}

function formatVnd(amount: number, lang: string): string {
  const n = new Intl.NumberFormat(lang === 'vi' ? 'vi-VN' : 'en-US').format(amount);
  return lang === 'vi' ? `${n}đ` : `${n} VND`;
}

export default function BusinessAdvertisingScreen({
  session,
  onBack,
  onSuccess,
}: {
  session: BusinessSession;
  onBack: () => void;
  onSuccess?: () => void;
}) {
  const { t, lang } = useI18n();
  const insets = useSafeAreaInsets();
  const [places, setPlaces] = useState<BusinessPlaceDto[]>([]);
  const [placesLoading, setPlacesLoading] = useState(true);
  const [selectedPkg, setSelectedPkg] = useState<B2bPackageId>('featured_venue');
  const [placeId, setPlaceId] = useState('');
  const [startDate, setStartDate] = useState(padDate(new Date()));
  const [endDate, setEndDate] = useState(defaultEndDate());
  const [submitting, setSubmitting] = useState(false);
  const [demoSnapshot, setDemoSnapshot] = useState<DemoCampaignSnapshot | null>(null);
  const [history, setHistory] = useState<BusinessAdCampaign[]>([]);

  const loadPlaces = useCallback(async () => {
    try {
      setPlacesLoading(true);
      const list = await getMyPlaces();
      setPlaces(list);
      const draft = await getCampaignDraft();
      const snap = await getDemoCampaignSnapshot();
      if (snap) setDemoSnapshot(snap);
      try {
        setHistory(await listMyCampaigns());
      } catch {
        setHistory([]);
      }
      if (draft) {
        setSelectedPkg(draft.packageId);
        setPlaceId(draft.placeId);
        setStartDate(draft.startDate);
        setEndDate(draft.endDate);
      } else {
        setPlaceId(prev => prev || list[0]?.placeId || '');
      }
    } catch {
      Toast.show({ type: 'error', text1: t('biz.ads.placesLoadError') });
    } finally {
      setPlacesLoading(false);
    }
  }, [t]);

  useEffect(() => { loadPlaces(); }, [loadPlaces]);

  const days = useMemo(() => campaignDays(startDate, endDate), [startDate, endDate]);
  const total = useMemo(() => computeCampaignTotal(selectedPkg, days), [selectedPkg, days]);
  const reach = useMemo(() => computeEstimatedReachDemo(selectedPkg, days), [selectedPkg, days]);
  const selectedPlace = places.find(p => p.placeId === placeId);

  const handlePromote = async () => {
    if (!placeId) {
      Toast.show({ type: 'error', text1: t('biz.ads.needVenue') });
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      Toast.show({ type: 'error', text1: t('biz.ads.endBeforeStart') });
      return;
    }
    setSubmitting(true);
    try {
      await saveCampaignDraft({ packageId: selectedPkg, placeId, startDate, endDate });
      const created = await createAdCampaign({
        placeId,
        packageId: selectedPkg,
        startDate,
        endDate,
      });
      const snap = buildDemoCampaignSnapshot(selectedPkg, startDate, endDate);
      await saveDemoCampaignSnapshot(snap);
      setDemoSnapshot(snap);
      setHistory(await listMyCampaigns());
      Toast.show({
        type: 'success',
        text1: t('biz.ads.createSuccess'),
        text2: t('biz.ads.createSuccessBilling'),
      });
      onSuccess?.();
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: err instanceof Error ? err.message : t('biz.ads.createError'),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={{ paddingTop: insets.top }}>
        <BusinessScreenHeader title={t('biz.ads.pageTitle')} onBack={onBack} />
      </View>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: 8, paddingBottom: 130 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>{t('biz.ads.heroTitle')}</Text>
            <Text style={styles.heroSub}>{t('biz.ads.heroSub')}</Text>
          </View>
          <View style={styles.heroMapIcon}>
            <LinearGradient colors={Gradients.primary} style={styles.heroMapGrad}>
              <Ionicons name="map" size={28} color={Colors.white} />
              <View style={styles.heroPin}>
                <Ionicons name="location" size={12} color={Colors.primary} />
              </View>
            </LinearGradient>
          </View>
        </View>

        <Text style={styles.sectionLabel}>{t('biz.ads.pricingTitle')}</Text>
        <B2bPricingSection selectedId={selectedPkg} onSelect={setSelectedPkg} horizontal={Platform.OS === 'web'} />

        <Text style={styles.sectionLabel}>{t('biz.ads.configTitle')}</Text>
        <View style={styles.configCard}>
          <Text style={styles.fieldLabel}>{t('biz.ads.selectVenue')}</Text>
          {placesLoading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginVertical: 12 }} />
          ) : places.length === 0 ? (
            <Text style={styles.hint}>{t('biz.ads.noVenues')}</Text>
          ) : (
            <View style={styles.placeList}>
              {places.map(p => (
                <TouchableOpacity
                  key={p.placeId}
                  style={[styles.placeChip, placeId === p.placeId && styles.placeChipOn]}
                  onPress={() => setPlaceId(p.placeId)}
                >
                  <Text style={[styles.placeChipText, placeId === p.placeId && styles.placeChipTextOn]}>
                    {p.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.fieldLabel}>{t('biz.ads.duration')}</Text>
          <Text style={styles.durationValue}>
            {days} {t('biz.ads.days')}
          </Text>

          <View style={styles.dateRow}>
            <View style={styles.dateField}>
              <Text style={styles.miniLabel}>{t('biz.ads.startDate')}</Text>
              <TextInput
                style={styles.input}
                value={startDate}
                onChangeText={setStartDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
            <View style={styles.dateField}>
              <Text style={styles.miniLabel}>{t('biz.ads.endDate')}</Text>
              <TextInput
                style={styles.input}
                value={endDate}
                onChangeText={setEndDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
          </View>

          <View style={styles.summaryRow}>
            <View>
              <Text style={styles.summaryLabel}>{t('biz.ads.estimatedReach')}</Text>
              <Text style={styles.reachVal}>~{reach.toLocaleString()}</Text>
              <Text style={styles.reachDemo}>{t('biz.ads.estimatedReachDemo')}</Text>
            </View>
            <View style={styles.totalBox}>
              <Text style={styles.summaryLabel}>{t('biz.ads.totalPrice')}</Text>
              <Text style={styles.totalVal}>{formatVnd(total, lang)}</Text>
            </View>
          </View>
        </View>

        <B2bMapPreview venueName={selectedPlace?.name ?? session.displayName} packageId={selectedPkg} />

        <View style={styles.sectionSpacer} />
        <B2bValueFunnel />

        <TouchableOpacity
          style={[styles.cta, submitting && styles.ctaDisabled]}
          onPress={handlePromote}
          disabled={submitting}
          activeOpacity={0.9}
        >
          <LinearGradient colors={Gradients.primary} style={styles.ctaGrad}>
            {submitting ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <>
                <Ionicons name="rocket-outline" size={20} color={Colors.white} />
                <Text style={styles.ctaText}>{t('biz.ads.cta')}</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {history.length > 0 ? (
          <>
            <Text style={[styles.sectionLabel, { marginTop: 28 }]}>{t('biz.ads.historyTitle')}</Text>
            {history.slice(0, 5).map(h => (
              <View key={h.campaignId} style={styles.historyRow}>
                <Text style={styles.historyTitle}>{t(campaignPackageNameKey(h))}</Text>
                <Text style={styles.historyMeta}>{h.placeName} · {h.startDate.slice(0, 10)}</Text>
                <Text style={styles.historyPrice}>{formatVnd(h.amountVnd, lang)}</Text>
              </View>
            ))}
          </>
        ) : null}

        {demoSnapshot ? (
          <>
            <Text style={[styles.sectionLabel, { marginTop: 28 }]}>{t('biz.ads.dashboardSection')}</Text>
            <Text style={styles.analyticsHint}>{t('biz.ads.analyticsPreview')}</Text>
            <B2bCampaignDashboard snapshot={demoSnapshot} />
          </>
        ) : null}

        <Text style={styles.footer}>{t('biz.ads.footer')}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAFAFC' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  topTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '900', color: Colors.textDark },
  scroll: { paddingHorizontal: 20, maxWidth: 720, width: '100%', alignSelf: 'center' },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#EEEAF5',
    ...Shadows.soft,
  },
  heroText: { flex: 1 },
  heroTitle: { fontSize: 26, fontWeight: '900', color: Colors.textDark, letterSpacing: -0.5 },
  heroSub: { fontSize: 14, color: Colors.textMuted, marginTop: 8, lineHeight: 21 },
  heroMapIcon: { width: 72, height: 72 },
  heroMapGrad: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.glow,
  },
  heroPin: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 12,
    marginTop: 8,
  },
  configCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#EEEAF5',
    marginBottom: 20,
    ...Shadows.soft,
  },
  fieldLabel: { fontSize: 12, fontWeight: '800', color: Colors.textDark, marginBottom: 8, marginTop: 4 },
  hint: { fontSize: 13, color: Colors.textMuted, marginBottom: 8 },
  placeList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  placeChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F5F3FA',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  placeChipOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryTint },
  placeChipText: { fontSize: 13, fontWeight: '700', color: Colors.textMid },
  placeChipTextOn: { color: Colors.primary },
  durationValue: { fontSize: 15, fontWeight: '800', color: Colors.textDark, marginBottom: 12 },
  dateRow: { flexDirection: 'row', gap: 10 },
  dateField: { flex: 1 },
  miniLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, marginBottom: 6 },
  input: {
    backgroundColor: '#F8F7FB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'web' ? 10 : 12,
    fontSize: 14,
    color: Colors.textDark,
    borderWidth: 1,
    borderColor: '#EBE8F5',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0EEF5',
    gap: 12,
  },
  summaryLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase' },
  reachVal: { fontSize: 20, fontWeight: '900', color: Colors.textDark, marginTop: 4 },
  reachDemo: { fontSize: 10, color: Colors.textMuted, marginTop: 2, fontStyle: 'italic' },
  totalBox: { alignItems: 'flex-end' },
  totalVal: { fontSize: 22, fontWeight: '900', color: Colors.primary, marginTop: 4 },
  sectionSpacer: { height: 20 },
  cta: { borderRadius: 18, overflow: 'hidden', marginTop: 24, ...Shadows.glow },
  ctaDisabled: { opacity: 0.7 },
  ctaGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  ctaText: { color: Colors.white, fontSize: 16, fontWeight: '900' },
  historyRow: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#EEEAF5',
  },
  historyTitle: { fontSize: 14, fontWeight: '800', color: Colors.textDark },
  historyMeta: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
  historyPrice: { fontSize: 13, fontWeight: '800', color: Colors.primary, marginTop: 6 },
  analyticsHint: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  footer: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 16,
    paddingHorizontal: 8,
  },
});
