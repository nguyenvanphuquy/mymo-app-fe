import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, Platform, ActivityIndicator, TextInput, TouchableOpacity, ScrollView, Modal, Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Colors, Gradients, Shadows } from '../../constants/colors';
import { useI18n } from '../../i18n';
import B2bPricingSection from '../../components/b2b/B2bPricingSection';
import B2bMapPreview from '../../components/b2b/B2bMapPreview';
import B2bCampaignDashboard from '../../components/b2b/B2bCampaignDashboard';
import {
  computeCampaignTotal,
  getPackageById,
  type B2bPackageId,
} from '../../constants/b2bPromotionPackages';
import { getCampaignDraft, saveCampaignDraft } from '../../utils/b2bCampaignStorage';
import { getPlaceAnalytics, type PlaceAnalyticsDto } from '../../services/businessApi';
import BusinessScreenHeader from '../../components/business/BusinessScreenHeader';
import { getMyPlaces, type BusinessPlaceDto, type BusinessSession } from '../../services/businessApi';
import {
  createAdCampaign,
  deriveCampaignRunStatus,
  formatCampaignPeriod,
  getActiveVibeMapPackage,
  listMyCampaigns,
  resolveDashboardCampaign,
  campaignPackageNameKey,
  campaignNeedsPayment,
  type ActiveVibeMapPackage,
  type BusinessAdCampaign,
} from '../../services/businessAdCampaignApi';

type AdsScreenTab = 'create' | 'track';
type WizardStep = 1 | 2 | 3;

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

const WIZARD_STEP_KEYS = ['biz.ads.wizard.step1', 'biz.ads.wizard.step2', 'biz.ads.wizard.step3'] as const;

function campaignStatusLabel(c: BusinessAdCampaign, t: (k: string) => string): string {
  const run = deriveCampaignRunStatus(c);
  if (run === 'awaiting_payment') return t('biz.ads.status.awaitingPayment');
  return t(`biz.ads.status.${run}`);
}

function DetailLine({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={detailStyles.line}>
      <Text style={detailStyles.label}>{label}</Text>
      <Text style={[detailStyles.value, highlight && detailStyles.valueHighlight]} selectable>{value}</Text>
    </View>
  );
}

