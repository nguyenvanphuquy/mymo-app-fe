import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Dimensions, Image, DeviceEventEmitter,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Mapbox, { Camera, MapView, MarkerView, UserLocation } from '@rnmapbox/maps';
import * as Location from 'expo-location';
import { Colors, Gradients, Shadows } from '../constants/colors';
import { useI18n } from '../i18n';
import type { Friend } from '../constants/data';
import FriendSheet from '../components/FriendSheet';
import PostSheet from '../components/PostSheet';
import PlaceSheet from '../components/PlaceSheet';
import { getNearbyPosts, toPostView, type NearbyPost, type PostView } from '../services/postApi';
import { filterActivePosts } from '../utils/postExpiration';
import { getNearbyPlaces, recentPostToPostView, type PlaceSummary } from '../services/placeApi';
import { getFriendsLocations } from '../services/friendsApi';
import { updateUserLocation } from '../services/userApi';
import { friendLocationToMapPin, type MapFriendPin } from '../utils/mapFriendUtils';
import { getMymoMapStyle, MAP_THEME_UI, type MapTheme } from '../utils/mapStyles';
import MapAtmosphere from '../components/MapAtmosphere';
import MapLocateButton from '../components/MapLocateButton';
import MapSearchDropdown from '../components/MapSearchDropdown';
import { useMapGeocodeSearch } from '../hooks/useMapGeocodeSearch';
import { MAPBOX_ACCESS_TOKEN } from '../constants/mapbox';
import type { MapGeocodeResult } from '../services/mapGeocodingApi';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';

Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);

const { width: SW, height: SH } = Dimensions.get('window');

// ─── Types ────────────────────────────────────────────────────────────────────
interface MapScreenProps {
  locationGranted: boolean;
  visibleOnMap: boolean;
  incognito: boolean;
  isActive?: boolean;
  onFriendTap: (f: Friend) => void;
  selectedFriend: Friend | null;
  onCloseSheet: () => void;
  onMessage: (f: Friend) => void;
  onDisableIncognito?: () => void;
}

// ─── Default center: Tòa S1.07, Vinhomes Grand Park, Quận 9 ──────────────────
const DEFAULT_CENTER: [number, number] = [106.8376, 10.8382];
const DEFAULT_ZOOM = 17;

