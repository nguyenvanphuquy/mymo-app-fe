import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Gradients, Shadows } from '../../constants/colors';
import { useI18n } from '../../i18n';
import MymoLogo from '../../components/MymoLogo';
import SparkleField from '../../components/SparkleField';
import {
  BUSINESS_VIBES,
  getBusinessAccount,
  listPlaces,
  type BusinessSession,
} from '../../utils/businessStorage';

export default function BusinessHomeScreen({ session }: { session: BusinessSession }) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [vibe, setVibe] = useState('chill');
  const [placeCount, setPlaceCount] = useState(0);

  useEffect(() => {
    getBusinessAccount(session.accountId).then(acc => {
      if (acc) setVibe(acc.vibe);
    });
    listPlaces(session.accountId).then(p => setPlaceCount(p.length));
  }, [session.accountId]);

  const vibeMeta = BUSINESS_VIBES.find(v => v.id === vibe);

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
        <Text style={styles.sub}>{t('biz.home.sub')}</Text>

        <View style={styles.stats}>
          <Stat n="12" l={t('biz.home.moments')} />
          <Stat n="4.8" l={t('biz.home.rating')} />
          <Stat n={String(Math.max(placeCount * 18, 6))} l={t('biz.home.checkins')} />
        </View>

        <View style={styles.vibeCard}>
          <Text style={styles.label}>{t('biz.home.vibe')}</Text>
          <Text style={styles.vibeValue}>{vibeMeta?.emoji} {vibeMeta?.label ?? vibe}</Text>
        </View>

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
  vibeCard: {
    backgroundColor: Colors.white, borderRadius: 20, padding: 16, marginBottom: 18, ...Shadows.soft,
  },
  label: {
    fontSize: 11, fontWeight: '800', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8,
  },
  vibeValue: { fontSize: 18, fontWeight: '800', color: Colors.textDark },
  empty: {
    backgroundColor: Colors.white, borderRadius: 22, padding: 24, alignItems: 'center', gap: 8, ...Shadows.soft,
  },
  emptyTitle: { fontSize: 14, fontWeight: '800', color: Colors.textDark },
  emptyDesc: { fontSize: 12, color: Colors.textMuted, textAlign: 'center', lineHeight: 18 },
});
