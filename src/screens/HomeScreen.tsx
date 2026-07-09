import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, Platform, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Gradients, Shadows } from '../constants/colors';
import { useI18n } from '../i18n';
import { getUserProfile } from '../services/userApi';
import { getFriends, getFriendRequests, getFriendSuggestions } from '../services/friendsApi';
import { getNearbyPlaces, type PlaceSummary } from '../services/placeApi';
import FriendMomentsSection from '../components/FriendMomentsSection';
import NotificationDropdown from '../components/NotificationDropdown';
import HomeAtmosphere from '../components/HomeAtmosphere';

interface HomeScreenProps {
  isActive?: boolean;
  locationGranted: boolean;
  unreadNotifCount?: number;
  onGoMap: () => void;
  onGoFriends: () => void;
  onGoProfile: () => void;
  onUnreadCountChange?: (count: number) => void;
  onOpenPost?: (postId: string) => void;
  onOpenChat?: (conversationId: string, title: string, avatarUrl?: string | null) => void;
}

const VIBES = [
  { id: 'chill', label: 'Chill', icon: 'leaf-outline' as const, grad: ['#FFD6EC', '#FFB8D9'] as const, color: '#D9468F', emoji: '🌸' },
  { id: 'study', label: 'Study', icon: 'book-outline' as const, grad: ['#C8F5DC', '#9AE6B8'] as const, color: '#16A34A', emoji: '📚' },
  { id: 'date', label: 'Date', icon: 'heart' as const, grad: ['#FFD4DC', '#FF9EB0'] as const, color: '#E11D48', emoji: '💕' },
  { id: 'party', label: 'Party', icon: 'musical-notes-outline' as const, grad: ['#E8D4FF', '#C9A8FF'] as const, color: '#7C3AED', emoji: '🎉' },
  { id: 'workout', label: 'Workout', icon: 'barbell-outline' as const, grad: ['#C8E4FF', '#93C8FD'] as const, color: '#2563EB', emoji: '💪' },
] as const;

const FALLBACK_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop';
const FALLBACK_PLACE = 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=400&fit=crop';

function getGreetingKey(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'home.greeting.morning';
  if (hour < 18) return 'home.greeting.afternoon';
  return 'home.greeting.evening';
}

function PulsingDot({ color }: { color: string }) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const useNativeDriver = Platform.OS !== 'web';
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.35, duration: 700, useNativeDriver }),
        Animated.timing(scale, { toValue: 1, duration: 700, useNativeDriver }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [scale]);
  return (
    <Animated.View style={[styles.pulseDot, { backgroundColor: color, transform: [{ scale }] }]} />
  );
}

