import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Dimensions, Image, DeviceEventEmitter,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Mapbox, { Camera, HeatmapLayer, MapView, MarkerView, ShapeSource, UserLocation } from '@rnmapbox/maps';
import * as Location from 'expo-location';
import { Colors, Gradients, Shadows } from '../constants/colors';
import { useI18n } from '../i18n';
import type { Friend } from '../constants/data';
import FriendSheet from '../components/FriendSheet';
import PostSheet from '../components/PostSheet';
import PlaceSheet from '../components/PlaceSheet';
import { toPostView, normalizeNearbyPost, type HeatmapPoint, type NearbyPost, type PostView } from '../services/postApi';
import { loadMapNearbyPosts } from '../utils/loadMapNearbyPosts';
import { loadMapHeatPoints } from '../utils/loadMapHeatPoints';
import { separatePostsFrom3DPlaces, spreadOverlappingMarkers } from '../utils/mapMarkerSpread';
import { removeMapNearbyPost, upsertMapNearbyPost } from '../utils/mapRealtime';
import { isPremiumActive, syncPremiumPlanFromServer } from '../utils/premiumStorage';
import { postVisibleAtZoom } from '../utils/mapPostZoom';
import { onMapPostCreated, onMapPostDeleted, updateMapArea } from '../services/mapHub';
import { getNearbyPlaces, getPlacePromotions, recentPostToPostView, type PlaceSummary } from '../services/placeApi';
import { useRecordMapImpressions } from '../hooks/useRecordMapImpressions';
import { getFriendsLocations } from '../services/friendsApi';
import { hideUserLocation, updateUserLocation } from '../services/userApi';
import { friendLocationToMapPin, type MapFriendPin } from '../utils/mapFriendUtils';
import { getMymoMapStyle, MAP_THEME_UI, mapThemeLabel, nextMapTheme, type MapTheme } from '../utils/mapStyles';
import MapAtmosphere from '../components/MapAtmosphere';
import MapWeather from '../components/MapWeather';
import MapLocateButton from '../components/MapLocateButton';
import MapSearchDropdown from '../components/MapSearchDropdown';
import { useMapGeocodeSearch } from '../hooks/useMapGeocodeSearch';
import {
  MAPBOX_ACCESS_TOKEN,
  MAP_3D_MODEL_MIN_ZOOM,
  MAP_BUSINESS_MIN_ZOOM,
  MAP_DETAIL_MIN_ZOOM,
  MAP_FRESH_POST_MIN_ZOOM,
  MAP_POST_MIN_ZOOM,
  MAP_VIBE_OVERVIEW_ZOOM,
  shownMapZoom,
} from '../constants/mapbox';
import { vibeById, type VibeId } from '../constants/vibes';
import { avatarUri } from '../constants/defaultAvatar';
import { isMapImage, mapCharacterEmoji } from '../constants/mapCharacters';
import { getUserProfile } from '../services/userApi';
import { hasActivePremium } from '../utils/premiumStorage';
import type { MapGeocodeResult } from '../services/mapGeocodingApi';
import * as Haptics from 'expo-haptics';
import { getStoredAuthSession, getAuthUserId } from '../services/authApi';
import { getUserProfile } from '../services/userApi';
import { dedupeMapPlaces } from '../utils/dedupeMapPlaces';
import { placesForMarkerPaint, sortPlacesByPromotion } from '../utils/mapPlacePromotion';
import {
  HEATMAP_LAYER_ID,
  HEATMAP_SOURCE_ID,
  NATIVE_HEATMAP_STYLE,
  buildHeatGeoJSON,
} from '../utils/mapHeatmap';

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
  onViewProfile?: (f: Friend) => void;
  vibeId?: VibeId | null;
  onClearVibe?: () => void;
  onChooseVibe?: () => void;
}

type MapContentFilter = 'all' | 'friends' | 'events';

// ─── Default center: Tòa S1.07, Vinhomes Grand Park, Quận 9 ──────────────────
const DEFAULT_CENTER: [number, number] = [106.8376, 10.8382];
const DEFAULT_ZOOM = 14.5;