export default function MapScreen({
  locationGranted, visibleOnMap, incognito, isActive = true,
  onFriendTap, selectedFriend, onCloseSheet, onMessage, onDisableIncognito,
}: MapScreenProps) {
  const { t } = useI18n();
  const [searchText, setSearchText] = useState('');
  const [mapTheme, setMapTheme] = useState<MapTheme>('purple');
  const mapStyle = React.useMemo(() => getMymoMapStyle(mapTheme), [mapTheme]);
  const themeUi = MAP_THEME_UI[mapTheme];
  const mapFilters = [
    { id: 'all', label: t('map.filterAll') },
    { id: 'friends', label: t('map.filterFriends') },
    { id: 'public', label: t('map.filterPublic') },
    { id: 'events', label: t('map.filterEvents') },
    { id: 'vibe', label: t('map.filterVibe') },
  ];
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [nearbyPosts, setNearbyPosts] = useState<NearbyPost[]>([]);
  const [nearbyPlaces, setNearbyPlaces] = useState<PlaceSummary[]>([]);
  const [selectedPost, setSelectedPost] = useState<PostView | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<PlaceSummary | null>(null);
  const [friendPins, setFriendPins] = useState<MapFriendPin[]>([]);
  const [searchPin, setSearchPin] = useState<MapGeocodeResult | null>(null);
  const cameraRef = useRef<Camera>(null);
  const hasCenteredOnUserRef = useRef(false);

  const searchProximity = userCoords
    ? { lng: userCoords.lng, lat: userCoords.lat }
    : { lng: DEFAULT_CENTER[0], lat: DEFAULT_CENTER[1] };
  const {
    results: geocodeResults,
    loading: geocodeLoading,
    focused: searchFocused,
    setFocused: setSearchFocused,
    showDropdown: showSearchDropdown,
  } = useMapGeocodeSearch(searchText, { proximity: searchProximity });

  // ── User location ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!locationGranted) {
      setUserCoords(null);
      return;
    }

    let cancelled = false;
    let subscription: Location.LocationSubscription | null = null;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || cancelled) return;

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!cancelled) {
          setUserCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        }

        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            distanceInterval: 50,
            timeInterval: 30000,
          },
          pos => {
            if (!cancelled) {
              setUserCoords({
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
              });
            }
          },
        );
      } catch {
        // fallback to default center
      }
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [locationGranted]);

  // ── Share own location with server ───────────────────────────────────────
  useEffect(() => {
    if (!locationGranted || !userCoords) return;
    const sharing = visibleOnMap && !incognito;
    updateUserLocation(
      sharing ? userCoords.lat : null,
      sharing ? userCoords.lng : null,
    );
  }, [locationGranted, visibleOnMap, incognito, userCoords?.lat, userCoords?.lng]);

  // ── Fetch friend locations ───────────────────────────────────────────────
  const fetchFriendLocations = useCallback(async () => {
    const lat = userCoords?.lat;
    const lng = userCoords?.lng;
    try {
      const locations = await getFriendsLocations();
      setFriendPins(locations.map(loc => friendLocationToMapPin(loc, lat, lng)));
    } catch {
      setFriendPins([]);
    }
  }, [userCoords]);

  useEffect(() => {
    if (!isActive) return;
    fetchFriendLocations();
    const interval = setInterval(fetchFriendLocations, 30000);
    const subAccepted = DeviceEventEmitter.addListener('friend:accepted', fetchFriendLocations);
    const subRefetch = DeviceEventEmitter.addListener('friends:refetch', fetchFriendLocations);
    return () => {
      clearInterval(interval);
      subAccepted.remove();
      subRefetch.remove();
    };
  }, [isActive, fetchFriendLocations]);

  // ── Fetch nearby posts ───────────────────────────────────────────────────
  const fetchNearbyPosts = useCallback(async () => {
    const lat = userCoords?.lat ?? DEFAULT_CENTER[1];
    const lng = userCoords?.lng ?? DEFAULT_CENTER[0];
    try {
      const posts = await getNearbyPosts(lat, lng, 5, 1, 20);
      setNearbyPosts(filterActivePosts(posts));
    } catch {
      setNearbyPosts([]);
    }
  }, [userCoords]);

  const fetchNearbyPlaces = useCallback(async () => {
    const lat = userCoords?.lat ?? DEFAULT_CENTER[1];
    const lng = userCoords?.lng ?? DEFAULT_CENTER[0];
    try {
      const places = await getNearbyPlaces(lat, lng, 5);
      setNearbyPlaces(places);
    } catch {
      setNearbyPlaces([]);
    }
  }, [userCoords]);

  useEffect(() => {
    if (!isActive) return;
    fetchNearbyPosts();
    fetchNearbyPlaces();
    const sub = DeviceEventEmitter.addListener('post:created', () => {
      fetchNearbyPosts();
      fetchNearbyPlaces();
    });
    return () => sub.remove();
  }, [isActive, fetchNearbyPosts, fetchNearbyPlaces]);

  const searchLower = searchText.trim().toLowerCase();
  const filteredPosts = searchLower
    ? nearbyPosts.filter(p =>
        p.displayName.toLowerCase().includes(searchLower) ||
        (p.caption || '').toLowerCase().includes(searchLower))
    : nearbyPosts;
  const filteredPlaces = searchLower
    ? nearbyPlaces.filter(p =>
        p.name.toLowerCase().includes(searchLower) ||
        (p.address || '').toLowerCase().includes(searchLower) ||
        (p.city || '').toLowerCase().includes(searchLower))
    : nearbyPlaces;

  const mapCenter: [number, number] = userCoords
    ? [userCoords.lng, userCoords.lat]
    : DEFAULT_CENTER;

  // ── Default: always center on my location when opening the map ───────────
  useEffect(() => {
    if (!isActive) {
      hasCenteredOnUserRef.current = false;
      return;
    }
    if (!userCoords || !cameraRef.current || hasCenteredOnUserRef.current) return;
    hasCenteredOnUserRef.current = true;
    cameraRef.current.flyTo([userCoords.lng, userCoords.lat], 800);
    cameraRef.current.zoomTo(DEFAULT_ZOOM, 800);
  }, [isActive, userCoords]);

  // ── Fly to selected friend ───────────────────────────────────────────────
  useEffect(() => {
    if (!selectedFriend || !cameraRef.current) return;
    const friend = friendPins.find(f => f.id === selectedFriend.id);
    if (friend) {
      cameraRef.current.flyTo([friend.lng, friend.lat], 800);
      cameraRef.current.zoomTo(15, 800);
    }
  }, [selectedFriend, friendPins]);

  const recenter = useCallback(() => {
    cameraRef.current?.flyTo(mapCenter, 800);
    cameraRef.current?.zoomTo(DEFAULT_ZOOM, 800);
    fetchNearbyPosts();
    fetchNearbyPlaces();
    Toast.show({ type: 'success', text1: t('map.centered') });
  }, [t, mapCenter, fetchNearbyPosts, fetchNearbyPlaces, fetchFriendLocations]);

  const handleSelectGeocode = useCallback((result: MapGeocodeResult) => {
    setSearchText(result.placeName);
    setSearchFocused(false);
    setSearchPin(result);
    cameraRef.current?.flyTo([result.lng, result.lat], 800);
    cameraRef.current?.zoomTo(17, 800);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleSearchSubmit = useCallback(() => {
    if (geocodeResults.length > 0) {
      handleSelectGeocode(geocodeResults[0]);
    }
  }, [geocodeResults, handleSelectGeocode]);

  useEffect(() => {
    if (!searchText.trim()) setSearchPin(null);
  }, [searchText]);

  return (
    <View style={styles.container}>
      {/* ── Real Mapbox Map ── */}
      <MapView
        key={mapTheme}
        style={styles.map}
        styleJSON={mapStyle}
        logoEnabled={false}
        attributionEnabled={false}
        compassEnabled={false}
        scaleBarEnabled={false}
      >
        <Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: mapCenter,
            zoomLevel: DEFAULT_ZOOM,
          }}
        />

        {/* User location dot */}
        {visibleOnMap && (
          <UserLocation
            visible
            renderMode={"normal" as any}
            androidRenderMode="compass"
          />
        )}

        {/* Search result pin */}
        {searchPin && (
          <MarkerView
            key={`search-${searchPin.id}`}
            coordinate={[searchPin.lng, searchPin.lat]}
            anchor={{ x: 0.5, y: 1 }}
          >
            <View style={styles.searchPin}>
              <LinearGradient
                colors={Gradients.primary}
                style={styles.searchPinBubble}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="location" size={20} color={Colors.white} />
              </LinearGradient>
              <View style={styles.searchPinTip} />
            </View>
          </MarkerView>
        )}

        {/* Nearby place pins */}
        {filteredPlaces.map(place => (
          <MarkerView
            key={`place-${place.placeId}`}
            coordinate={[place.longitude, place.latitude]}
            anchor={{ x: 0.5, y: 1 }}
          >
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedPost(null);
                setSelectedPlace(place);
              }}
              style={styles.placePin}
              activeOpacity={0.88}
            >
              <LinearGradient
                colors={Gradients.primary}
                style={styles.placePinBubble}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.placePinInner}>
                  {place.thumbnailUrl ? (
                    <Image source={{ uri: place.thumbnailUrl }} style={styles.placePinImg} />
                  ) : (
                    <Ionicons name="location" size={18} color={Colors.primary} />
                  )}
                </View>
              </LinearGradient>
              <View style={styles.placePinTip} />
              <View style={styles.placeChip}>
                <Text style={styles.placeChipName} numberOfLines={1}>{place.name}</Text>
                {place.averageRating != null && place.averageRating > 0 && (
                  <View style={styles.placeRatingPill}>
                    <Ionicons name="star" size={9} color="#F59E0B" />
                    <Text style={styles.placeRatingText}>{place.averageRating.toFixed(1)}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </MarkerView>
        ))}

        {/* Nearby post pins */}
        {filteredPosts.map(post => (
          <MarkerView
            key={`post-${post.postId}`}
            coordinate={[post.longitude, post.latitude]}
            anchor={{ x: 0.5, y: 1 }}
          >
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedPlace(null);
                setSelectedPost(toPostView(post));
              }}
              style={styles.postPin}
            >
              <View style={[styles.postThumbWrap, Shadows.glow as any]}>
                {post.thumbnailUrl ? (
                  <Image
                    source={{ uri: post.thumbnailUrl }}
                    style={styles.postThumb}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.postThumbFallback}>
                    <Ionicons name="image-outline" size={20} color={Colors.primary} />
                  </View>
                )}
              </View>
              <View style={styles.postNameTag}>
                <Text style={styles.postName} numberOfLines={1}>{post.displayName}</Text>
              </View>
            </TouchableOpacity>
          </MarkerView>
        ))}

        {/* Friend pins */}
        {friendPins.map(f => (
          <MarkerView
            key={`friend-${f.id}`}
            coordinate={[f.lng, f.lat]}
            anchor={{ x: 0.5, y: 1 }}
          >
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onFriendTap(f);
              }}
              style={styles.pin}
            >
              <View style={[styles.pinAvatar, { backgroundColor: f.color }, Shadows.glow as any]}>
                {f.avatarUrl ? (
                  <Image source={{ uri: f.avatarUrl }} style={styles.pinAvatarImg} />
                ) : (
                  <Text style={styles.pinEmoji}>{f.emoji}</Text>
                )}
                {f.status === 'active' && <View style={styles.pinActiveDot} />}
              </View>
              <View style={styles.pinNameTag}>
                <Text style={styles.pinName}>{f.name}</Text>
              </View>
            </TouchableOpacity>
          </MarkerView>
        ))}

        {/* Incognito ghost pin */}
        {locationGranted && incognito && (
          <MarkerView
            key="ghost-pin"
            coordinate={DEFAULT_CENTER}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.ghostPin}>
              <Ionicons name="glasses-outline" size={18} color={Colors.primary} />
            </View>
          </MarkerView>
        )}
      </MapView>

      <MapAtmosphere theme={mapTheme} />

      {/* ── Search bar + controls overlay ── */}
      <View style={styles.topBar} pointerEvents="box-none">
        <View style={styles.searchBlock} pointerEvents="auto">
          <View style={styles.searchRow}>
            <View style={[styles.searchBox, { backgroundColor: themeUi.searchBg }]}>
              <Ionicons name="search-outline" size={16} color={mapTheme === 'purple' ? Colors.primary : '#C89620'} />
              <TextInput
                value={searchText}
                onChangeText={setSearchText}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 300)}
                onSubmitEditing={handleSearchSubmit}
                returnKeyType="search"
                placeholder={t('map.search')}
                placeholderTextColor={Colors.textMuted}
                style={styles.searchInput}
              />
              {searchText.length > 0 ? (
                <TouchableOpacity onPress={() => { setSearchText(''); setSearchPin(null); }}>
                  <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
                </TouchableOpacity>
              ) : (
                <Ionicons name="mic-outline" size={16} color={Colors.textMuted} />
              )}
            </View>
            <TouchableOpacity
              onPress={() => {
                const nextTheme = mapTheme === 'purple' ? 'yellow' : 'purple';
                setMapTheme(nextTheme);
                Toast.show({
                  type: 'success',
                  text1: nextTheme === 'purple' ? 'Bản đồ Tím Pastel 💜' : 'Bản đồ Nắng ấm ☀️',
                });
              }}
              style={styles.mapBtn}
              activeOpacity={0.88}
            >
              <LinearGradient colors={[...themeUi.accent]} style={styles.mapBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <Ionicons name="options-outline" size={18} color={Colors.white} />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <MapSearchDropdown
            visible={showSearchDropdown}
            loading={geocodeLoading}
            results={geocodeResults}
            onSelect={handleSelectGeocode}
            onClose={() => setSearchFocused(false)}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          pointerEvents="auto"
        >
          {mapFilters.map((chip, index) => {
            const active = index === 0;
            return active ? (
              <LinearGradient
                key={chip.id}
                colors={[...themeUi.chipActive]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.filterChipActive}
              >
                <Text style={styles.filterChipActiveText}>
                  {chip.label}{index === 0 ? ' ✨' : ''}
                </Text>
              </LinearGradient>
            ) : (
              <View
                key={chip.id}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: themeUi.chipInactiveBg,
                    borderColor: themeUi.chipInactiveBorder,
                  },
                ]}
              >
                <Text style={styles.filterChipText}>{chip.label}</Text>
              </View>
            );
          })}
        </ScrollView>

        {(!locationGranted || incognito) && (
          <View style={styles.invisibleBanner}>
            <Ionicons name={incognito ? 'glasses-outline' : 'location-outline'} size={14} color="#BFA2FF" />
            <Text style={styles.invisibleText}>{t('map.invisible')}</Text>
            {incognito ? (
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onDisableIncognito?.();
                }}
                style={styles.offBadge}
                activeOpacity={0.85}
              >
                <Text style={styles.offBadgeText}>{t('common.off')}</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.offBadge}>
                <Text style={styles.offBadgeText}>{t('common.off')}</Text>
              </View>
            )}
          </View>
        )}

      </View>

      {/* ── Right zoom / locate controls ── */}
      <View style={styles.rightControls}>
        <TouchableOpacity
          onPress={() => cameraRef.current?.zoomTo(
            Math.min((DEFAULT_ZOOM + 1), 20), 300
          )}
          style={styles.zoomBtn}
        >
          <Ionicons name="add" size={20} color={Colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => cameraRef.current?.zoomTo(
            Math.max((DEFAULT_ZOOM - 1), 1), 300
          )}
          style={styles.zoomBtn}
        >
          <Ionicons name="remove" size={20} color={Colors.primary} />
        </TouchableOpacity>
        <MapLocateButton
          onPress={recenter}
          accent={themeUi.accent}
          glowColor={themeUi.locateGlow}
        />
      </View>

      <View style={styles.weatherWrap} pointerEvents="none">
        <View style={[styles.weatherCard, { backgroundColor: themeUi.searchBg }]}>
          <Ionicons name="partly-sunny-outline" size={16} color={mapTheme === 'purple' ? Colors.primary : '#D4A020'} />
          <Text style={styles.weatherTemp}>28°</Text>
        </View>
        <View style={[styles.weatherSub, { backgroundColor: themeUi.chipInactiveBg, borderColor: themeUi.chipInactiveBorder }]}>
          <Text style={styles.weatherSubText}>{t('map.weatherNice')}</Text>
        </View>
      </View>

      {/* ── Bottom friend chips ── */}
      <View style={styles.chipWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {friendPins.map(f => (
            <TouchableOpacity
              key={f.id}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onFriendTap(f);
              }}
              style={styles.chip}
            >
              <View style={[styles.chipAvatar, { backgroundColor: f.color }]}>
                {f.avatarUrl ? (
                  <Image source={{ uri: f.avatarUrl }} style={styles.chipAvatarImg} />
                ) : (
                  <Text style={styles.chipEmoji}>{f.emoji}</Text>
                )}
              </View>
              <View>
                <Text style={styles.chipName}>{f.name}</Text>
                <Text style={styles.chipDist}>{f.distance}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── Place detail sheet ── */}
      {selectedPlace && (
        <PlaceSheet
          placeId={selectedPlace.placeId}
          placeName={selectedPlace.name}
          onClose={() => setSelectedPlace(null)}
          onPostTap={post => {
            setSelectedPlace(null);
            setSelectedPost(recentPostToPostView(post));
          }}
        />
      )}

      {/* ── Post detail sheet ── */}
      {selectedPost && (
        <PostSheet
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
        />
      )}

      {/* ── Friend detail sheet ── */}
      {selectedFriend && (
        <FriendSheet
          friend={selectedFriend}
          onClose={onCloseSheet}
          onMessage={(f) => { onCloseSheet(); onMessage(f); }}
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8FF',
    overflow: 'hidden',
  },
  map: {
    ...StyleSheet.absoluteFill,
  },

  // ── Friend pins ──
  pin: {
    alignItems: 'center',
  },
  pinAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.white,
  },
  pinEmoji: {
    fontSize: 22,
  },
  pinAvatarImg: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  pinActiveDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  pinNameTag: {
    marginTop: 4,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    ...Shadows.soft,
  },
  pinName: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textDark,
  },

  // ── Post pins ──
  postPin: {
    alignItems: 'center',
  },
  postThumbWrap: {
    width: 52,
    height: 52,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: Colors.white,
    overflow: 'hidden',
    backgroundColor: Colors.primaryTint,
  },
  postThumb: {
    width: '100%',
    height: '100%',
  },
  postThumbFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primaryTint,
  },
  postNameTag: {
    marginTop: 4,
    maxWidth: 72,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    ...Shadows.soft,
  },
  postName: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textDark,
    textAlign: 'center',
  },

  // ── Search pin ──
  searchPin: {
    alignItems: 'center',
  },
  searchPinBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: Colors.white,
    ...Shadows.glow,
  },
  searchPinTip: {
    width: 0,
    height: 0,
    marginTop: -1,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 9,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: Colors.primary,
  },

  // ── Place pins ──
  placePin: {
    alignItems: 'center',
    maxWidth: 110,
  },
  placePinBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: Colors.white,
    ...Shadows.glow,
  },
  placePinInner: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  placePinImg: {
    width: '100%',
    height: '100%',
  },
  placePinTip: {
    width: 0,
    height: 0,
    marginTop: -1,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 9,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: Colors.primary,
  },
  placeChip: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: 108,
    backgroundColor: 'rgba(255,255,255,0.96)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primarySoft,
    ...Shadows.soft,
  },
  placeChipName: {
    flexShrink: 1,
    fontSize: 9,
    fontWeight: '800',
    color: Colors.textDark,
  },
  placeRatingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: Colors.primaryTint,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 8,
  },
  placeRatingText: {
    fontSize: 8,
    fontWeight: '800',
    color: Colors.textMid,
  },

  // ── Ghost / incognito pin ──
  ghostPin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Overlay UI ──
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 52,
    paddingHorizontal: 16,
    gap: 10,
    zIndex: 2,
  },
  filterRow: {
    gap: 8,
    paddingRight: 8,
  },
  filterChipActive: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    ...Shadows.glow,
  },
  filterChipActiveText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.white,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMid,
  },
  searchBlock: {
    gap: 0,
    zIndex: 20,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
    ...Shadows.soft,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.textDark,
  },
  mapBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    overflow: 'hidden',
    ...Shadows.float,
  },
  mapBtnGrad: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  invisibleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(42,23,88,0.85)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  invisibleText: {
    flex: 1,
    color: Colors.white,
    fontSize: 12,
    fontWeight: '500',
  },
  offBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  offBadgeText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  rightControls: {
    position: 'absolute',
    right: 16,
    bottom: 160,
    gap: 8,
    zIndex: 2,
  },
  zoomBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.float,
  },
  locateBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'transparent',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  locateGrad: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.white,
  },
  weatherWrap: {
    position: 'absolute',
    left: 16,
    bottom: 158,
    gap: 8,
    zIndex: 2,
  },
  weatherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
    ...Shadows.soft,
  },
  weatherTemp: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textDark,
  },
  weatherSub: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
  },
  weatherSubText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMid,
  },
  chipWrap: {
    position: 'absolute',
    bottom: 110,
    left: 0,
    right: 0,
    zIndex: 2,
  },
  chips: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 8,
    ...Shadows.soft,
  },
  chipAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipEmoji: {
    fontSize: 14,
  },
  chipAvatarImg: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  chipName: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textDark,
  },
  chipDist: {
    fontSize: 10,
    color: Colors.textMuted,
  },
});
