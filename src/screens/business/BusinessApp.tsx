import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Colors, Gradients, Shadows } from '../../constants/colors';
import { useI18n } from '../../i18n';
import { clearBusinessSession, type BusinessSession } from '../../utils/businessStorage';
import BusinessHomeScreen from './BusinessHomeScreen';
import BusinessPlacesScreen from './BusinessPlacesScreen';
import BusinessEventsScreen from './BusinessEventsScreen';
import BusinessBrandScreen from './BusinessBrandScreen';

type BizTab = 'home' | 'places' | 'events' | 'brand';

export default function BusinessApp({
  session,
  onLogout,
}: {
  session: BusinessSession;
  onLogout: () => void;
}) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<BizTab>('home');
  const [createEventOpen, setCreateEventOpen] = useState(false);

  const handleLogout = async () => {
    await clearBusinessSession();
    Toast.show({ type: 'info', text1: t('biz.brand.loggedOut') });
    onLogout();
  };

  return (
    <View style={styles.root}>
      <View style={styles.content}>
        {tab === 'home' && <BusinessHomeScreen session={session} />}
        {tab === 'places' && <BusinessPlacesScreen session={session} />}
        {tab === 'events' && (
          <BusinessEventsScreen
            session={session}
            createOpen={createEventOpen}
            onCloseCreate={() => setCreateEventOpen(false)}
            onOpenCreate={() => setCreateEventOpen(true)}
          />
        )}
        {tab === 'brand' && <BusinessBrandScreen session={session} onLogout={handleLogout} />}
      </View>

      <View style={[styles.navWrap, { paddingBottom: insets.bottom + 8 }]}>
        <View style={styles.nav}>
          <BizNavItem
            icon="home-outline"
            iconActive="home"
            label={t('biz.nav.today')}
            active={tab === 'home'}
            onPress={() => setTab('home')}
          />
          <BizNavItem
            icon="location-outline"
            iconActive="location"
            label={t('biz.nav.places')}
            active={tab === 'places'}
            onPress={() => setTab('places')}
          />
          <TouchableOpacity
            onPress={() => {
              setTab('events');
              setCreateEventOpen(true);
            }}
            style={styles.centerBtn}
            activeOpacity={0.88}
          >
            <LinearGradient colors={Gradients.primary} style={styles.centerGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Ionicons name="calendar" size={24} color={Colors.white} />
            </LinearGradient>
            <View style={styles.sparkle}>
              <Ionicons name="sparkles" size={10} color={Colors.white} />
            </View>
          </TouchableOpacity>
          <BizNavItem
            icon="calendar-outline"
            iconActive="calendar"
            label={t('biz.nav.events')}
            active={tab === 'events'}
            onPress={() => setTab('events')}
          />
          <BizNavItem
            icon="storefront-outline"
            iconActive="storefront"
            label={t('biz.nav.brand')}
            active={tab === 'brand'}
            onPress={() => setTab('brand')}
          />
        </View>
      </View>
    </View>
  );
}

function BizNavItem({
  icon, iconActive, label, active, onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconActive: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const scale = React.useRef(new Animated.Value(1)).current;
  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.88, duration: 80, useNativeDriver: Platform.OS !== 'web' }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
    onPress();
  };
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity onPress={handlePress} style={styles.navItem}>
        <View style={[styles.navIconWrap, active && styles.navIconWrapActive]}>
          <Ionicons name={active ? iconActive : icon} size={22} color={active ? Colors.primary : Colors.textMuted} />
        </View>
        <Text style={[styles.navLabel, active && styles.navLabelActive]}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.primaryTint,
    ...Platform.select({
      web: {
        maxWidth: 500,
        width: '100%',
        marginHorizontal: 'auto',
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: '#EBE8F5',
      },
      default: {},
    }),
  },
  content: { flex: 1 },
  navWrap: { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center' },
  nav: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.94)',
    marginHorizontal: 16,
    borderRadius: 28,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    ...Shadows.float,
  },
  navItem: { alignItems: 'center', width: 56 },
  navIconWrap: { width: 36, height: 36, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  navIconWrapActive: { backgroundColor: Colors.primaryTint },
  navLabel: { fontSize: 10, fontWeight: '700', color: Colors.textMuted, marginTop: 2 },
  navLabelActive: { color: Colors.primary },
  centerBtn: { marginHorizontal: 4, marginBottom: 6 },
  centerGrad: {
    width: 56, height: 56, borderRadius: 22, alignItems: 'center', justifyContent: 'center', ...Shadows.glow,
  },
  sparkle: {
    position: 'absolute', top: -2, right: -2, width: 18, height: 18, borderRadius: 9,
    backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
});
