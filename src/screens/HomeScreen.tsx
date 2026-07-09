import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, Platform,
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

interface HomeScreenProps {
  isActive?: boolean;
  locationGranted: boolean;
  unreadNotifCount?: number;
  onGoMap: () => void;
  onGoFriends: () => void;
  onGoProfile: () => void;
  onGoNotifications: () => void;
}

const VIBES = [
  { id: 'chill', label: 'Chill', icon: 'leaf-outline' as const, bg: '#FFE4F0', color: '#FF6B9D' },
  { id: 'study', label: 'Study', icon: 'book-outline' as const, bg: '#E4F8EE', color: '#22C55E' },
  { id: 'date', label: 'Date', icon: 'heart' as const, bg: '#FFE8EC', color: '#EF4444' },
  { id: 'party', label: 'Party', icon: 'musical-notes-outline' as const, bg: '#F0E8FF', color: '#7C5BFF' },
  { id: 'workout', label: 'Workout', icon: 'barbell-outline' as const, bg: '#E4F0FF', color: '#3B82F6' },
];

const FALLBACK_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop';
const FALLBACK_PLACE = 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=400&fit=crop';

function getGreetingKey(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'home.greeting.morning';
  if (hour < 18) return 'home.greeting.afternoon';
  return 'home.greeting.evening';
}

export default function HomeScreen({
  isActive = true,
  locationGranted,
  unreadNotifCount = 0,
  onGoMap,
  onGoFriends,
  onGoProfile,
  onGoNotifications,
}: HomeScreenProps) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
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
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12, paddingBottom: 120 }]}
      >
        <View style={styles.header}>
          <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={onGoNotifications}
              activeOpacity={0.85}
              style={styles.notifBtn}
            >
              <Ionicons name="notifications-outline" size={22} color={Colors.textDark} />
              {unreadNotifCount > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>
                    {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={onGoProfile} activeOpacity={0.85}>
              <Image
                source={{ uri: avatarUrl || FALLBACK_AVATAR }}
                style={styles.avatar}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.hero}>
          <Text style={styles.greeting}>{greeting} ✨</Text>
          <Text style={styles.greetingSub}>{t('home.vibeQuestion')}</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.vibeRow}
        >
          {VIBES.map(vibe => (
            <TouchableOpacity
              key={vibe.id}
              onPress={onGoMap}
              activeOpacity={0.85}
              style={[styles.vibeChip, { backgroundColor: vibe.bg }]}
            >
              <Ionicons name={vibe.icon} size={14} color={vibe.color} />
              <Text style={[styles.vibeText, { color: vibe.color }]}>{vibe.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <LinearGradient
          colors={['#F4EEFF', '#ECE4FF', '#E2D8FF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.aiCard}
        >
          <View style={styles.aiCardTop}>
            <View style={styles.aiCardCopy}>
              <Text style={styles.aiTitle}>{t('home.aiSuggest')}</Text>
              <Text style={styles.aiSub}>{t('home.aiSuggestSub')}</Text>
            </View>
            <Image
              source={{ uri: nearbyPlace?.thumbnailUrl || FALLBACK_PLACE }}
              style={styles.aiThumb}
            />
          </View>

          <View style={styles.placeCard}>
            <Text style={styles.placeName}>
              {nearbyPlace?.name || t('home.exploreMap')}
            </Text>
            <Text style={styles.placeMeta}>
              {nearbyPlace
                ? t('home.nearbyPlace')
                : t('home.enableLocationHint')}
            </Text>
            <TouchableOpacity onPress={onGoMap} activeOpacity={0.88} style={styles.mapBtnWrap}>
              <LinearGradient colors={Gradients.primary} style={styles.mapBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={styles.mapBtnText}>{t('home.viewOnMap')}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('home.storiesNearYou')}</Text>
          <TouchableOpacity onPress={onGoFriends}>
            <Text style={styles.seeAll}>{t('common.seeAll')}</Text>
          </TouchableOpacity>
        </View>

        <FriendMomentsSection friendNames={friendNames} hideTitle />

        <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>{t('home.anonymousSignals')}</Text>

        {pendingRequests > 0 && (
          <TouchableOpacity onPress={onGoFriends} activeOpacity={0.9} style={[styles.signalCard, styles.signalPink]}>
            <View style={styles.signalIconWrap}>
              <Ionicons name="heart" size={18} color="#FF6B9D" />
            </View>
            <View style={styles.signalCopy}>
              <Text style={styles.signalTitle}>{t('home.someoneWantsVibe')}</Text>
              <Text style={styles.signalLink}>{t('home.exploreNow')} →</Text>
            </View>
            <View style={styles.signalBadge}>
              <Text style={styles.signalBadgeText}>{pendingRequests}</Text>
            </View>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={onGoFriends} activeOpacity={0.9} style={[styles.signalCard, styles.signalPurple]}>
          <View style={[styles.signalIconWrap, styles.signalIconPurple]}>
            <Image source={require('../../assets/logo.png')} style={styles.signalLogo} resizeMode="contain" />
          </View>
          <View style={styles.signalCopy}>
            <Text style={styles.signalTitle}>{t('home.vibeMatch')}</Text>
            <Text style={styles.signalSub}>
              {suggestionCount > 0
                ? t('home.vibeMatchCount').replace('{count}', String(suggestionCount))
                : t('home.vibeMatchEmpty')}
            </Text>
            <Text style={styles.signalLink}>{t('home.explore')} →</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FAFAFC',
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  notifBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    ...Shadows.soft,
  },
  notifBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
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
  logo: {
    width: 108,
    height: 36,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.white,
    backgroundColor: Colors.primarySoft,
    ...Shadows.soft,
  },
  hero: {
    marginBottom: 18,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textDark,
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  greetingSub: {
    marginTop: 8,
    fontSize: 15,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  vibeRow: {
    gap: 10,
    paddingBottom: 20,
  },
  vibeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  vibeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  aiCard: {
    borderRadius: 24,
    padding: 16,
    marginBottom: 24,
    ...Shadows.soft,
  },
  aiCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
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
  aiThumb: {
    width: 88,
    height: 88,
    borderRadius: 18,
    backgroundColor: Colors.white,
  },
  placeCard: {
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderRadius: 18,
    padding: 14,
  },
  placeName: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textDark,
    marginBottom: 4,
  },
  placeMeta: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: 12,
  },
  mapBtnWrap: {
    alignSelf: 'flex-start',
  },
  mapBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  mapBtnText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '800',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
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
  seeAll: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  signalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 20,
    padding: 14,
    marginBottom: 12,
  },
  signalPink: {
    backgroundColor: '#FFF0F5',
  },
  signalPurple: {
    backgroundColor: '#F3EEFF',
  },
  signalIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signalIconPurple: {
    backgroundColor: '#EDE6FF',
  },
  signalLogo: {
    width: 28,
    height: 12,
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
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(255, 107, 157, 0.2)' },
      default: {
        shadowColor: '#FF6B9D',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 3,
      },
    }),
  },
  signalBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FF6B9D',
  },
});