const detailStyles = StyleSheet.create({
  line: { marginTop: 8 },
  label: { fontSize: 9, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase' },
  value: { fontSize: 13, fontWeight: '800', color: Colors.textDark, marginTop: 2 },
  valueHighlight: { fontSize: 16, color: Colors.primary },
});

function SegmentTabs({
  tab,
  onChange,
  trackBadge,
}: {
  tab: AdsScreenTab;
  onChange: (t: AdsScreenTab) => void;
  trackBadge?: number;
}) {
  const { t } = useI18n();
  return (
    <View style={segStyles.row}>
      {(['create', 'track'] as const).map(key => {
        const active = tab === key;
        return (
          <TouchableOpacity
            key={key}
            style={[segStyles.chip, active && segStyles.chipOn]}
            onPress={() => onChange(key)}
            activeOpacity={0.88}
          >
            <Text style={[segStyles.chipText, active && segStyles.chipTextOn]}>
              {key === 'create' ? t('biz.ads.tab.create') : t('biz.ads.tab.track')}
            </Text>
            {key === 'track' && trackBadge != null && trackBadge > 0 ? (
              <View style={segStyles.badge}>
                <Text style={segStyles.badgeText}>{trackBadge > 9 ? '9+' : trackBadge}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function WizardProgress({ step }: { step: WizardStep }) {
  const { t } = useI18n();
  return (
    <View style={wizStyles.progress}>
      {WIZARD_STEP_KEYS.map((key, i) => {
        const n = (i + 1) as WizardStep;
        const done = step > n;
        const current = step === n;
        return (
          <React.Fragment key={key}>
            <View style={wizStyles.stepCol}>
              <View style={[wizStyles.dot, done && wizStyles.dotDone, current && wizStyles.dotCurrent]}>
                {done ? (
                  <Ionicons name="checkmark" size={12} color={Colors.white} />
                ) : (
                  <Text style={[wizStyles.dotNum, current && wizStyles.dotNumCurrent]}>{n}</Text>
                )}
              </View>
              <Text style={[wizStyles.stepLabel, current && wizStyles.stepLabelCurrent]} numberOfLines={1}>
                {t(key)}
              </Text>
            </View>
            {i < WIZARD_STEP_KEYS.length - 1 ? (
              <View style={[wizStyles.line, step > n && wizStyles.lineDone]} />
            ) : null}
          </React.Fragment>
        );
      })}
    </View>
  );
}

export default function BusinessAdvertisingScreen({
  session,
  onBack,
  onSuccess,
  onOpenPayment,
}: {
  session: BusinessSession;
  onBack: () => void;
  onSuccess?: (campaign: BusinessAdCampaign) => void;
  onOpenPayment?: (campaign: BusinessAdCampaign) => void;
}) {
  const { t, lang } = useI18n();
  const insets = useSafeAreaInsets();
  const [screenTab, setScreenTab] = useState<AdsScreenTab>('create');
  const [wizardStep, setWizardStep] = useState<WizardStep>(1);
  const [places, setPlaces] = useState<BusinessPlaceDto[]>([]);
  const [placesLoading, setPlacesLoading] = useState(true);
  const [selectedPkg, setSelectedPkg] = useState<B2bPackageId>('featured_venue');
  const [placeId, setPlaceId] = useState('');
  const [startDate, setStartDate] = useState(padDate(new Date()));
  const [endDate, setEndDate] = useState(defaultEndDate());
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<BusinessAdCampaign[]>([]);
  const [dashboardAnalytics, setDashboardAnalytics] = useState<PlaceAnalyticsDto | null>(null);
  const [dashboardAnalyticsLoading, setDashboardAnalyticsLoading] = useState(false);
  const [dashboardAnalyticsError, setDashboardAnalyticsError] = useState(false);
  const [detailCampaign, setDetailCampaign] = useState<BusinessAdCampaign | null>(null);
  const [activePackage, setActivePackage] = useState<ActiveVibeMapPackage | null>(null);
  const [trackRefreshing, setTrackRefreshing] = useState(false);

  const openCampaignFromHistory = (h: BusinessAdCampaign) => {
    setDetailCampaign(h);
  };

  const refreshTrackData = useCallback(async () => {
    setTrackRefreshing(true);
    try {
      const [list, pkg] = await Promise.all([listMyCampaigns(), getActiveVibeMapPackage()]);
      setHistory(list);
      setActivePackage(pkg);
    } catch {
      /* keep previous */
    } finally {
      setTrackRefreshing(false);
    }
  }, []);

  const dashboardCampaign = useMemo(
    () => resolveDashboardCampaign(history, activePackage),
    [history, activePackage],
  );
  const dashboardRunStatus = useMemo(
    () => (dashboardCampaign ? deriveCampaignRunStatus(dashboardCampaign) : null),
    [dashboardCampaign],
  );
  const unpaidCount = useMemo(
    () => history.filter(h => campaignNeedsPayment(h.paymentStatus)).length,
    [history],
  );

  const loadPlaces = useCallback(async () => {
    try {
      setPlacesLoading(true);
      const list = await getMyPlaces();
      setPlaces(list);
      const draft = await getCampaignDraft();
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

  useEffect(() => {
    if (screenTab === 'track') {
      void refreshTrackData();
    }
  }, [screenTab, refreshTrackData]);

  useEffect(() => {
    if (!dashboardCampaign?.placeId) {
      setDashboardAnalytics(null);
      setDashboardAnalyticsError(false);
      return;
    }
    let cancelled = false;
    setDashboardAnalyticsLoading(true);
    setDashboardAnalyticsError(false);
    getPlaceAnalytics(dashboardCampaign.placeId)
      .then(data => {
        if (!cancelled) setDashboardAnalytics(data);
      })
      .catch(() => {
        if (!cancelled) {
          setDashboardAnalytics(null);
          setDashboardAnalyticsError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setDashboardAnalyticsLoading(false);
      });
    return () => { cancelled = true; };
  }, [dashboardCampaign?.placeId, dashboardCampaign?.campaignId]);

  const days = useMemo(() => campaignDays(startDate, endDate), [startDate, endDate]);
  const total = useMemo(() => computeCampaignTotal(selectedPkg, days), [selectedPkg, days]);
  const selectedPlace = places.find(p => p.placeId === placeId);
  const pkgMeta = getPackageById(selectedPkg);

  const goNext = () => {
    if (wizardStep === 1) {
      setWizardStep(2);
      return;
    }
    if (wizardStep === 2) {
      if (!placeId) {
        Toast.show({ type: 'error', text1: t('biz.ads.needVenue') });
        return;
      }
      if (new Date(endDate) < new Date(startDate)) {
        Toast.show({ type: 'error', text1: t('biz.ads.endBeforeStart') });
        return;
      }
      setWizardStep(3);
    }
  };

  const goBackStep = () => {
    if (wizardStep > 1) setWizardStep((wizardStep - 1) as WizardStep);
  };

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
      setHistory(await listMyCampaigns());
      Toast.show({
        type: 'success',
        text1: t('biz.ads.createSuccess'),
        text2: t('biz.ads.createSuccessPayNext'),
      });
      onSuccess?.(created);
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: err instanceof Error ? err.message : t('biz.ads.createError'),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const renderCreateStep = () => {
    if (wizardStep === 1) {
      return (
        <View style={styles.stepBlock}>
          <Text style={styles.stepTitle}>{t('biz.ads.pricingTitle')}</Text>
          <Text style={styles.stepHint}>{t('biz.ads.wizard.step1Hint')}</Text>
          <B2bPricingSection selectedId={selectedPkg} onSelect={setSelectedPkg} horizontal={Platform.OS === 'web'} />
        </View>
      );
    }
    if (wizardStep === 2) {
      return (
        <View style={styles.stepBlock}>
          <Text style={styles.stepTitle}>{t('biz.ads.configTitle')}</Text>
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
          </View>
        </View>
      );
    }
    return (
      <View style={styles.stepBlock}>
        <Text style={styles.stepTitle}>{t('biz.ads.wizard.reviewTitle')}</Text>
        <View style={styles.reviewCard}>
          <Text style={styles.reviewPkg}>{t(pkgMeta.nameKey)}</Text>
          <Text style={styles.reviewLine}>{selectedPlace?.name ?? '—'}</Text>
          <Text style={styles.reviewLine}>{startDate} → {endDate}</Text>
          <Text style={styles.reviewTotal}>{formatVnd(total, lang)}</Text>
        </View>
        <B2bMapPreview venueName={selectedPlace?.name ?? session.displayName} packageId={selectedPkg} />
        <Text style={styles.footerInline}>{t('biz.ads.footer')}</Text>
      </View>
    );
  };

  const renderTrackTab = () => (
    <View style={styles.trackWrap}>
      {trackRefreshing ? (
        <ActivityIndicator color={Colors.primary} style={{ marginVertical: 16 }} />
      ) : null}
      {dashboardCampaign && dashboardRunStatus ? (
        <>
          <Text style={styles.sectionLabel}>{t('biz.ads.dashboardSection')}</Text>
          <Text style={styles.syncNote}>{t('biz.ads.dashboardSyncNote')}</Text>
          <B2bCampaignDashboard
            campaign={dashboardCampaign}
            runStatus={dashboardRunStatus}
            placeAnalytics={dashboardAnalytics}
            loadingAnalytics={dashboardAnalyticsLoading}
            analyticsError={dashboardAnalyticsError}
          />
        </>
      ) : (
        <View style={styles.emptyTrack}>
          <Ionicons name="stats-chart-outline" size={32} color={Colors.textMuted} />
          <Text style={styles.emptyTrackText}>{t('biz.ads.dashboardNoActive')}</Text>
        </View>
      )}
      {history.length > 0 ? (
        <>
          <Text style={[styles.sectionLabel, { marginTop: 20 }]}>{t('biz.ads.historyTitle')}</Text>
          <Text style={styles.historyHint}>{t('biz.ads.historyTapHint')}</Text>
          {history.slice(0, 8).map(h => {
            const unpaid = campaignNeedsPayment(h.paymentStatus);
            return (
              <TouchableOpacity
                key={h.campaignId}
                style={styles.historyRow}
                onPress={() => openCampaignFromHistory(h)}
                activeOpacity={0.85}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyTitle}>{t(campaignPackageNameKey(h))}</Text>
                  <Text style={styles.historyMeta}>{h.placeName} · {h.startDate.slice(0, 10)}</Text>
                </View>
                <View style={styles.historyRight}>
                  <Text style={styles.historyPrice}>{formatVnd(h.amountVnd, lang)}</Text>
                  <Text style={[styles.historyStatus, unpaid && styles.historyStatusUnpaid]}>
                    {unpaid ? t('biz.billing.unpaid') : t('biz.billing.paid')}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} style={styles.historyChevron} />
                </View>
              </TouchableOpacity>
            );
          })}
        </>
      ) : null}
    </View>
  );

  return (
    <View style={styles.root}>
      <View style={{ paddingTop: insets.top }}>
        <BusinessScreenHeader title={t('biz.ads.pageTitle')} onBack={onBack} />
      </View>
      <View style={styles.headerBlock}>
        <SegmentTabs tab={screenTab} onChange={setScreenTab} trackBadge={unpaidCount} />
        {screenTab === 'create' ? (
          <View style={styles.compactHero}>
            <Ionicons name="megaphone-outline" size={18} color={Colors.primary} />
            <Text style={styles.compactHeroText} numberOfLines={2}>{t('biz.ads.heroSub')}</Text>
          </View>
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: screenTab === 'create' ? 120 : 40 }]}
        showsVerticalScrollIndicator={false}
        key={screenTab === 'create' ? `w-${wizardStep}` : 'track'}
      >
        {screenTab === 'create' ? (
          <>
            <WizardProgress step={wizardStep} />
            {renderCreateStep()}
          </>
        ) : (
          renderTrackTab()
        )}
      </ScrollView>

      <Modal visible={detailCampaign != null} transparent animationType="fade" onRequestClose={() => setDetailCampaign(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setDetailCampaign(null)}>
          <Pressable
            style={[styles.modalSheet, { marginBottom: Math.max(insets.bottom, 8) }]}
            onPress={e => e.stopPropagation()}
          >
            {detailCampaign ? (
              <ScrollView showsVerticalScrollIndicator={false} bounces={false} style={styles.modalScroll}>
                <Text style={styles.modalTitle}>{t('biz.ads.detailTitle')}</Text>
                <Text style={styles.modalPkg} numberOfLines={2}>{t(campaignPackageNameKey(detailCampaign))}</Text>
                <DetailLine label={t('biz.ads.selectVenue')} value={detailCampaign.placeName} />
                <DetailLine
                  label={t('biz.ads.duration')}
                  value={formatCampaignPeriod(detailCampaign.startDate, detailCampaign.endDate)}
                />
                <DetailLine label={t('biz.ads.totalPrice')} value={formatVnd(detailCampaign.amountVnd, lang)} highlight />
                <DetailLine label={t('biz.ads.status')} value={campaignStatusLabel(detailCampaign, t)} />
                {detailCampaign.transferReferenceCode ? (
                  <DetailLine label={t('biz.bankPay.transferContent')} value={detailCampaign.transferReferenceCode} />
                ) : null}
                {campaignNeedsPayment(detailCampaign.paymentStatus) ? (
                  <>
                    <Text style={styles.modalUnpaidHint}>{t('biz.ads.detailUnpaidHint')}</Text>
                    {onOpenPayment ? (
                      <TouchableOpacity
                        style={styles.modalPayBtn}
                        onPress={() => {
                          const c = detailCampaign;
                          setDetailCampaign(null);
                          onOpenPayment(c);
                        }}
                        activeOpacity={0.9}
                      >
                        <Text style={styles.modalPayBtnText}>{t('biz.ads.detailPay')}</Text>
                      </TouchableOpacity>
                    ) : null}
                  </>
                ) : null}
                <TouchableOpacity onPress={() => setDetailCampaign(null)} style={styles.modalClose}>
                  <Text style={styles.modalCloseText}>{t('biz.ads.detailClose')}</Text>
                </TouchableOpacity>
              </ScrollView>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      {screenTab === 'create' ? (
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.bottomPrice}>
            <Text style={styles.bottomPriceLabel}>{t('biz.ads.totalPrice')}</Text>
            <Text style={styles.bottomPriceVal}>{formatVnd(total, lang)}</Text>
          </View>
          <View style={styles.bottomActions}>
            {wizardStep > 1 ? (
              <TouchableOpacity style={styles.backStepBtn} onPress={goBackStep} activeOpacity={0.85}>
                <Ionicons name="chevron-back" size={20} color={Colors.primary} />
              </TouchableOpacity>
            ) : (
              <View style={styles.backStepPlaceholder} />
            )}
            {wizardStep < 3 ? (
              <TouchableOpacity style={styles.nextBtn} onPress={goNext} activeOpacity={0.9}>
                <Text style={styles.nextBtnText}>{t('biz.ads.wizard.next')}</Text>
                <Ionicons name="chevron-forward" size={18} color={Colors.white} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.nextBtn, styles.launchBtn, submitting && styles.ctaDisabled]}
                onPress={handlePromote}
                disabled={submitting}
                activeOpacity={0.9}
              >
                {submitting ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <>
                    <Ionicons name="rocket-outline" size={18} color={Colors.white} />
                    <Text style={styles.nextBtnText}>{t('biz.ads.cta')}</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const segStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: '#EEEBF5',
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 11,
    gap: 6,
  },
  chipOn: { backgroundColor: Colors.white, ...Shadows.soft },
  chipText: { fontSize: 13, fontWeight: '800', color: Colors.textMuted },
  chipTextOn: { color: Colors.primary },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { fontSize: 10, fontWeight: '900', color: Colors.white },
});

const wizStyles = StyleSheet.create({
  progress: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  stepCol: { alignItems: 'center', width: 72 },
  dot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#DDD6EE',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  dotCurrent: { borderColor: Colors.primary, backgroundColor: Colors.primaryTint },
  dotDone: { borderColor: Colors.activeGreen, backgroundColor: Colors.activeGreen },
  dotNum: { fontSize: 11, fontWeight: '900', color: Colors.textMuted },
  dotNumCurrent: { color: Colors.primary },
  stepLabel: { fontSize: 9, fontWeight: '700', color: Colors.textMuted, marginTop: 6, textAlign: 'center' },
  stepLabelCurrent: { color: Colors.primary },
  line: { flex: 1, height: 2, backgroundColor: '#E8E4F0', marginTop: 12, marginHorizontal: -4 },
  lineDone: { backgroundColor: Colors.activeGreen },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAFAFC' },
  headerBlock: { paddingHorizontal: 20, paddingBottom: 8, maxWidth: 720, width: '100%', alignSelf: 'center' },
  compactHero: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 12,
    paddingHorizontal: 4,
  },
  compactHeroText: { flex: 1, fontSize: 12, color: Colors.textMuted, lineHeight: 18 },
  scroll: { paddingHorizontal: 20, maxWidth: 720, width: '100%', alignSelf: 'center', paddingTop: 4 },
  stepBlock: { marginBottom: 8 },
  stepTitle: { fontSize: 17, fontWeight: '900', color: Colors.textDark, marginBottom: 6 },
  stepHint: { fontSize: 12, color: Colors.textMuted, marginBottom: 14, lineHeight: 18 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 10,
  },
  configCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#EEEAF5',
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
  reviewCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EEEAF5',
    marginBottom: 16,
    ...Shadows.soft,
  },
  reviewPkg: { fontSize: 16, fontWeight: '900', color: Colors.textDark },
  reviewLine: { fontSize: 13, color: Colors.textMid, marginTop: 6 },
  reviewTotal: { fontSize: 24, fontWeight: '900', color: Colors.primary, marginTop: 12 },
  footerInline: { fontSize: 11, color: Colors.textMuted, textAlign: 'center', marginTop: 16, lineHeight: 16 },
  trackWrap: { paddingBottom: 24 },
  emptyTrack: { alignItems: 'center', padding: 32, gap: 10 },
  emptyTrackText: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', lineHeight: 20, paddingHorizontal: 12 },
  syncNote: { fontSize: 11, color: Colors.textMuted, marginBottom: 10, marginTop: -4, lineHeight: 16 },
  modalUnpaidHint: { fontSize: 11, color: '#B45309', marginTop: 10, lineHeight: 16 },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#EEEAF5',
  },
  historyTitle: { fontSize: 13, fontWeight: '800', color: Colors.textDark },
  historyMeta: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  historyRight: { alignItems: 'flex-end' },
  historyPrice: { fontSize: 13, fontWeight: '900', color: Colors.primary },
  historyHint: { fontSize: 11, color: Colors.textMuted, marginBottom: 10, marginTop: -4 },
  historyStatus: { fontSize: 10, fontWeight: '700', color: Colors.textMuted, marginTop: 4 },
  historyStatusUnpaid: { color: '#B45309' },
  historyChevron: { marginTop: 6 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalSheet: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    maxWidth: 360,
    width: '100%',
    maxHeight: '78%',
    ...Shadows.soft,
  },
  modalScroll: { flexGrow: 0 },
  modalTitle: { fontSize: 10, fontWeight: '800', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  modalPkg: { fontSize: 17, fontWeight: '900', color: Colors.textDark, marginTop: 4, marginBottom: 4 },
  modalPayBtn: {
    marginTop: 12,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
  },
  modalPayBtnText: { color: Colors.white, fontWeight: '900', fontSize: 14 },
  modalClose: { marginTop: 8, paddingVertical: 8, alignItems: 'center' },
  modalCloseText: { fontSize: 13, fontWeight: '700', color: Colors.textMuted },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: '#EEEAF5',
    paddingHorizontal: 20,
    paddingTop: 12,
    maxWidth: 720,
    alignSelf: 'center',
    width: '100%',
    ...Shadows.soft,
  },
  bottomPrice: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 },
  bottomPriceLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase' },
  bottomPriceVal: { fontSize: 20, fontWeight: '900', color: Colors.primary },
  bottomActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backStepBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryTint,
  },
  backStepPlaceholder: { width: 48 },
  nextBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
  },
  launchBtn: { ...Shadows.glow },
  nextBtnText: { color: Colors.white, fontSize: 15, fontWeight: '900' },
  ctaDisabled: { opacity: 0.7 },
});
