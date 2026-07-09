import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Dimensions, Image, DeviceEventEmitter,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Mapbox, { Camera, MapView, MarkerView, UserLocation, BackgroundLayer, FillLayer } from '@rnmapbox/maps';
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
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';

Mapbox.setAccessToken('pk.eyJ1IjoiYm9uZHpwcm9ubzEiLCJhIjoiY21yMXExczYwMHMwejJwcHJ1b3NzY216bSJ9.YrjzCaT5z32W_kCTOwQOGw');

const { width: SW, height: SH } = Dimensions.get('window');

// ─── Custom Mapbox Style JSON — Purple MYMO palette ──────────────────────────
// ─── Custom Mapbox Style JSON Builder — Purple & Yellow MYMO palettes ───────
const getMymoMapStyle = (theme: 'purple' | 'yellow'): string => {
  const isPurple = theme === 'purple';
  const colors = isPurple ? {
    background: '#F5F0FF',
    landuse: '#EDE8FF',
    parks: '#D8CCFF',
    water: '#B8A9FF',
    waterStroke: '#9C87FF',
    building: '#DDD4FF',
    buildingOutline: '#C4B5FF',
    roadCase: '#C8BCFF',
    road: '#F0ECFF',
    roadMajor: '#FFFFFF',
    roadHighway: '#EDE8FF',
    roadLabel: '#7C5BFF',
    placeLabel: '#3A2470',
    haloColor: '#F6F2FF',
  } : {
    background: '#FAF6E6', // Sunny light yellow
    landuse: '#FAF6E6',
    parks: '#F5EDA3',      // Light yellow-green parks
    water: '#BDE3FF',      // Beautiful light blue water
    waterStroke: '#A1D4FF',
    building: '#FAF0CD',   // Light yellow buildings
    buildingOutline: '#E6DAB2',
    roadCase: '#EBE5CE',
    road: '#FFFDF5',
    roadMajor: '#FFFFFF',
    roadHighway: '#F5EECD',
    roadLabel: '#8C7D4E',
    placeLabel: '#544820',
    haloColor: '#FAF6E6',
  };

  const style = {
    version: 8,
    name: `MYMO ${theme}`,
    glyphs: 'mapbox://fonts/mapbox/{fontstack}/{range}',
    sprite: 'mapbox://sprites/mapbox/streets-v11',
    sources: {
      composite: {
        type: 'vector',
        url: 'mapbox://mapbox.mapbox-streets-v8,mapbox.mapbox-terrain-v2',
      },
    },
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': colors.background } },
      { id: 'landuse', type: 'fill', source: 'composite', 'source-layer': 'landuse',
        paint: { 'fill-color': colors.landuse, 'fill-opacity': 0.9 } },
      { id: 'landcover', type: 'fill', source: 'composite', 'source-layer': 'landcover',
        paint: { 'fill-color': colors.parks, 'fill-opacity': 0.7 } },
      { id: 'water', type: 'fill', source: 'composite', 'source-layer': 'water',
        paint: { 'fill-color': colors.water, 'fill-opacity': 0.85 } },
      { id: 'water-stroke', type: 'line', source: 'composite', 'source-layer': 'water',
        paint: { 'line-color': colors.waterStroke, 'line-width': 1.5, 'line-opacity': 0.6 } },
      { id: 'building', type: 'fill', source: 'composite', 'source-layer': 'building',
        paint: { 'fill-color': colors.building, 'fill-opacity': 0.75 } },
      { id: 'building-outline', type: 'line', source: 'composite', 'source-layer': 'building',
        paint: { 'line-color': colors.buildingOutline, 'line-width': 0.5 } },
      { id: 'road-case', type: 'line', source: 'composite', 'source-layer': 'road',
        filter: ['all', ['==', ['geometry-type'], 'LineString']],
        paint: { 'line-color': colors.roadCase, 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1, 16, 6], 'line-opacity': 0.6 } },
      { id: 'road', type: 'line', source: 'composite', 'source-layer': 'road',
        filter: ['all', ['==', ['geometry-type'], 'LineString']],
        paint: { 'line-color': colors.road, 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.8, 16, 5] } },
      { id: 'road-major', type: 'line', source: 'composite', 'source-layer': 'road',
        filter: ['in', 'class', 'primary', 'secondary', 'tertiary', 'trunk'],
        paint: { 'line-color': colors.roadMajor, 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1.5, 16, 8] } },
      { id: 'road-highway', type: 'line', source: 'composite', 'source-layer': 'road',
        filter: ['in', 'class', 'motorway', 'motorway_link'],
        paint: { 'line-color': colors.roadHighway, 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 2, 16, 10] } },
      { id: 'road-label', type: 'symbol', source: 'composite', 'source-layer': 'road',
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['DIN Pro Regular', 'Arial Unicode MS Regular'],
          'text-size': 10,
          'symbol-placement': 'line',
        },
        paint: { 'text-color': colors.roadLabel, 'text-halo-color': '#FFFFFF', 'text-halo-width': 2 } },
      { id: 'place-label', type: 'symbol', source: 'composite', 'source-layer': 'place_label',
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 8, 10, 14, 16],
        },
        paint: { 'text-color': colors.placeLabel, 'text-halo-color': colors.haloColor, 'text-halo-width': 2 } },
    ],
  };

  return JSON.stringify(style);
};

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
}

