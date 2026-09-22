import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Platform, ActivityIndicator } from 'react-native';
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

export default function BusinessHomeScreen({ session }: { session: BusinessSession }) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [businessName, setBusinessName] = useState('');
  const [placeCount, setPlaceCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [approvedCount, setApprovedCount] = useState(0);
  const [totalCheckIns, setTotalCheckIns] = useState(0);
  const [todayCheckIns, setTodayCheckIns] = useState(0);
  const [weeklyCheckIns, setWeeklyCheckIns] = useState(0);
  const [monthlyCheckIns, setMonthlyCheckIns] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const businesses = await getMyBusinesses();
      if (businesses.length > 0) {
        setBusinessName(businesses[0].name);
      } else {
        setBusinessName(session.displayName);
      }

      const places = await getMyPlaces();
      setPlaceCount(places.length);
      setPendingCount(places.filter(p => p.status === 'Pending').length);
      setApprovedCount(places.filter(p => p.status === 'Approved').length);

      let total = 0;
      let today = 0;
      let week = 0;
      let month = 0;
      for (const place of places) {
        const analytics = await getPlaceAnalytics(place.placeId);
        total += analytics.totalCheckIns;
        today += analytics.todayCheckIns;
        week += analytics.weeklyCheckIns;
        month += analytics.monthlyCheckIns;
      }
      setTotalCheckIns(total);
      setTodayCheckIns(today);
      setWeeklyCheckIns(week);
      setMonthlyCheckIns(month);
    } catch {
      setBusinessName(session.displayName);
    } finally {
      setLoading(false);
    }
  }, [session.displayName]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#F6F2FF', '#EDE4FF']} style={StyleSheet.absoluteFill} />
      <SparkleField count={Platform.OS === 'web' ? 5 : 8} />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12, paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <MymoLogo width={100} />
          <View style={styles.badge}>
            <Ionicons name="storefront" size={12} color={Colors.activeGreen} />
            <Text style={styles.badgeText}>{t('biz.badge')}</Text>
          </View>
        </View>
        <Text style={styles.greeting}>{t('biz.home.greeting').replace('{name}', session.displayName)}</Text>
        <Text style={styles.sub}>{businessName || t('biz.home.sub')}</Text>

        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginVertical: 24 }} />
        ) : (
          <>
            <View style={styles.stats}>
              <Stat n={String(placeCount)} l={t('biz.nav.places')} />
              <Stat n={String(totalCheckIns)} l={t('biz.home.checkins')} />
              <Stat n={String(approvedCount)} l="Approved" />
            </View>
            <View style={styles.stats}>
              <Stat n={String(todayCheckIns)} l="Today" />
              <Stat n={String(weeklyCheckIns)} l="Week" />
              <Stat n={String(monthlyCheckIns)} l="Month" />
            </View>
            {pendingCount > 0 && (
              <View style={styles.pendingCard}>
                <Text style={styles.pendingText}>{pendingCount} place(s) pending admin approval</Text>
              </View>
            )}
          </>
        )}

        <Text style={styles.label}>{t('biz.home.recent')}</Text>
        <View style={styles.empty}>
          <Ionicons name="sparkles-outline" size={28} color={Colors.primary} />
          <Text style={styles.emptyTitle}>{t('biz.home.emptyRecent')}</Text>
          <Text style={styles.emptyDesc}>{t('biz.home.emptyRecentDesc')}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Stat({ n, l }: { n: string; l: string }) {
  return (
    <View style={styles.stat}>
      <LinearGradient colors={Gradients.primary} style={styles.statGrad}>
        <Text style={styles.statN}>{n}</Text>
      </LinearGradient>
      <Text style={styles.statL}>{l}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.primaryTint },
  scroll: { paddingHorizontal: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(16,185,129,0.12)',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14,
  },
  badgeText: { fontSize: 11, fontWeight: '800', color: Colors.activeGreen },
  greeting: { fontSize: 26, fontWeight: '900', color: Colors.textDark, letterSpacing: -0.6 },
  sub: { fontSize: 13, color: Colors.textMid, marginTop: 6, marginBottom: 18 },
  stats: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  stat: { flex: 1, alignItems: 'center' },
  statGrad: {
    width: '100%', borderRadius: 18, paddingVertical: 14, alignItems: 'center', ...Shadows.glow,
  },
  statN: { color: Colors.white, fontSize: 20, fontWeight: '900' },
  statL: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, marginTop: 6 },
  pendingCard: {
    backgroundColor: '#FEF3C7', borderRadius: 14, padding: 12, marginBottom: 16,
  },
  pendingText: { fontSize: 12, fontWeight: '700', color: '#92400E' },
  label: {
    fontSize: 11, fontWeight: '800', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8,
  },
  empty: {
    backgroundColor: Colors.white, borderRadius: 22, padding: 24, alignItems: 'center', gap: 8, ...Shadows.soft,
  },
  emptyTitle: { fontSize: 14, fontWeight: '800', color: Colors.textDark },
  emptyDesc: { fontSize: 12, color: Colors.textMuted, textAlign: 'center', lineHeight: 18 },
});
