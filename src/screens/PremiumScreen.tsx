import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import { Colors, Gradients, Shadows } from '../constants/colors';
import { useI18n } from '../i18n';
import SparkleField from '../components/SparkleField';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  isPremiumActive,
  setPremiumPlan,
  syncPremiumPlanFromServer,
  type PremiumPlanId,
} from '../utils/premiumStorage';
import { createPremiumOrder, type UserPremiumOrder } from '../services/userPremiumApi';
import UserPremiumBankPaymentScreen from './UserPremiumBankPaymentScreen';
import { fetchPublicProductCatalog, type PublicProductPackage } from '../services/productCatalogApi';

interface PremiumScreenProps {
  onClose: () => void;
  onPlanChanged?: (plan: PremiumPlanId) => void;
}

type PlanConfig = {
  id: string;
  title: string;
  price: number;
  period: string;
  subPrice?: string;
  badgeKey?: string;
  popular?: boolean;
};

const FEATURE_KEYS = [
  'premium.feat.moments',
  'premium.feat.anonymous',
  'premium.feat.themes',
  'premium.feat.feed',
] as const;

function formatVnd(amount: number, lang: string): string {
  if (amount === 0) return lang === 'vi' ? '0đ' : 'Free';
  return new Intl.NumberFormat(lang === 'vi' ? 'vi-VN' : 'en-US').format(amount) + (lang === 'vi' ? 'đ' : ' VND');
}