// ─── Default center: Tòa S1.07, Vinhomes Grand Park, Quận 9 ──────────────────
const DEFAULT_CENTER: [number, number] = [106.8376, 10.8382];
const DEFAULT_ZOOM = 17;

export default function MapScreen({
  locationGranted, visibleOnMap, incognito, isActive = true,
  onFriendTap, selectedFriend, onCloseSheet, onMessage,
}: MapScreenProps) {
  const { t } = useI18n();
  const [searchText, setSearchText] = useState('');
  const [mapTheme, setMapTheme] = useState<'purple' | 'yellow'>('purple');
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [nearbyPosts, setNearbyPosts] = useState<NearbyPost[]>([]);
  const [nearbyPlaces, setNearbyPlaces] = useState<PlaceSummary[]>([]);
  const [selectedPost, setSelectedPost] = useState<PostView | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<PlaceSummary | null>(null);
  const [friendPins, setFriendPins] = useState<MapFriendPin[]>([]);
  const cameraRef = useRef<Camera>(null);
  const hasFittedPostsRef = useRef(false);

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

  useEffect(() => {
    if (nearbyPosts.length === 0 || hasFittedPostsRef.current || !cameraRef.current) return;
    hasFittedPostsRef.current = true;
    const post = nearbyPosts[0];
    cameraRef.current.flyTo([post.longitude, post.latitude], 800);
    cameraRef.current.zoomTo(DEFAULT_ZOOM, 800);
  }, [nearbyPosts]);

  const mapCenter: [number, number] = userCoords
    ? [userCoords.lng, userCoords.lat]
    : DEFAULT_CENTER;

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

  return (
    <View style={styles.container}>
      {/* ── Real Mapbox Map ── */}
      <MapView
        style={styles.map}
        styleURL="mapbox://styles/mapbox/streets-v12"
        logoEnabled={false}
        attributionEnabled={false}
        compassEnabled={false}
        scaleBarEnabled={false}
      >
        {/* Dynamic theme style overrides */}
        <BackgroundLayer
          id="background"
          style={{
            backgroundColor: mapTheme === 'purple' ? '#F5F0FF' : '#FAF6E6',
          }}
        />
        <FillLayer
          id="landuse"
          existing
          style={{
            fillColor: mapTheme === 'purple' ? '#EDE8FF' : '#FAF6E6',
          }}
        />
        <FillLayer
          id="water"
          existing
          style={{
            fillColor: mapTheme === 'purple' ? '#C3B5FF' : '#BDE3FF',
          }}
        />
        <FillLayer
          id="building"
          existing
          style={{
            fillColor: mapTheme === 'purple' ? '#DDD4FF' : '#FAF0CD',
          }}
        />
        <Camera
          ref={cameraRef}
          centerCoordinate={mapCenter}
          zoomLevel={DEFAULT_ZOOM}
          animationMode="flyTo"
          animationDuration={0}
        />

        {/* User location dot */}
        {visibleOnMap && (
          <UserLocation
            visible
            renderMode={"normal" as any}
            androidRenderMode="compass"
          />
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

      {/* ── Search bar + controls overlay ── */}
      <View style={styles.topBar} pointerEvents="box-none">
        <View style={styles.searchRow} pointerEvents="auto">
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={16} color={Colors.primary} />
            <TextInput
              value={searchText}
              onChangeText={setSearchText}
              placeholder={t('map.search')}
              placeholderTextColor={Colors.textMuted}
              style={styles.searchInput}
            />
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
          >
            <Ionicons
              name={mapTheme === 'purple' ? 'color-palette-outline' : 'color-palette'}
              size={18}
              color={Colors.primary}
            />
          </TouchableOpacity>
        </View>

        {(!locationGranted || incognito) && (
          <View style={styles.invisibleBanner}>
            <Ionicons name={incognito ? 'glasses-outline' : 'location-outline'} size={14} color="#BFA2FF" />
            <Text style={styles.invisibleText}>{t('map.invisible')}</Text>
            <View style={styles.offBadge}><Text style={styles.offBadgeText}>{t('common.off')}</Text></View>
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
        <TouchableOpacity onPress={recenter} style={styles.zoomBtn}>
          <Ionicons name="locate-outline" size={20} color={Colors.primary} />
        </TouchableOpacity>
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
    backgroundColor: Colors.primaryTint,
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
    gap: 8,
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
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
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
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    ...Shadows.soft,
  },
  mapBtnActive: {},
  mapBtnGrad: {
    ...StyleSheet.absoluteFill,
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
  chipWrap: {
    position: 'absolute',
    bottom: 110,
    left: 0,
    right: 0,
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
