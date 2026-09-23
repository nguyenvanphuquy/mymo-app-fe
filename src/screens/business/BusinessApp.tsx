import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Colors, Gradients, Shadows } from '../../constants/colors';
import { useI18n } from '../../i18n';
import { clearBusinessSession, type BusinessSession } from '../../services/businessApi';
import { hasCompletedBusinessOnboarding } from '../../utils/businessOnboardingStorage';
import BusinessHomeScreen from './BusinessHomeScreen';
import BusinessPlacesScreen from './BusinessPlacesScreen';
import BusinessEventsScreen from './BusinessEventsScreen';
import BusinessBrandScreen from './BusinessBrandScreen';
import BusinessAdvertisingScreen from './BusinessAdvertisingScreen';
import BusinessOnboardingScreen from './BusinessOnboardingScreen';
import BusinessNotificationsScreen from './BusinessNotificationsScreen';
import BusinessBillingScreen from './BusinessBillingScreen';
import BusinessEditProfileScreen from './BusinessEditProfileScreen';
import BusinessHelpScreen from './BusinessHelpScreen';
import BusinessCampaignSuccessScreen from './BusinessCampaignSuccessScreen';
import type { BizOverlay } from './businessOverlayTypes';

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
  const [overlay, setOverlay] = useState<BizOverlay | null>(null);

  useEffect(() => {
    hasCompletedBusinessOnboarding().then(done => {
      if (!done) setOverlay('onboarding');
    });
  }, []);

  const closeOverlay = () => setOverlay(null);
  const selectTab = (next: BizTab) => {
    closeOverlay();
    setTab(next);
  };

  const handleLogout = async () => {
    await clearBusinessSession();
    Toast.show({ type: 'info', text1: t('biz.brand.loggedOut') });
    onLogout();
  };

  const renderBody = () => {
    switch (overlay) {
      case 'onboarding':
        return <BusinessOnboardingScreen onDone={closeOverlay} />;
      case 'advertising':
        return (
          <BusinessAdvertisingScreen
            session={session}
            onBack={closeOverlay}
            onSuccess={() => setOverlay('campaignSuccess')}
          />
        );
      case 'campaignSuccess':
        return (
          <BusinessCampaignSuccessScreen
            onBack={closeOverlay}
            onViewBilling={() => setOverlay('billing')}
          />
        );
      case 'notifications':
        return <BusinessNotificationsScreen onBack={closeOverlay} />;
      case 'billing':
        return <BusinessBillingScreen onBack={closeOverlay} />;
      case 'editProfile':
        return <BusinessEditProfileScreen session={session} onBack={closeOverlay} />;
      case 'help':
        return <BusinessHelpScreen onBack={closeOverlay} />;
      default:
        break;
    }
    if (tab === 'home') {
      return (
        <BusinessHomeScreen
          session={session}
          onOpenAdvertising={() => setOverlay('advertising')}
          onOpenNotifications={() => setOverlay('notifications')}
          onGoPlaces={() => selectTab('places')}
          onGoEvents={() => selectTab('events')}
        />
      );
    }
    if (tab === 'places') return <BusinessPlacesScreen session={session} />;
    if (tab === 'events') {
      return (
        <BusinessEventsScreen
          session={session}
          createOpen={createEventOpen}
          onCloseCreate={() => setCreateEventOpen(false)}
          onOpenCreate={() => setCreateEventOpen(true)}
        />
      );
    }
    return (
      <BusinessBrandScreen
        session={session}
        onLogout={handleLogout}
        onOpenAdvertising={() => setOverlay('advertising')}
        onNavigateToPlaces={() => selectTab('places')}
        onNavigateToEvents={() => selectTab('events')}
        onOpenNotifications={() => setOverlay('notifications')}
        onOpenBilling={() => setOverlay('billing')}
        onOpenEditProfile={() => setOverlay('editProfile')}
        onOpenHelp={() => setOverlay('help')}
      />
    );
  };

  const showNav = overlay !== 'onboarding';

  return (
    <View style={styles.root}>
      <View style={styles.content}>{renderBody()}</View>
      {showNav ? (
        <View style={[styles.navWrap, { paddingBottom: insets.bottom + 8 }]}>
          <View style={styles.nav}>
            <BizNavItem icon="home-outline" iconActive="home" label={t('biz.nav.today')} active={tab === 'home' && !overlay} onPress={() => selectTab('home')} />
            <BizNavItem icon="location-outline" iconActive="location" label={t('biz.nav.places')} active={tab === 'places' && !overlay} onPress={() => selectTab('places')} />
            <TouchableOpacity onPress={() => { selectTab('events'); setCreateEventOpen(true); }} style={styles.centerBtn} activeOpacity={0.88}>
              <LinearGradient colors={Gradients.primary} style={styles.centerGrad}>
                <Ionicons name="calendar" size={24} color={Colors.white} />
              </LinearGradient>
            </TouchableOpacity>
            <BizNavItem icon="calendar-outline" iconActive="calendar" label={t('biz.nav.events')} active={tab === 'events' && !overlay} onPress={() => selectTab('events')} />
            <BizNavItem icon="person-outline" iconActive="person" label={t('biz.nav.brand')} active={tab === 'brand' && !overlay} onPress={() => selectTab('brand')} />
          </View>
        </View>
      ) : null}
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
    backgroundColor: '#FAFAFC',
    ...Platform.select({
      web: { maxWidth: 500, width: '100%', marginHorizontal: 'auto', borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#EBE8F5' },
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
  centerGrad: { width: 56, height: 56, borderRadius: 22, alignItems: 'center', justifyContent: 'center', ...Shadows.glow },
});