export default function MapScreen({
  locationGranted, visibleOnMap, incognito, isActive = true,
  onFriendTap, selectedFriend, onCloseSheet, onMessage, onDisableIncognito, onViewProfile,
  vibeId = null, onClearVibe, onChooseVibe,
}: MapScreenProps) {
  const { t } = useI18n();
  const [searchText, setSearchText] = useState('');
  const [mapTheme, setMapTheme] = useState<MapTheme>('purple');
  const mapStyle = React.useMemo(() => getMymoMapStyle(mapTheme), [mapTheme]);
  const themeUi = MAP_THEME_UI[mapTheme];
  const mapFilters = [
    { id: 'all', label: t('map.filterAll') },
    { id: 'friends', label: t('map.filterFriends') },
    { id: 'events', label: t('map.filterEvents') },
    { id: 'vibe', label: t('map.filterVibe') },
  ] as const;
  const [contentFilter, setContentFilter] = useState<MapContentFilter>('all');
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [myMapMarker, setMyMapMarker] = useState<string | null>(null);
  const userCoordsRef = useRef(userCoords);
  userCoordsRef.current = userCoords;
  // ~110m grid — avoid refetch storms on every GPS tick
  const coordsBucket = userCoords
    ? `${userCoords.lat.toFixed(3)},${userCoords.lng.toFixed(3)}`
    : 'none';
  const [nearbyPosts, setNearbyPosts] = useState<NearbyPost[]>([]);
  const [heatPoints, setHeatPoints] = useState<HeatmapPoint[]>([]);
  const [nearbyPlaces, setNearbyPlaces] = useState<PlaceSummary[]>([]);
  const [selectedPost, setSelectedPost] = useState<PostView | null>(null);
  const [selectedPostIsOwn, setSelectedPostIsOwn] = useState(false);
  const [myUserId, setMyUserId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [profile, premium] = await Promise.all([getUserProfile(), hasActivePremium()]);
        setMyMapMarker(premium ? (profile.mapMarker ?? null) : null);
      } catch {
        setMyMapMarker(null);
      }
    })();
    const sub = DeviceEventEmitter.addListener('map-marker:updated', (marker: string | null) => {
      setMyMapMarker(marker);
    });
    return () => sub.remove();
  }, []);
  const [selectedPlace, setSelectedPlace] = useState<PlaceSummary | null>(null);
  const [friendPins, setFriendPins] = useState<MapFriendPin[]>([]);
  const [eventPlaceIds, setEventPlaceIds] = useState<Set<string>>(new Set());
  const [searchPin, setSearchPin] = useState<MapGeocodeResult | null>(null);
  const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM);
  const [postClock, setPostClock] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setPostClock(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  const cameraRef = useRef<Camera>(null);
  const hasCenteredOnUserRef = useRef(false);
  const hasCenteredOnOwnedPlaceRef = useRef(false);

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

  useEffect(() => {
    getStoredAuthSession()
      .then(session => setMyUserId(getAuthUserId(session)))
      .catch(() => setMyUserId(null));

    getUserProfile()
      .then(profile => setMyUserId(profile.id || null))
      .catch(() => {});
  }, []);

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

  // ── Share own location with server (null = hide from friends' maps) ──────
  useEffect(() => {
    if (!visibleOnMap) {
      void hideUserLocation().catch(() => {});
      return;
    }
    if (!userCoords) return;
    void updateUserLocation(userCoords.lat, userCoords.lng).catch(() => {});
  }, [visibleOnMap, userCoords?.lat, userCoords?.lng]);

  // ── Fetch friend locations ───────────────────────────────────────────────
  const fetchFriendLocations = useCallback(async () => {
    const lat = userCoordsRef.current?.lat;
    const lng = userCoordsRef.current?.lng;
    try {
      const locations = await getFriendsLocations();
      setFriendPins(locations.map(loc => friendLocationToMapPin(loc, lat, lng)));
    } catch {
      setFriendPins([]);
    }
  }, []);

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
    const lat = userCoordsRef.current?.lat ?? DEFAULT_CENTER[1];
    const lng = userCoordsRef.current?.lng ?? DEFAULT_CENTER[0];
    try {
      const posts = await loadMapNearbyPosts(lat, lng);
      setNearbyPosts(posts);
    } catch {
      setNearbyPosts([]);
    }
  }, []);

  const fetchHeatPoints = useCallback(async () => {
    const lat = userCoordsRef.current?.lat ?? DEFAULT_CENTER[1];
    const lng = userCoordsRef.current?.lng ?? DEFAULT_CENTER[0];
    try {
      const points = await loadMapHeatPoints(lat, lng);
      setHeatPoints(points);
    } catch {
      setHeatPoints([]);
    }
  }, []);

  const fetchNearbyPlaces = useCallback(async () => {
    const lat = userCoordsRef.current?.lat ?? DEFAULT_CENTER[1];
    const lng = userCoordsRef.current?.lng ?? DEFAULT_CENTER[0];
    try {
      const places = await getNearbyPlaces(lat, lng, vibeId ? 40 : 20, vibeId ?? undefined);
      setNearbyPlaces(places);
    } catch {
      setNearbyPlaces([]);
    }
  }, [vibeId]);

  useEffect(() => {
    if (!isActive) return;
    fetchNearbyPosts();
    fetchHeatPoints();
    fetchNearbyPlaces();
    const subCreated = DeviceEventEmitter.addListener('post:created', () => {
      fetchNearbyPosts();
      fetchHeatPoints();
      fetchNearbyPlaces();
    });
    const subDeleted = DeviceEventEmitter.addListener('post:deleted', () => {
      fetchNearbyPosts();
      fetchHeatPoints();
      fetchNearbyPlaces();
    });
    return () => {
      subCreated.remove();
      subDeleted.remove();
    };
  }, [isActive, coordsBucket, fetchNearbyPosts, fetchHeatPoints, fetchNearbyPlaces]);

  useEffect(() => {
    if (!isActive) return;

    const lat = userCoordsRef.current?.lat ?? DEFAULT_CENTER[1];
    const lng = userCoordsRef.current?.lng ?? DEFAULT_CENTER[0];

    let cancelled = false;
    void updateMapArea(lat, lng).catch(() => {});

    const unsubCreated = onMapPostCreated(raw => {
      if (cancelled) return;
      const post = normalizeNearbyPost(raw);
      if (!post) return;
      setNearbyPosts(prev => upsertMapNearbyPost(prev, post));
    });

    const unsubDeleted = onMapPostDeleted(({ postId }) => {
      if (cancelled) return;
      setNearbyPosts(prev => removeMapNearbyPost(prev, postId));
    });

    return () => {
      cancelled = true;
      unsubCreated();
      unsubDeleted();
    };
  }, [isActive, coordsBucket]);

  useEffect(() => {
    if (contentFilter !== 'events') return;
    let cancelled = false;
    void Promise.all(nearbyPlaces.map(async place => {
      const promotions = await getPlacePromotions(place.placeId);
      const hasEvent = promotions.some(promotion =>
        promotion.status === 'Active' || promotion.status === 'Upcoming');
      return hasEvent ? place.placeId : null;
    })).then(ids => {
      if (!cancelled) setEventPlaceIds(new Set(ids.filter((id): id is string => !!id)));
    });
    return () => { cancelled = true; };
  }, [contentFilter, nearbyPlaces]);

  useEffect(() => {
    if (!vibeId) return;
    setContentFilter('all');
  }, [vibeId]);

  const searchLower = searchText.trim().toLowerCase();
  const friendIds = useMemo(
    () => new Set(friendPins.map(friend => friend.id.toLowerCase())),
    [friendPins],
  );
  const postsForFilter = contentFilter === 'friends'
    ? nearbyPosts.filter(post => friendIds.has(post.userId.toLowerCase()))
    : contentFilter === 'events'
      ? []
      : nearbyPosts;
  const filteredPosts = searchLower
    ? postsForFilter.filter(p =>
        p.displayName.toLowerCase().includes(searchLower) ||
        (p.caption || '').toLowerCase().includes(searchLower))
    : postsForFilter;
  const filteredPlaces = useMemo(
    () => {
      const contentPlaces = contentFilter === 'events'
          ? nearbyPlaces.filter(place => eventPlaceIds.has(place.placeId))
          : nearbyPlaces;
      const vibePlaces = vibeId
        ? contentPlaces.filter(place => place.vibes.includes(vibeId))
        : contentPlaces;
      const searchedPlaces = searchLower
        ? vibePlaces.filter(p =>
            p.name.toLowerCase().includes(searchLower) ||
            (p.address || '').toLowerCase().includes(searchLower) ||
            (p.city || '').toLowerCase().includes(searchLower))
        : vibePlaces;
      return sortPlacesByPromotion(dedupeMapPlaces(searchedPlaces));
    },
    [nearbyPlaces, vibeId, searchLower, contentFilter, eventPlaceIds],
  );
  const visibleFriendPins = useMemo(
    () => contentFilter === 'events' ? [] : friendPins,
    [contentFilter, friendPins],
  );

  const mapCenter: [number, number] = userCoords
    ? [userCoords.lng, userCoords.lat]
    : DEFAULT_CENTER;

  const shownZoom = shownMapZoom(mapZoom);
  const showDetailPins = shownZoom >= MAP_DETAIL_MIN_ZOOM;
  const showBusinessPins = shownZoom >= MAP_BUSINESS_MIN_ZOOM;
  const show3DModels = shownZoom >= MAP_3D_MODEL_MIN_ZOOM;
  const visiblePlaces = useMemo(
    () => filteredPlaces.filter(place =>
      place.isOwnedByCurrentUser || showBusinessPins),
    [filteredPlaces, showBusinessPins],
  );
  useRecordMapImpressions(visiblePlaces, isActive);
  const showFreshPosts = shownZoom >= MAP_FRESH_POST_MIN_ZOOM;
  const showPosts = shownZoom >= MAP_POST_MIN_ZOOM;

  const visiblePosts = useMemo(
    () => filteredPosts.filter(post => postVisibleAtZoom(post, shownZoom, postClock)),
    [filteredPosts, shownZoom, postClock],
  );

  const spreadMapPosts = useMemo(
    () => spreadOverlappingMarkers(visiblePosts),
    [visiblePosts],
  );
  const heatGeoJSON = useMemo(
    () => buildHeatGeoJSON(heatPoints),
    [heatPoints],
  );

  const displayedMapPosts = useMemo(
    () => separatePostsFrom3DPlaces(
      spreadMapPosts,
      show3DModels ? visiblePlaces : [],
    ),
    [spreadMapPosts, visiblePlaces, show3DModels],
  );

  useEffect(() => {
    if (showDetailPins) return;
    setSelectedPlace(null);
  }, [showDetailPins]);

  useEffect(() => {
    if (!selectedPost) return;
    if (visiblePosts.some(post => post.postId === selectedPost.postId)) return;
    setSelectedPost(null);
    setSelectedPostIsOwn(false);
  }, [visiblePosts, selectedPost]);

  // ── Default: always center on my location when opening the map ───────────
  useEffect(() => {
    if (!isActive) {
      hasCenteredOnUserRef.current = false;
      hasCenteredOnOwnedPlaceRef.current = false;
      return;
    }
    if (vibeId || !userCoords || !cameraRef.current || hasCenteredOnUserRef.current) return;
    hasCenteredOnUserRef.current = true;
    cameraRef.current.flyTo([userCoords.lng, userCoords.lat], 800);
    cameraRef.current.zoomTo(DEFAULT_ZOOM, 800);
  }, [isActive, userCoords, vibeId]);

  // Keep a business owner's venue centered when entering the map so its
  // house remains visible while the user zooms in past the 9.5 threshold.
  useEffect(() => {
    if (!isActive || vibeId || !cameraRef.current || hasCenteredOnOwnedPlaceRef.current) return;
    const ownedPlace = visiblePlaces.find(place => place.isOwnedByCurrentUser);
    if (!ownedPlace) return;
    hasCenteredOnOwnedPlaceRef.current = true;
    hasCenteredOnUserRef.current = true;
    cameraRef.current.flyTo([ownedPlace.longitude, ownedPlace.latitude], 900);
    cameraRef.current.zoomTo(Math.max(mapZoom, DEFAULT_ZOOM), 900);
  }, [isActive, vibeId, visiblePlaces, mapZoom]);

  const flownVibeRef = useRef<string | null>(null);
  useEffect(() => {
    if (!vibeId) {
      flownVibeRef.current = null;
      return;
    }
    if (!isActive || !cameraRef.current || flownVibeRef.current === vibeId) return;
    const match = visiblePlaces[0] ?? filteredPlaces[0];
    if (!match) return;
    flownVibeRef.current = vibeId;
    cameraRef.current.flyTo([match.longitude, match.latitude], 900);
    cameraRef.current.zoomTo(MAP_VIBE_OVERVIEW_ZOOM, 900);
  }, [vibeId, isActive, filteredPlaces, visiblePlaces]);

  // ── Fly to selected friend ───────────────────────────────────────────────
  useEffect(() => {
    if (!selectedFriend || !cameraRef.current) return;
    const friend = visibleFriendPins.find(f => f.id === selectedFriend.id);
    if (friend) {
      cameraRef.current.flyTo([friend.lng, friend.lat], 800);
      cameraRef.current.zoomTo(15, 800);
    }
  }, [selectedFriend, visibleFriendPins]);

  const recenter = useCallback(() => {
    cameraRef.current?.flyTo(mapCenter, 800);
    cameraRef.current?.zoomTo(DEFAULT_ZOOM, 800);
    fetchNearbyPosts();
    fetchHeatPoints();
    fetchNearbyPlaces();
    Toast.show({ type: 'success', text1: t('map.centered') });
  }, [t, mapCenter, fetchNearbyPosts, fetchHeatPoints, fetchNearbyPlaces, fetchFriendLocations]);

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
        style={styles.map}
        styleJSON={mapStyle}
        logoEnabled={false}
        attributionEnabled={false}
        compassEnabled={false}
        scaleBarEnabled={false}
        onCameraChanged={state => {
          const zoom = state.properties.zoom;
          if (typeof zoom === 'number' && !Number.isNaN(zoom)) {
            const next = shownMapZoom(zoom);
            setMapZoom(prev => (prev === next ? prev : next));
          }
        }}
      >
        <Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: mapCenter,
            zoomLevel: DEFAULT_ZOOM,
          }}
        />

        {showHeatmap ? (
          <ShapeSource id={HEATMAP_SOURCE_ID} shape={heatGeoJSON}>
            <HeatmapLayer
              id={HEATMAP_LAYER_ID}
              sourceID={HEATMAP_SOURCE_ID}
              style={NATIVE_HEATMAP_STYLE as any}
            />
          </ShapeSource>
        ) : null}

        {visibleOnMap && userCoords && (isMapImage(myMapMarker) || mapCharacterEmoji(myMapMarker)) ? (
          <MarkerView
            key="self-marker"
            coordinate={[userCoords.lng, userCoords.lat]}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.selfPin}>
              {mapCharacterEmoji(myMapMarker) ? (
                <Text style={styles.pinEmoji}>{mapCharacterEmoji(myMapMarker)}</Text>
              ) : (
                <Image source={{ uri: myMapMarker! }} style={styles.pinAvatarImg} />
              )}
            </View>
          </MarkerView>
        ) : null}

        {/* User location dot */}
        {visibleOnMap && !(isMapImage(myMapMarker) || mapCharacterEmoji(myMapMarker)) && (
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

        {/* Nearby place pins — only when zoomed in */}
        {placesForMarkerPaint(visiblePlaces).map(place => (
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
              style={[
                styles.placePin,
                place.isOwnedByCurrentUser && styles.placePinMine,
                place.adPackageId === 'featured_venue' && styles.placePinFeatured,
              ]}
              activeOpacity={0.88}
            >
              {place.vibes.length > 0 ? (
                <View style={styles.placeModelVibes}>
                  {place.vibes.slice(0, 3).map(placeVibeId => (
                    <View key={placeVibeId} style={styles.placeModelVibeBadge}>
                      <Text style={styles.placeModelVibeEmoji}>
                        {vibeById(placeVibeId)?.emoji ?? '✨'}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
              {place.adPackageId === 'featured_venue' ? (
                <>
                  <LinearGradient
                    colors={['#F6C445', '#E39B1A']}
                    style={styles.placePinBubble}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View style={styles.placePinInner}>
                      <Ionicons name="star" size={16} color="#E39B1A" />
                    </View>
                  </LinearGradient>
                  <View style={[styles.placePinTip, styles.placePinTipFeatured]} />
                </>
              ) : place.model3DUrl && show3DModels ? (
                <>
                  <LinearGradient
                    colors={Gradients.primary}
                    style={styles.placePinBubble}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View style={styles.placePinInner}>
                    <Text style={styles.placeModelEmoji}>🏠</Text>
                    </View>
                  </LinearGradient>
                  <View style={styles.placePinTip} />
                </>
              ) : null}
              <View style={[
                styles.placeChip,
                place.model3DUrl && show3DModels && styles.placeChipModel,
                place.adPackageId === 'featured_venue' && styles.placeChipFeatured,
                place.adPackageId && place.adPackageId !== 'featured_venue' && styles.placeChipSponsored,
              ]}>
                <Text style={styles.placeChipName} numberOfLines={1}>{place.name}</Text>
                {place.isOwnedByCurrentUser ? (
                  <Text style={styles.placeMineText}>QUÁN CỦA BẠN</Text>
                ) : null}
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
        {displayedMapPosts.map(({ post, latitude, longitude, markerOffsetX = 0, markerOffsetY = 0 }) => (
          <MarkerView
            key={`post-${post.postId}`}
            coordinate={[longitude, latitude]}
            anchor={{ x: 0.5, y: 1 }}
          >
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedPlace(null);
                setSelectedPostIsOwn(
                  Boolean(myUserId && post.userId && myUserId.toLowerCase() === post.userId.toLowerCase()),
                );
                setSelectedPost(toPostView(post));
              }}
              style={[
                styles.postPin,
                (markerOffsetX !== 0 || markerOffsetY !== 0) && {
                  transform: [
                    { translateX: markerOffsetX },
                    { translateY: markerOffsetY },
                  ],
                },
              ]}
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
                <Text style={styles.postName} numberOfLines={1}>
                  {post.authorIsPremium && !post.isAnonymous ? '💎 ' : ''}{post.displayName}
                </Text>
              </View>
            </TouchableOpacity>
          </MarkerView>
        ))}

        {/* Friend pins */}
        {visibleFriendPins.map(f => (
          <MarkerView
            key={`friend-${f.id}`}
            coordinate={[f.lng, f.lat]}
            anchor={{ x: 0.5, y: 1 }}
          >
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                if (onViewProfile) onViewProfile(f);
                else onFriendTap(f);
              }}
              style={styles.pin}
            >
              <View style={[styles.pinAvatar, { backgroundColor: f.color }, Shadows.glow as any]}>
                {mapCharacterEmoji(f.mapMarker) ? (
                  <Text style={styles.pinEmoji}>{mapCharacterEmoji(f.mapMarker)}</Text>
                ) : (
                  <Image
                    source={{ uri: isMapImage(f.mapMarker) ? f.mapMarker! : avatarUri(f.avatarUrl) }}
                    style={styles.pinAvatarImg}
                  />
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
      <MapWeather
        lat={userCoords?.lat ?? DEFAULT_CENTER[1]}
        lng={userCoords?.lng ?? DEFAULT_CENTER[0]}
        cardBg={themeUi.searchBg}
        chipBg={themeUi.chipInactiveBg}
        chipBorder={themeUi.chipInactiveBorder}
        iconColor={themeUi.weatherIcon}
      />

      {/* ── Search bar + controls overlay ── */}
      <View style={styles.topBar} pointerEvents="box-none">
        <View style={styles.searchBlock} pointerEvents="auto">
          <View style={styles.searchRow}>
            <View style={[styles.searchBox, { backgroundColor: themeUi.searchBg }]}>
              <Ionicons name="search-outline" size={16} color={themeUi.icon} />
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
                void (async () => {
                  const nextTheme = nextMapTheme(mapTheme);
                  if (nextTheme !== 'purple') {
                    const plan = await syncPremiumPlanFromServer();
                    if (!isPremiumActive(plan)) {
                      Toast.show({ type: 'info', text1: t('premium.benefitLocked') });
                      if (mapTheme !== 'purple') setMapTheme('purple');
                      return;
                    }
                  }
                  setMapTheme(nextTheme);
                  Toast.show({
                    type: 'success',
                    text1: mapThemeLabel(nextTheme),
                  });
                })();
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

        {vibeId ? (
          <View style={styles.vibeBanner}>
            <View style={styles.vibeBannerRow}>
              <Text style={styles.vibeBannerText}>
                {vibeById(vibeId)?.emoji} {t('map.vibeFilter').replace('{name}', vibeById(vibeId)?.name ?? vibeId)}
                {filteredPlaces.length > 0 ? ` · ${filteredPlaces.length}` : ''}
              </Text>
              <TouchableOpacity onPress={onClearVibe} activeOpacity={0.85}>
                <Text style={styles.vibeBannerClear}>{t('map.vibeClear')}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.vibeBannerEmpty}>
              {filteredPlaces[0]
                ? t('home.mymyPick')
                  .replace('{name}', filteredPlaces[0].name)
                  .replace('{vibes}', filteredPlaces[0].vibes.map(id => vibeById(id)?.name).filter(Boolean).join(', '))
                : t('map.vibeEmpty')}
            </Text>
          </View>
        ) : null}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          pointerEvents="auto"
        >
          {mapFilters.map(chip => {
            const active = chip.id !== 'vibe' && contentFilter === chip.id;
            return (
              <TouchableOpacity
                key={chip.id}
                activeOpacity={0.85}
                onPress={() => {
                  if (chip.id === 'vibe') {
                    onChooseVibe?.();
                    return;
                  }
                  setContentFilter(chip.id);
                  setSelectedPost(null);
                  setSelectedPlace(null);
                  onCloseSheet();
                }}
              >
                {active ? (
                  <LinearGradient
                    colors={[...themeUi.chipActive]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.filterChipActive}
                  >
                    <Text style={styles.filterChipActiveText}>
                      {chip.label}{chip.id === 'all' ? ' ✨' : ''}
                    </Text>
                  </LinearGradient>
                ) : (
                  <View
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
                )}
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setShowHeatmap(on => !on)}
          >
            {showHeatmap ? (
              <LinearGradient
                colors={[...themeUi.chipActive]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.filterChipActive}
              >
                <Text style={styles.filterChipActiveText}>{t('map.filterHeat')} 🔥</Text>
              </LinearGradient>
            ) : (
              <View
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: themeUi.chipInactiveBg,
                    borderColor: themeUi.chipInactiveBorder,
                  },
                ]}
              >
                <Text style={styles.filterChipText}>{t('map.filterHeat')}</Text>
              </View>
            )}
          </TouchableOpacity>
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
        <View style={styles.zoomBadge}>
          <Text style={styles.zoomBadgeValue}>{shownZoom.toFixed(1)}</Text>
          <Text style={styles.zoomBadgeHint} numberOfLines={1}>
            {showPosts
              ? t('map.zoomPostsOn')
              : showFreshPosts
                ? t('map.zoomFreshPosts')
                : t('map.zoomFriendsOnly')}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => cameraRef.current?.zoomTo(Math.min(mapZoom + 1, 22), 300)}
          style={styles.zoomBtn}
        >
          <Ionicons name="add" size={20} color={Colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => cameraRef.current?.zoomTo(Math.max(mapZoom - 1, 2), 300)}
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

      {/* ── Bottom friend chips ── */}
      <View style={styles.chipWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {visibleFriendPins.map(f => (
            <View key={f.id} style={styles.chip}>
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  if (onViewProfile) onViewProfile(f);
                  else onFriendTap(f);
                }}
                style={styles.chipPerson}
                activeOpacity={0.75}
              >
                <View style={[styles.chipAvatar, { backgroundColor: f.color }]}>
                  <Image source={{ uri: avatarUri(f.avatarUrl) }} style={styles.chipAvatarImg} />
                </View>
                <Text style={styles.chipName}>{f.name}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onFriendTap(f);
                }}
                activeOpacity={0.75}
              >
                <Text style={styles.chipDist}>{f.distance}</Text>
              </TouchableOpacity>
            </View>
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
          isOwnPost={selectedPostIsOwn}
          onClose={() => {
            setSelectedPost(null);
            setSelectedPostIsOwn(false);
          }}
        />
      )}

      {/* ── Friend detail sheet ── */}
      {selectedFriend && (
        <FriendSheet
          friend={visibleFriendPins.find(f => f.id === selectedFriend.id) ?? selectedFriend}
          onClose={onCloseSheet}
          onMessage={(f) => { onCloseSheet(); onMessage(f); }}
          onViewProfile={onViewProfile ? (f) => { onCloseSheet(); onViewProfile(f); } : undefined}
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9FF',
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
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  selfPin: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    borderWidth: 3,
    borderColor: '#F472B6',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
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
  placePinMine: {
    transform: [{ scale: 1.15 }],
    zIndex: 9,
  },
  placePinFeatured: {
    zIndex: 24,
  },
  placePinTipFeatured: {
    borderTopColor: '#E39B1A',
  },
  placeChipFeatured: {
    borderColor: '#F6C445',
  },
  placeChipSponsored: {
    borderColor: '#E39BDE',
  },
  placeModelVibes: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    marginBottom: -4,
    zIndex: 2,
  },
  placeModelVibeBadge: {
    width: 27,
    height: 27,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderWidth: 2,
    borderColor: '#F2DAF0',
    ...Shadows.soft,
  },
  placeModelVibeEmoji: {
    fontSize: 14,
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
  placeChipModel: {
    position: 'absolute',
    top: '100%',
    marginTop: 2,
  },
  placeChipName: {
    flexShrink: 1,
    fontSize: 9,
    fontWeight: '800',
    color: Colors.textDark,
  },
  placeMineText: {
    fontSize: 7,
    fontWeight: '900',
    color: '#DA70D6',
    backgroundColor: '#FBEAF9',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 6,
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
  placePinEmoji: { fontSize: 16 },
  placeModelEmoji: { fontSize: 25 },
  vibeBanner: {
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#F3D4F1',
  },
  vibeBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  vibeBannerText: {
    flex: 1,
    color: '#4F2852',
    fontFamily: 'Nunito_700Bold',
    fontSize: 13,
  },
  vibeBannerEmpty: {
    color: '#8B7EAE',
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 12,
  },
  vibeBannerClear: {
    color: '#DA70D6',
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 12,
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
  zoomBadge: {
    width: 48,
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 6,
    ...Shadows.float,
  },
  zoomBadgeValue: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textDark,
    lineHeight: 16,
  },
  zoomBadgeHint: {
    marginTop: 1,
    fontSize: 8,
    fontWeight: '700',
    color: Colors.primary,
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
  chipPerson: {
    flexDirection: 'row',
    alignItems: 'center',
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