export default function PremiumScreen({ onClose, onPlanChanged }: PremiumScreenProps) {
  const { t, lang } = useI18n();
  const insets = useSafeAreaInsets();
  const [currentPlan, setCurrentPlan] = useState<PremiumPlanId>('free');
  const [selectedPlan, setSelectedPlan] = useState<string>('yearly');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [payOrder, setPayOrder] = useState<UserPremiumOrder | null>(null);
  const [catalog, setCatalog] = useState<PublicProductPackage[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [plan, packages] = await Promise.all([
          syncPremiumPlanFromServer(),
          fetchPublicProductCatalog().catch(() => [] as PublicProductPackage[]),
        ]);
        setCatalog(packages);
        setCurrentPlan(plan);
        if (plan !== 'free') setSelectedPlan(plan);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const plansToShow = useMemo(() => {
    const free: PlanConfig = {
      id: 'free',
      title: t('premium.plan.free'),
      price: 0,
      period: t('premium.period.free'),
    };
    const b2c = catalog
      .filter(p => p.segment === 'B2C')
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const paid: PlanConfig[] = (b2c.length > 0 ? b2c : [
      { code: 'monthly', displayName: null, priceVnd: 39000, durationDays: 30, segment: 'B2C' as const, billingUnit: null, sortOrder: 1 },
      { code: 'yearly', displayName: null, priceVnd: 399000, durationDays: 365, segment: 'B2C' as const, billingUnit: null, sortOrder: 2 },
    ]).map(pkg => ({
      id: pkg.code,
      title: pkg.displayName?.trim()
        || (pkg.code === 'monthly' ? t('premium.plan.monthly') : pkg.code === 'yearly' ? t('premium.plan.yearly') : pkg.code),
      price: pkg.priceVnd,
      period: pkg.durationDays
        ? t('admin.packagesDurationDays').replace('{n}', String(pkg.durationDays))
        : t('premium.period.month'),
      popular: pkg.code === 'yearly',
      badgeKey: pkg.code === 'yearly' ? 'premium.bestValue' : undefined,
    }));
    return [free, ...paid];
  }, [catalog, t]);

  useEffect(() => {
    if (loading) return;
    if (plansToShow.some(p => p.id === selectedPlan)) return;
    const paid = plansToShow.find(p => p.id !== 'free');
    if (paid) setSelectedPlan(paid.id);
  }, [loading, plansToShow, selectedPlan]);

  const handleSelect = (planId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPlan(planId);
  };

  const handleSubscribe = async () => {
    if (selectedPlan === 'free') {
      setSubmitting(true);
      try {
        await setPremiumPlan('free');
        setCurrentPlan('free');
        onPlanChanged?.('free');
        Toast.show({ type: 'info', text1: t('premium.downgraded') });
        onClose();
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (selectedPlan === currentPlan) {
      Toast.show({ type: 'info', text1: t('premium.alreadyActive') });
      return;
    }

    const token = await AsyncStorage.getItem('mymo.accessToken');
    if (!token) {
      Toast.show({ type: 'error', text1: t('premium.needLogin') });
      return;
    }

    setSubmitting(true);
    try {
      const order = await createPremiumOrder(selectedPlan);
      const selected = plansToShow.find(p => p.id === selectedPlan);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPayOrder({ ...order, planLabel: selected?.title ?? selectedPlan });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: err instanceof Error ? err.message : t('premium.orderError'),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const onPaymentComplete = async (updated: UserPremiumOrder) => {
    await setPremiumPlan(updated.planId);
    setCurrentPlan(updated.planId);
    onPlanChanged?.(updated.planId);
    setPayOrder(null);
    onClose();
  };

  const ctaLabel = selectedPlan === 'free'
    ? t('premium.useFree')
    : selectedPlan === currentPlan
    ? t('premium.currentPlan')
    : (() => {
        const plan = plansToShow.find(p => p.id === selectedPlan);
        return `${plan?.title ?? selectedPlan} — ${formatVnd(plan?.price ?? 0, lang)}`;
      })();

  if (payOrder) {
    return (
      <UserPremiumBankPaymentScreen
        order={payOrder}
        onBack={() => setPayOrder(null)}
        onPaid={onPaymentComplete}
      />
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FFF9FF', '#FFF5FE', '#F3D4F1']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <SparkleField count={14} />

      <View style={[styles.header, { paddingTop: Math.max(12, insets.top) }]}>
        <TouchableOpacity onPress={onClose} style={styles.backBtn} activeOpacity={0.85}>
          <Ionicons name="close" size={20} color={Colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <LinearGradient colors={Gradients.primary} style={styles.logoBadge}>
            <Ionicons name="sparkles" size={16} color={Colors.white} />
          </LinearGradient>
          <Text style={styles.headerTitle}>{t('premium.title')}</Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
      >
        <View style={styles.heroCard}>
          <LinearGradient colors={Gradients.primary} style={styles.heroGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={styles.heroEmoji}>✨</Text>
            <Text style={styles.heroTitle}>{t('premium.heroTitle')}</Text>
            <Text style={styles.heroSub}>{t('premium.heroSub')}</Text>
            {currentPlan !== 'free' && (
              <View style={styles.activePill}>
                <Ionicons name="checkmark-circle" size={14} color={Colors.white} />
                <Text style={styles.activePillText}>
                  {plansToShow.find(p => p.id === currentPlan)?.title ?? t('profile.plusActive')}
                </Text>
              </View>
            )}
          </LinearGradient>
        </View>

        <Text style={styles.sectionLabel}>{t('premium.choosePlan')}</Text>

        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginVertical: 24 }} />
        ) : (
          <View style={styles.planList}>
            {plansToShow.map(plan => {
              const isSelected = selectedPlan === plan.id;
              const isCurrent = currentPlan === plan.id;
              return (
                <TouchableOpacity
                  key={plan.id}
                  activeOpacity={0.9}
                  onPress={() => handleSelect(plan.id)}
                  style={[styles.planCard, isSelected && styles.planCardSelected]}
                >
                  {plan.popular && (
                    <View style={styles.popularBadge}>
                      <LinearGradient colors={Gradients.warm as unknown as [string, string, string]} style={styles.popularGrad}>
                        <Text style={styles.popularText}>{t(plan.badgeKey!)}</Text>
                      </LinearGradient>
                    </View>
                  )}

                  <View style={styles.planTop}>
                    <View style={styles.planRadio}>
                      {isSelected ? (
                        <LinearGradient colors={Gradients.primary} style={styles.planRadioInner}>
                          <Ionicons name="checkmark" size={12} color={Colors.white} />
                        </LinearGradient>
                      ) : (
                        <View style={styles.planRadioEmpty} />
                      )}
                    </View>
                    <View style={styles.planInfo}>
                      <View style={styles.planNameRow}>
                        <Text style={styles.planName}>{plan.title}</Text>
                        {isCurrent && (
                          <View style={styles.currentBadge}>
                            <Text style={styles.currentBadgeText}>{t('premium.current')}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.planPeriod}>{plan.period}</Text>
                    </View>
                    <View style={styles.planPriceCol}>
                      <Text style={[styles.planPrice, plan.id === 'free' && styles.planPriceFree]}>
                        {formatVnd(plan.price, lang)}
                      </Text>
                      {plan.subPrice ? (
                        <Text style={styles.planSubPrice}>{plan.subPrice}</Text>
                      ) : null}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <Text style={styles.sectionLabel}>{t('premium.features')}</Text>
        <Text style={styles.benefitsHint}>
          {isPremiumActive(currentPlan) ? t('premium.benefitsActive') : t('premium.benefitsLocked')}
        </Text>
        <View style={styles.featureCard}>
          {FEATURE_KEYS.map((key, i) => {
            const unlocked = isPremiumActive(currentPlan);
            return (
              <View key={key} style={[styles.featureRow, i < FEATURE_KEYS.length - 1 && styles.featureRowBorder, !unlocked && styles.featureRowLocked]}>
                <LinearGradient colors={unlocked ? Gradients.primary : ['#E5E7EB', '#D1D5DB']} style={styles.featureIcon}>
                  <Ionicons name={unlocked ? 'checkmark' : 'lock-closed'} size={12} color={unlocked ? Colors.white : '#6B7280'} />
                </LinearGradient>
                <Text style={[styles.featureText, !unlocked && styles.featureTextLocked]}>{t(key)}</Text>
              </View>
            );
          })}
        </View>

        <Text style={styles.footnote}>{t('premium.footnote')}</Text>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(16, insets.bottom + 8) }]}>
        <TouchableOpacity
          onPress={handleSubscribe}
          disabled={submitting || (selectedPlan === currentPlan && selectedPlan !== 'free')}
          activeOpacity={0.88}
          style={[styles.ctaWrap, submitting && styles.ctaDisabled]}
        >
          <LinearGradient colors={Gradients.primary} style={styles.ctaGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            {submitting ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <>
                <Ionicons name="sparkles" size={18} color={Colors.white} />
                <Text style={styles.ctaText}>{ctaLabel}</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primaryTint,
    ...Platform.select({
      web: {
        maxWidth: 420,
        width: '100%',
        marginHorizontal: 'auto',
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: '#F2DAF0',
      },
      default: {},
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    zIndex: 2,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.soft,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.textDark,
    letterSpacing: -0.3,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  heroCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    ...Shadows.glow,
  },
  heroGrad: {
    padding: 20,
    alignItems: 'center',
  },
  heroEmoji: {
    fontSize: 32,
    marginBottom: 6,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.white,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  heroSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    maxWidth: 280,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  activePillText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  planList: {
    gap: 8,
    marginBottom: 18,
  },
  planCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    ...Shadows.soft,
  },
  planCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#FDFBFF',
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 14,
    zIndex: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  popularGrad: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  popularText: {
    color: Colors.white,
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  planTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  planRadio: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  planRadioInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  planRadioEmpty: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  planInfo: {
    flex: 1,
  },
  planNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  planName: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textDark,
  },
  currentBadge: {
    backgroundColor: Colors.primaryTint,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  currentBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.primary,
  },
  planPeriod: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  planPriceCol: {
    alignItems: 'flex-end',
  },
  planPrice: {
    fontSize: 15,
    fontWeight: '900',
    color: Colors.primary,
  },
  planPriceFree: {
    color: Colors.textMid,
  },
  planSubPrice: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
  },
  featureCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 4,
    marginBottom: 14,
    ...Shadows.soft,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  featureRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.primaryTint,
  },
  featureRowLocked: { opacity: 0.72 },
  benefitsHint: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: -8,
    marginBottom: 10,
    lineHeight: 17,
  },
  featureIcon: {
    width: 22,
    height: 22,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textDark,
    lineHeight: 18,
  },
  featureTextLocked: { color: Colors.textMuted },
  footnote: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 12,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    ...Shadows.float,
  },
  ctaWrap: {
    borderRadius: 18,
    overflow: 'hidden',
    ...Shadows.glow,
  },
  ctaDisabled: {
    opacity: 0.7,
  },
  ctaGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  ctaText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '800',
  },
});