export default function HomeScreen({
  isActive = true,
  locationGranted,
  unreadNotifCount = 0,
  onGoMap,
  onGoFriends,
  onGoProfile,
  onUnreadCountChange,
  onOpenPost,
  onOpenChat,
}: HomeScreenProps) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [notifOpen, setNotifOpen] = useState(false);
  const [selectedVibe, setSelectedVibe] = useState<string>('chill');
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [friendNames, setFriendNames] = useState<Record<string, { name: string; avatar?: string | null }>>({});
  const [pendingRequests, setPendingRequests] = useState(0);
  const [suggestionCount, setSuggestionCount] = useState(0);
  const [nearbyPlace, setNearbyPlace] = useState<PlaceSummary | null>(null);

  const loadData = useCallback(async () => {
    if (!isActive) return;

    try {
      const profile = await getUserProfile();
      setDisplayName(profile.displayName || profile.username);
      setAvatarUrl(profile.avatarUrl);
    } catch {
      setDisplayName('');
    }

    try {
      const friends = await getFriends();
      const lookup: Record<string, { name: string; avatar?: string | null }> = {};
      friends.forEach(f => {
        lookup[f.userId] = {
          name: f.displayName || f.username,
          avatar: f.avatarUrl,
        };
      });
      setFriendNames(lookup);
    } catch {
      setFriendNames({});
    }

    try {
      const requests = await getFriendRequests();
      setPendingRequests(requests.length);
    } catch {
      setPendingRequests(0);
    }

    try {
      const suggestions = await getFriendSuggestions();
      setSuggestionCount(suggestions.length);
    } catch {
      setSuggestionCount(0);
    }

    if (locationGranted) {
      try {
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const places = await getNearbyPlaces(
          position.coords.latitude,
          position.coords.longitude,
        );
        setNearbyPlace(places[0] ?? null);
      } catch {
        setNearbyPlace(null);
      }
    } else {
      setNearbyPlace(null);
    }
  }, [isActive, locationGranted]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const greeting = useMemo(() => {
    const name = displayName || t('home.you');
    return t(getGreetingKey()).replace('{name}', name);
  }, [displayName, t]);

  return (
    <View style={styles.root}>
      <HomeAtmosphere />

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12, paddingBottom: 120 }]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoWrap}>
            <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
            <Text style={styles.logoSparkle}>✨</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => setNotifOpen(open => !open)}
              activeOpacity={0.85}
              style={styles.notifBtnOuter}
            >
              <LinearGradient
                colors={notifOpen ? ['#E8D4FF', '#D4B8FF'] : ['#FFFFFF', '#FAF6FF']}
                style={[styles.notifBtn, notifOpen && styles.notifBtnActive]}
              >
                <Ionicons
                  name={notifOpen ? 'notifications' : 'notifications-outline'}
                  size={22}
                  color={notifOpen ? Colors.primary : Colors.textDark}
                />
                {unreadNotifCount > 0 && (
                  <View style={styles.notifBadge}>
                    <Text style={styles.notifBadgeText}>
                      {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                    </Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={onGoProfile} activeOpacity={0.85}>
              <LinearGradient colors={['#C9A8FF', '#FF9EC8', '#9C7CFF']} style={styles.avatarRing}>
                <Image
                  source={{ uri: avatarUrl || FALLBACK_AVATAR }}
                  style={styles.avatar}
                />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.greetingRow}>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.greetingEmoji}>✨</Text>
          </View>
          <View style={styles.vibeQuestionWrap}>
            <PulsingDot color="#C9A8FF" />
            <Text style={styles.greetingSub}>{t('home.vibeQuestion')}</Text>
            <Text style={styles.vibeQuestionEmoji}>💫</Text>
          </View>
        </View>

        {/* Vibe chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.vibeRow}
        >
          {VIBES.map(vibe => {
            const active = selectedVibe === vibe.id;
            return (
              <TouchableOpacity
                key={vibe.id}
                onPress={() => {
                  setSelectedVibe(vibe.id);
                  onGoMap();
                }}
                activeOpacity={0.88}
              >
                {active ? (
                  <LinearGradient
                    colors={[...vibe.grad]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.vibeChip, styles.vibeChipActive]}
                  >
                    <Text style={styles.vibeEmoji}>{vibe.emoji}</Text>
                    <Ionicons name={vibe.icon} size={14} color={vibe.color} />
                    <Text style={[styles.vibeText, { color: vibe.color }]}>{vibe.label}</Text>
                    <Text style={styles.vibeSparkle}>✦</Text>
                  </LinearGradient>
                ) : (
                  <View style={[styles.vibeChip, styles.vibeChipInactive]}>
                    <Text style={styles.vibeEmoji}>{vibe.emoji}</Text>
                    <Ionicons name={vibe.icon} size={14} color={vibe.color} />
                    <Text style={[styles.vibeText, { color: vibe.color }]}>{vibe.label}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* AI suggestion card */}
        <LinearGradient
          colors={['#F0E8FF', '#E8DEFF', '#FFE8F4', '#E4F0FF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.aiCardOuter}
        >
          <View style={styles.aiCardShine} />
          <View style={styles.aiBadge}>
            <LinearGradient colors={['#C9A8FF', '#9C7CFF']} style={styles.aiBadgeGrad}>
              <Text style={styles.aiBadgeText}>AI ✨</Text>
            </LinearGradient>
          </View>

          <View style={styles.aiCardTop}>
            <View style={styles.aiCardCopy}>
              <Text style={styles.aiTitle}>{t('home.aiSuggest')}</Text>
              <Text style={styles.aiSub}>{t('home.aiSuggestSub')}</Text>
            </View>
            <View style={styles.aiThumbWrap}>
              <LinearGradient colors={['#FFFFFF', '#F0E8FF']} style={styles.aiThumbRing}>
                <Image
                  source={{ uri: nearbyPlace?.thumbnailUrl || FALLBACK_PLACE }}
                  style={styles.aiThumb}
                />
              </LinearGradient>
              <Text style={styles.aiThumbSparkle}>✦</Text>
            </View>
          </View>

          <View style={styles.placeCard}>
            <View style={styles.placeCardHeader}>
              <Ionicons name="location" size={14} color={Colors.primary} />
              <Text style={styles.placeName} numberOfLines={1}>
                {nearbyPlace?.name || t('home.exploreMap')}
              </Text>
            </View>
            <Text style={styles.placeMeta}>
              {nearbyPlace
                ? t('home.nearbyPlace')
                : t('home.enableLocationHint')}
            </Text>
            <TouchableOpacity onPress={onGoMap} activeOpacity={0.88}>
              <LinearGradient
                colors={['#B896FF', '#7C5BFF', '#9C7CFF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.mapBtn}
              >
                <Ionicons name="map-outline" size={14} color={Colors.white} />
                <Text style={styles.mapBtnText}>{t('home.viewOnMap')}</Text>
                <Text style={styles.mapBtnSparkle}>→</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Stories */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionEmoji}>📸</Text>
            <Text style={styles.sectionTitle}>{t('home.storiesNearYou')}</Text>
            <Text style={styles.sectionSparkle}>✨</Text>
          </View>
          <TouchableOpacity onPress={onGoFriends} style={styles.seeAllBtn}>
            <Text style={styles.seeAll}>{t('common.seeAll')}</Text>
            <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.storiesWrap}>
          <FriendMomentsSection friendNames={friendNames} hideTitle />
        </View>

        {/* Signals */}
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionEmoji}>🔮</Text>
          <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>{t('home.anonymousSignals')}</Text>
          <Text style={styles.sectionSparkle}>♡</Text>
        </View>

        {pendingRequests > 0 && (
          <TouchableOpacity onPress={onGoFriends} activeOpacity={0.9}>
            <LinearGradient
              colors={['#FFF0F8', '#FFE4F0', '#FFF5FA']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.signalCard, styles.signalPink]}
            >
              <LinearGradient colors={['#FFD6EC', '#FFB8D9']} style={styles.signalIconWrap}>
                <Ionicons name="heart" size={20} color="#E11D48" />
              </LinearGradient>
              <View style={styles.signalCopy}>
                <Text style={styles.signalTitle}>{t('home.someoneWantsVibe')}</Text>
                <Text style={styles.signalLink}>{t('home.exploreNow')} ✨</Text>
              </View>
              <LinearGradient colors={['#FFFFFF', '#FFE8F0']} style={styles.signalBadge}>
                <Text style={styles.signalBadgeText}>{pendingRequests}</Text>
              </LinearGradient>
            </LinearGradient>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={onGoFriends} activeOpacity={0.9}>
          <LinearGradient
            colors={['#F5EEFF', '#EDE4FF', '#F8F0FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.signalCard, styles.signalPurple]}
          >
            <LinearGradient colors={['#E8DEFF', '#D4C4FF']} style={[styles.signalIconWrap, styles.signalIconPurple]}>
              <Image source={require('../../assets/logo.png')} style={styles.signalLogo} resizeMode="contain" />
            </LinearGradient>
            <View style={styles.signalCopy}>
              <Text style={styles.signalTitle}>{t('home.vibeMatch')} ✦</Text>
              <Text style={styles.signalSub}>
                {suggestionCount > 0
                  ? t('home.vibeMatchCount').replace('{count}', String(suggestionCount))
                  : t('home.vibeMatchEmpty')}
              </Text>
              <Text style={styles.signalLink}>{t('home.explore')} →</Text>
            </View>
            <Text style={styles.signalCardSparkle}>💜</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      <NotificationDropdown
        visible={notifOpen}
        onClose={() => setNotifOpen(false)}
        onUnreadCountChange={onUnreadCountChange}
        onOpenPost={onOpenPost}
        onOpenChat={onOpenChat}
        topOffset={insets.top + 64}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8F0FF',
    position: 'relative',
  },
  scrollView: {
    zIndex: 1,
  },
  scroll: {
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  logoWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  logo: {
    width: 108,
    height: 36,
  },
  logoSparkle: {
    fontSize: 14,
    marginTop: -8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  notifBtnOuter: {
    borderRadius: 18,
    ...Shadows.glow,
  },
  notifBtn: {
    width: 46,
    height: 46,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  notifBtnActive: {
    borderColor: 'rgba(200, 168, 255, 0.5)',
  },
  notifBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  notifBadgeText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 12,
  },
  avatarRing: {
    width: 46,
    height: 46,
    borderRadius: 23,
    padding: 2.5,
    ...Shadows.glow,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.white,
    backgroundColor: Colors.primarySoft,
  },
  hero: {
    marginBottom: 18,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 6,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textDark,
    lineHeight: 34,
    letterSpacing: -0.5,
    flexShrink: 1,
  },
  greetingEmoji: {
    fontSize: 22,
    marginTop: 4,
  },
  vibeQuestionWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  greetingSub: {
    fontSize: 15,
    color: Colors.textMid,
    fontWeight: '600',
    flex: 1,
  },
  vibeQuestionEmoji: {
    fontSize: 16,
  },
  vibeRow: {
    gap: 10,
    paddingBottom: 22,
  },
  vibeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 999,
  },
  vibeChipActive: {
    ...Shadows.glow,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  vibeChipInactive: {
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(232, 216, 255, 0.6)',
    ...Shadows.soft,
  },
  vibeEmoji: {
    fontSize: 13,
  },
  vibeText: {
    fontSize: 13,
    fontWeight: '800',
  },
  vibeSparkle: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '700',
  },
  aiCardOuter: {
    borderRadius: 26,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.7)',
    overflow: 'hidden',
    ...Shadows.float,
  },
  aiCardShine: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.35)',
    ...Platform.select({
      web: { filter: 'blur(20px)' as any },
      default: { opacity: 0.6 },
    }),
  },
  aiBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 2,
    borderRadius: 999,
    overflow: 'hidden',
    ...Shadows.glow,
  },
  aiBadgeGrad: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  aiBadgeText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: '800',
  },
  aiCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
    paddingRight: 52,
  },
  aiCardCopy: {
    flex: 1,
  },
  aiTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textDark,
    marginBottom: 4,
  },
  aiSub: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  aiThumbWrap: {
    position: 'relative',
  },
  aiThumbRing: {
    padding: 3,
    borderRadius: 20,
  },
  aiThumb: {
    width: 82,
    height: 82,
    borderRadius: 17,
    backgroundColor: Colors.white,
  },
  aiThumbSparkle: {
    position: 'absolute',
    top: -4,
    right: -4,
    fontSize: 14,
    color: '#C9A8FF',
  },
  placeCard: {
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    ...Shadows.soft,
  },
  placeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  placeName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textDark,
  },
  placeMeta: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: 12,
  },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 999,
    ...Shadows.glow,
  },
  mapBtnText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '800',
  },
  mapBtnSparkle: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionEmoji: {
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textDark,
  },
  sectionTitleSpaced: {
    marginTop: 8,
    marginBottom: 12,
  },
  sectionSparkle: {
    fontSize: 12,
    color: Colors.primaryLight,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(232, 216, 255, 0.5)',
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  storiesWrap: {
    marginBottom: 8,
    marginHorizontal: -4,
  },
  signalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 22,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.75)',
    ...Shadows.soft,
  },
  signalPink: {
    borderColor: 'rgba(255, 200, 220, 0.5)',
  },
  signalPurple: {
    borderColor: 'rgba(200, 168, 255, 0.4)',
  },
  signalIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.soft,
  },
  signalIconPurple: {},
  signalLogo: {
    width: 30,
    height: 13,
  },
  signalCopy: {
    flex: 1,
  },
  signalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textDark,
    marginBottom: 2,
  },
  signalSub: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  signalLink: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  signalBadge: {
    minWidth: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    ...Shadows.soft,
  },
  signalBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#E11D48',
  },
  signalCardSparkle: {
    fontSize: 20,
    marginRight: 4,
  },
});
