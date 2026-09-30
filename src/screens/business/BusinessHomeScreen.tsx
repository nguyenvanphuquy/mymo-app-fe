import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Platform, ActivityIndicator, TouchableOpacity, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Gradients, Shadows } from '../../constants/colors';
import { useI18n } from '../../i18n';
import MymoLogo from '../../components/MymoLogo';
import SparkleField from '../../components/SparkleField';
import {
  getMyBusinesses,
  getMyPlaces,
  getPlaceAnalytics,
  type BusinessSession,
} from '../../services/businessApi';
import { getActiveVibeMapPackage } from '../../services/businessAdCampaignApi';
import { B2B_VIBEMAP_PACKAGES } from '../../constants/b2bPromotionPackages';

export default function BusinessHomeScreen({
  session,
  onOpenAdvertising,
  onOpenNotifications,
  onGoPlaces,
  onGoEvents,
}: {
  session: BusinessSession;
  onOpenAdvertising: () => void;
  onOpenNotifications: () => void;
  onGoPlaces: () => void;
  onGoEvents: () => void;
}) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [businessName, setBusinessName] = useState('');
  const [placeCount, setPlaceCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [approvedCount, setApprovedCount] = useState(0);
  const [totalCheckIns, setTotalCheckIns] = useState(0);
  const [todayCheckIns, setTodayCheckIns] = useState(0);
  const [activePkgKey, setActivePkgKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const active = await getActiveVibeMapPackage();
      if (active.packageId) {
        const pkg = B2B_VIBEMAP_PACKAGES.find(p => p.id === active.packageId);
        setActivePkgKey(pkg?.nameKey ?? null);
      } else {
        setActivePkgKey(null);
      }

      const businesses = await getMyBusinesses();
      setBusinessName(businesses[0]?.name ?? session.displayName);

      const places = await getMyPlaces();
      setPlaceCount(places.length);
      setPendingCount(places.filter(p => p.status === 'Pending').length);
      setApprovedCount(places.filter(p => p.status === 'Approved').length);

      let total = 0;
      let today = 0;
      for (const place of places) {
        try {
          const analytics = await getPlaceAnalytics(place.placeId);
          total += analytics.totalCheckIns;
          today += analytics.todayCheckIns;
        } catch {
          // skip
        }
      }
      setTotalCheckIns(total);
      setTodayCheckIns(today);
    } catch {
      setBusinessName(session.displayName);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session.displayName]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    void load(true);
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#FAFAFC', '#F5F3FA']} style={StyleSheet.absoluteFill} />
      <SparkleField count={Platform.OS === 'web' ? 4 : 6} />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12, paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        <View style={styles.header}>
          <MymoLogo width={96} />
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={onOpenNotifications} style={styles.notifBtn}>
              <Ionicons name="notifications-outline" size={22} color={Colors.primary} />
            </TouchableOpacity>
            <View style={styles.badge}>
              <Ionicons name="storefront" size={12} color={Colors.activeGreen} />
              <Text style={styles.badgeText}>{t('biz.badge')}</Text>
            </View>
          </View>
        </View>
        <Text style={styles.greeting}>{t('biz.home.greeting').replace('{name}', session.displayName)}</Text>
        <Text style={styles.sub}>{businessName || t('biz.home.sub')}</Text>

        <TouchableOpacity style={styles.promoCard} onPress={onOpenAdvertising} activeOpacity={0.92}>
          <LinearGradient colors={Gradients.primary} style={styles.promoGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={styles.promoIcon}>
              <Ionicons name="megaphone" size={22} color={Colors.white} />
            </View>
            <View style={styles.promoText}>
              <Text style={styles.promoTitle}>{t('biz.home.adsCardTitle')}</Text>
              <Text style={styles.promoSub}>{t('biz.home.adsCardSub')}</Text>
              {activePkgKey ? (
                <Text style={styles.promoPkg}>{t('biz.ads.activePackage')}: {t(activePkgKey)}</Text>
              ) : null}
            </View>
            <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.9)" />
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.shortcuts}>
          <Shortcut icon="location-outline" label={t('biz.nav.places')} onPress={onGoPlaces} />
          <Shortcut icon="calendar-outline" label={t('biz.nav.events')} onPress={onGoEvents} />
          <Shortcut icon="megaphone-outline" label={t('biz.profile.actionAds')} onPress={onOpenAdvertising} />
        </View>

        {!loading && placeCount === 0 ? (
          <TouchableOpacity style={styles.todoCard} onPress={onGoPlaces}>
            <Ionicons name="alert-circle-outline" size={20} color="#92400E" />
            <Text style={styles.todoText}>{t('biz.home.todoPlace')}</Text>
          </TouchableOpacity>
        ) : null}

        <Text style={styles.section}>{t('biz.home.dashboardStats')}</Text>
        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginVertical: 20 }} />
        ) : (
          <>
            <View style={styles.stats}>
              <Stat n={String(placeCount)} l={t('biz.nav.places')} />
              <Stat n={String(totalCheckIns)} l={t('biz.home.checkins')} />
              <Stat n={String(approvedCount)} l={t('biz.b2b.approvedPlaces')} />
            </View>
            <View style={styles.stats}>
              <Stat n={String(todayCheckIns)} l={t('biz.b2b.today')} />
              <Stat n={String(pendingCount)} l={t('biz.home.pendingPlaces')} />
              <Stat n="—" l={t('biz.home.moments')} />
            </View>
            {pendingCount > 0 && (
              <View style={styles.pendingCard}>
                <Text style={styles.pendingText}>
                  {t('biz.b2b.pendingPlaces').replace('{n}', String(pendingCount))}
                </Text>
              </View>
            )}
          </>
        )}

        <Text style={styles.section}>{t('biz.home.recent')}</Text>
        <View style={styles.empty}>
          <Ionicons name="sparkles-outline" size={28} color={Colors.primary} />
          <Text style={styles.emptyTitle}>{t('biz.home.emptyRecent')}</Text>
          <Text style={styles.emptyDesc}>{t('biz.home.emptyRecentDesc')}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Shortcut({
  icon, label, onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.shortcut} onPress={onPress} activeOpacity={0.88}>
      <Ionicons name={icon} size={20} color={Colors.primary} />
      <Text style={styles.shortcutLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function Stat({ n, l }: { n: string; l: string }) {
  return (
    <View style={styles.stat}>
      <View style={styles.statBox}>
        <Text style={styles.statN}>{n}</Text>
      </View>
      <Text style={styles.statL}>{l}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAFAFC' },
  scroll: { paddingHorizontal: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  notifBtn: {
    width: 40, height: 40, borderRadius: 14, backgroundColor: Colors.white,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#EEEAF5',
  },
  shortcuts: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  shortcut: {
    flex: 1, backgroundColor: Colors.white, borderRadius: 16, paddingVertical: 14, alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: '#EEEAF5', ...Shadows.soft,
  },
  shortcutLabel: { fontSize: 10, fontWeight: '800', color: Colors.textMid },
  todoCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FEF3C7',
    padding: 14, borderRadius: 14, marginBottom: 12,
  },
  todoText: { flex: 1, fontSize: 13, fontWeight: '700', color: '#92400E' },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(16,185,129,0.12)',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14,
  },
  badgeText: { fontSize: 11, fontWeight: '800', color: Colors.activeGreen },
  greeting: { fontSize: 26, fontWeight: '900', color: Colors.textDark, letterSpacing: -0.6 },
  sub: { fontSize: 13, color: Colors.textMid, marginTop: 6, marginBottom: 18 },
  promoCard: { borderRadius: 22, overflow: 'hidden', marginBottom: 22, ...Shadows.glow },
  promoGrad: { flexDirection: 'row', alignItems: 'center', padding: 18, gap: 14 },
  promoIcon: {
    width: 48, height: 48, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
  },
  promoText: { flex: 1 },
  promoTitle: { fontSize: 17, fontWeight: '900', color: Colors.white },
  promoSub: { fontSize: 12, color: 'rgba(255,255,255,0.88)', marginTop: 4, lineHeight: 17 },
  promoPkg: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.75)', marginTop: 6 },
  section: {
    fontSize: 11, fontWeight: '800', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10,
  },
  stats: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  stat: { flex: 1, alignItems: 'center' },
  statBox: {
    width: '100%', borderRadius: 16, paddingVertical: 14, alignItems: 'center',
    backgroundColor: Colors.white, borderWidth: 1, borderColor: '#EEEAF5', ...Shadows.soft,
  },
  statN: { color: Colors.primary, fontSize: 20, fontWeight: '900' },
  statL: { fontSize: 10, fontWeight: '700', color: Colors.textMuted, marginTop: 6, textAlign: 'center' },
  pendingCard: { backgroundColor: '#FEF3C7', borderRadius: 14, padding: 12, marginBottom: 8 },
  pendingText: { fontSize: 12, fontWeight: '700', color: '#92400E' },
  empty: {
    backgroundColor: Colors.white, borderRadius: 22, padding: 24, alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: '#EEEAF5', ...Shadows.soft,
  },
  emptyTitle: { fontSize: 14, fontWeight: '800', color: Colors.textDark },
  emptyDesc: { fontSize: 12, color: Colors.textMuted, textAlign: 'center', lineHeight: 18 },
});
