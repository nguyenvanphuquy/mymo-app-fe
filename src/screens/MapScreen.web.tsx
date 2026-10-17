/**
 * MapScreen.web.tsx — Web platform implementation.
 * Uses Mapbox GL JS (mapbox-gl) directly in the browser.
 * Native platform → see MapScreen.native.tsx (@rnmapbox/maps).
 */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Dimensions, Animated, Platform, DeviceEventEmitter, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Gradients, Shadows } from '../constants/colors';
import { useI18n } from '../i18n';
import type { Friend } from '../constants/data';
import FriendSheet from '../components/FriendSheet';
import PostSheet from '../components/PostSheet';
import PlaceSheet from '../components/PlaceSheet';
import { toPostView, normalizeNearbyPost, type HeatmapPoint, type NearbyPost, type PostView } from '../services/postApi';
import { loadMapNearbyPosts } from '../utils/loadMapNearbyPosts';
import { removeMapNearbyPost, upsertMapNearbyPost } from '../utils/mapRealtime';
import { isPremiumActive, syncPremiumPlanFromServer } from '../utils/premiumStorage';
import { postVisibleAtZoom } from '../utils/mapPostZoom';
import { onMapPostCreated, onMapPostDeleted, updateMapArea } from '../services/mapHub';
import { separatePostsFrom3DPlaces, spreadOverlappingMarkers } from '../utils/mapMarkerSpread';
import { getNearbyPlaces, getPlacePromotions, recentPostToPostView, type PlaceSummary } from '../services/placeApi';
import { useRecordMapImpressions } from '../hooks/useRecordMapImpressions';
import { getFriendsLocations } from '../services/friendsApi';
import { hideUserLocation, updateUserLocation } from '../services/userApi';
import { friendLocationToMapPin, type MapFriendPin } from '../utils/mapFriendUtils';
import { getMymoMapStyle, MAP_THEME_UI, mapThemeLabel, nextMapTheme, type MapTheme } from '../utils/mapStyles';
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
import Toast from 'react-native-toast-message';
import { getStoredAuthSession, getAuthUserId } from '../services/authApi';
import { ensureModelViewerLoaded } from '../components/Model3DViewer';
import { dedupeMapPlaces } from '../utils/dedupeMapPlaces';
import { placesForMarkerPaint, sortPlacesByPromotion } from '../utils/mapPlacePromotion';
import { buildHeatGeoJSON } from '../utils/mapHeatmap';
import { loadMapHeatPoints } from '../utils/loadMapHeatPoints';

// ─── Mapbox GL JS (web-only) ──────────────────────────────────────────────────
import mapboxgl from 'mapbox-gl';

mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

function heatBlobSize(count: number, zoom: number): number {
  const t = Math.max(0, Math.min(1, (zoom - 6) / 10));
  return Math.round(14 + count * 3 + t * 20);
}

function createHeatBlobEl(count: number, zoom: number): HTMLDivElement {
  const el = document.createElement('div');
  const size = heatBlobSize(count, zoom);
  const t = Math.max(0, Math.min(1, (zoom - 6) / 10));
  const core = (0.16 + t * 0.2).toFixed(2);
  const mid = (0.07 + t * 0.1).toFixed(2);
  el.style.cssText = `
    width:${size}px;height:${size}px;
    border-radius:50%;
    pointer-events:none;
    background:radial-gradient(circle,
      rgba(232,80,160,${core}) 0%,
      rgba(218,112,214,${mid}) 48%,
      rgba(218,112,214,0.03) 72%,
      transparent 80%);
  `;
  return el;
}

function heatFeaturesSig(
  features: Array<{ geometry: { coordinates: [number, number] }; properties: { count: number } }>,
  visible: boolean,
  zoom: number,
) {
  return `${visible}:${Math.round(zoom)}:${features.map(f => `${f.geometry.coordinates[0]},${f.geometry.coordinates[1]},${f.properties.count}`).join('|')}`;
}

function syncHeatMarkers(
  map: mapboxgl.Map,
  markers: mapboxgl.Marker[],
  features: Array<{ geometry: { coordinates: [number, number] }; properties: { count: number } }>,
  visible: boolean,
  zoom: number,
) {
  markers.forEach(marker => marker.remove());
  markers.length = 0;
  if (!visible) return;
  features.forEach(feature => {
    markers.push(
      new mapboxgl.Marker({
        element: createHeatBlobEl(feature.properties.count, zoom),
        anchor: 'center',
      })
        .setLngLat(feature.geometry.coordinates)
        .addTo(map),
    );
  });
}

function paintUserPin(el: HTMLElement, marker: string | null) {
  el.innerHTML = '';
  const emoji = mapCharacterEmoji(marker);
  if (emoji || isMapImage(marker)) {
    el.style.cssText = `
      width:48px; height:48px; border-radius:50%;
      display:flex; align-items:center; justify-content:center;
      background:#fff; border:3px solid #F472B6;
      box-shadow:0 4px 16px rgba(244,114,182,0.45); overflow:hidden;
      font-size:26px; line-height:1;
    `;
    if (emoji) {
      el.textContent = emoji;
      return;
    }
    const img = document.createElement('img');
    img.src = marker!;
    img.alt = '';
    img.style.cssText = 'width:100%; height:100%; object-fit:cover; display:block;';
    el.appendChild(img);
    return;
  }
  el.style.cssText = `
    width:32px; height:32px; border-radius:50%;
    display:flex; align-items:center; justify-content:center;
    background:rgba(239,68,68,0.2); position:relative;
  `;
  const myDot = document.createElement('div');
  myDot.style.cssText = `
    width:16px; height:16px; border-radius:50%;
    background:#EF4444; border:3px solid #fff;
    box-shadow:0 4px 16px rgba(124,91,255,0.4);
  `;
  el.appendChild(myDot);
}

// ─── Default center: Tòa S1.07, Vinhomes Grand Park, Quận 9 ──────────────────
const DEFAULT_CENTER: [number, number] = [106.8376, 10.8382];
const DEFAULT_ZOOM = 14.5;

// ─── Props ────────────────────────────────────────────────────────────────────
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

function createFriendMarkerEl(friend: MapFriendPin, onTap: () => void): HTMLDivElement {
  const el = document.createElement('div');
  el.style.cssText = 'display:flex; flex-direction:column; align-items:center; cursor:pointer; z-index:6;';

  const ring = document.createElement('div');
  ring.style.cssText = `
    width:48px; height:48px; border-radius:50%;
    background:${friend.color}; border:3px solid #fff;
    display:flex; align-items:center; justify-content:center;
    font-size:22px; box-shadow:0 4px 16px rgba(124,91,255,0.4);
    position:relative; overflow:hidden;
  `;

  const img = document.createElement('img');
  const emoji = mapCharacterEmoji(friend.mapMarker);
  if (isMapImage(friend.mapMarker)) {
    img.src = friend.mapMarker!;
  } else if (!emoji) {
    img.src = avatarUri(friend.avatarUrl);
  }
  img.alt = friend.name;
  img.style.cssText = 'width:100%; height:100%; object-fit:cover; display:block;';
  if (emoji) {
    const face = document.createElement('span');
    face.textContent = emoji;
    face.style.cssText = 'font-size:26px; line-height:1;';
    ring.appendChild(face);
  } else {
    ring.appendChild(img);
  }

  if (friend.status === 'active') {
    const dot = document.createElement('div');
    dot.style.cssText = `
      position:absolute; bottom:0; right:0;
      width:12px; height:12px; border-radius:50%;
      background:#10B981; border:2px solid #fff;
    `;
    ring.appendChild(dot);
  }

  const nameTag = document.createElement('div');
  nameTag.style.cssText = `
    margin-top:4px; background:rgba(255,255,255,0.95);
    padding:2px 8px; border-radius:10px;
    font-family:Nunito,sans-serif; font-size:10px; font-weight:700; color:#4F2852;
    box-shadow:0 2px 8px rgba(124,91,255,0.12); white-space:nowrap;
  `;
  nameTag.textContent = friend.name;

  el.appendChild(ring);
  el.appendChild(nameTag);
  el.addEventListener('click', onTap);
  return el;
}

function createPlaceMarkerEl(
  place: PlaceSummary,
  onTap: () => void,
  show3DModel: boolean,
): HTMLDivElement {
  const rendersModel = show3DModel && !!place.model3DUrl;
  const featured = place.adPackageId === 'featured_venue';
  const sponsored = !!place.adPackageId && !featured;
  const el = document.createElement('div');
  el.style.cssText = `display:flex; flex-direction:column; align-items:center; cursor:pointer; z-index:${featured ? 24 : sponsored ? 16 : rendersModel ? 12 : place.isOwnedByCurrentUser ? 9 : 4}; max-width:120px;`;

  const vibes = document.createElement('div');
  vibes.style.cssText = `
    display:flex; align-items:center; justify-content:center; gap:3px;
    margin-bottom:${rendersModel ? -5 : 2}px; z-index:2; max-width:120px;
  `;
  place.vibes.slice(0, 3).forEach(vibeId => {
    const vibe = vibeById(vibeId);
    const badge = document.createElement('span');
    badge.title = vibe?.name ?? vibeId;
    badge.textContent = vibe?.emoji ?? '✨';
    badge.style.cssText = `
      width:27px; height:27px; border-radius:14px;
      display:flex; align-items:center; justify-content:center;
      background:rgba(255,255,255,0.97); border:2px solid #F2DAF0;
      box-shadow:0 3px 10px rgba(92,61,171,0.3); font-size:14px;
    `;
    vibes.appendChild(badge);
  });

  const chip = document.createElement('div');
  chip.style.cssText = `
    margin-top:4px; max-width:108px;
    display:flex; align-items:center; gap:4px;
    background:rgba(255,255,255,0.96);
    padding:5px 8px; border-radius:12px;
    border:1px solid #F2DAF0;
    box-shadow:0 2px 8px rgba(124,91,255,0.12);
  `;

  const name = document.createElement('span');
  name.style.cssText = `
    font-family:Nunito,sans-serif; font-size:9px; font-weight:800; color:#4F2852;
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
    flex:1; min-width:0;
  `;
  name.textContent = place.name;
  chip.appendChild(name);

  if (place.isOwnedByCurrentUser) {
    const mine = document.createElement('span');
    mine.textContent = 'QUÁN CỦA BẠN';
    mine.style.cssText = 'font-family:Nunito,sans-serif;font-size:7px;font-weight:900;color:#DA70D6;background:#FBEAF9;padding:2px 5px;border-radius:7px;white-space:nowrap;';
    chip.appendChild(mine);
  }

  if (place.averageRating && place.averageRating > 0) {
    const rating = document.createElement('span');
    rating.style.cssText = `
      font-family:Nunito,sans-serif; font-size:8px; font-weight:800; color:#7D4E80;
      background:#FFF5FE; padding:2px 5px; border-radius:8px;
      white-space:nowrap; flex-shrink:0;
    `;
    rating.textContent = `★ ${place.averageRating.toFixed(1)}`;
    chip.appendChild(rating);
  }

  el.appendChild(vibes);

  if (featured) {
    const star = document.createElement('div');
    star.textContent = '★';
    star.title = 'Nổi bật';
    star.style.cssText = `
      width:36px; height:36px; border-radius:18px; margin-bottom:2px;
      display:flex; align-items:center; justify-content:center;
      background:linear-gradient(135deg,#F6C445,#E39B1A);
      color:#fff; font-size:18px; line-height:1; border:2px solid #fff;
      box-shadow:0 4px 14px rgba(227,155,26,0.45);
    `;
    el.appendChild(star);
    chip.style.borderColor = '#F6C445';
  } else if (sponsored) {
    chip.style.borderColor = '#E39BDE';
  }

  if (rendersModel && place.model3DUrl) {
    const model = document.createElement('model-viewer');
    model.setAttribute('src', place.model3DUrl);
    model.setAttribute('camera-controls', '');
    model.setAttribute('camera-orbit', '0deg 65deg auto');
    model.setAttribute('min-camera-orbit', 'auto 45deg auto');
    model.setAttribute('max-camera-orbit', 'auto 82deg auto');
    model.setAttribute('shadow-intensity', '1');
    // Mapbox positions markers with CSS transforms, which can make
    // model-viewer's lazy visibility detection incorrectly stay off-screen.
    model.setAttribute('loading', 'eager');
    model.setAttribute('reveal', 'auto');
    model.setAttribute('exposure', '1');
    model.setAttribute('interaction-prompt', 'none');
    model.style.cssText = `
      width:${place.isOwnedByCurrentUser ? 112 : 92}px;
      height:${place.isOwnedByCurrentUser ? 92 : 76}px;
      display:block;
      position:relative; z-index:1; visibility:visible; opacity:1;
      pointer-events:auto; touch-action:none; cursor:grab;
    `;
    // Rotate the model without also dragging the map or opening the place.
    ['pointerdown', 'mousedown', 'touchstart', 'click'].forEach(eventName => {
      model.addEventListener(eventName, event => event.stopPropagation());
    });
    el.appendChild(model);
    chip.style.cssText += `
      position:absolute; top:100%; left:50%; transform:translateX(-50%);
      margin-top:2px; width:max-content;
    `;
  }
  el.appendChild(chip);
  el.addEventListener('click', onTap);
  return el;
}

function createPostMarkerEl(post: NearbyPost, onTap: () => void): HTMLDivElement {
  const el = document.createElement('div');
  el.style.cssText = 'display:flex; flex-direction:column; align-items:center; cursor:pointer; z-index:5;';

  const thumbWrap = document.createElement('div');
  thumbWrap.style.cssText = `
    width:56px; height:56px; border-radius:14px;
    border:3px solid #fff; overflow:hidden;
    box-shadow:0 4px 20px rgba(124,91,255,0.55);
    background:#F5F0FF; display:flex; align-items:center; justify-content:center;
  `;

  if (post.thumbnailUrl) {
    const img = document.createElement('img');
    img.src = post.thumbnailUrl;
    img.alt = post.displayName;
    img.style.cssText = 'width:100%; height:100%; object-fit:cover; display:block;';
    thumbWrap.appendChild(img);
  } else {
    thumbWrap.textContent = '📷';
    thumbWrap.style.fontSize = '22px';
  }

  const nameTag = document.createElement('div');
  nameTag.style.cssText = `
    margin-top:4px; max-width:72px; background:rgba(255,255,255,0.95);
    padding:2px 6px; border-radius:8px;
    font-family:Nunito,sans-serif; font-size:9px; font-weight:700; color:#4F2852;
    box-shadow:0 2px 8px rgba(124,91,255,0.12);
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis; text-align:center;
  `;
  nameTag.textContent = `${post.authorIsPremium && !post.isAnonymous ? '💎 ' : ''}${post.displayName}`;

  el.appendChild(thumbWrap);
  el.appendChild(nameTag);
  el.addEventListener('click', onTap);
  return el;
}

function createSearchMarkerEl(): HTMLDivElement {
  const el = document.createElement('div');
  el.style.cssText = 'display:flex; flex-direction:column; align-items:center; z-index:7;';

  const bubble = document.createElement('div');
  bubble.style.cssText = `
    width:40px; height:40px; border-radius:50%;
    background:linear-gradient(135deg, #F3D4F1, #E39BDE);
    border:2.5px solid #fff;
    display:flex; align-items:center; justify-content:center;
    box-shadow:0 4px 16px rgba(124,91,255,0.5);
    font-size:18px;
  `;
  bubble.textContent = '📍';

  const tip = document.createElement('div');
  tip.style.cssText = `
    width:0; height:0; margin-top:-1px;
    border-left:7px solid transparent;
    border-right:7px solid transparent;
    border-top:9px solid #E39BDE;
  `;

  el.appendChild(bubble);
  el.appendChild(tip);
  return el;
}

// ─────────────────────────────────────────────────────────────────────────────

export default function MapScreen({
  locationGranted, visibleOnMap, incognito, isActive = true,
  onFriendTap, selectedFriend, onCloseSheet, onMessage, onDisableIncognito, onViewProfile,
  vibeId = null, onClearVibe, onChooseVibe,
}: MapScreenProps) {
  const { t } = useI18n();
  useEffect(ensureModelViewerLoaded, []);
  const [searchText, setSearchText] = useState('');
  const [cssLoaded, setCssLoaded] = useState(false);
  const [mapTheme, setMapTheme] = useState<MapTheme>('purple');
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
  const userCoordsRef = useRef(userCoords);
  userCoordsRef.current = userCoords;
  const coordsBucket = userCoords
    ? `${userCoords.lat.toFixed(2)},${userCoords.lng.toFixed(2)}`
    : 'none';
  const [nearbyPosts, setNearbyPosts] = useState<NearbyPost[]>([]);
  const [heatPoints, setHeatPoints] = useState<HeatmapPoint[]>([]);
  const [nearbyPlaces, setNearbyPlaces] = useState<PlaceSummary[]>([]);
  const [selectedPost, setSelectedPost] = useState<PostView | null>(null);
  const [selectedPostIsOwn, setSelectedPostIsOwn] = useState(false);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [myMapMarker, setMyMapMarker] = useState<string | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<PlaceSummary | null>(null);
  const [friendPins, setFriendPins] = useState<MapFriendPin[]>([]);
  const [eventPlaceIds, setEventPlaceIds] = useState<Set<string>>(new Set());
  const [searchPin, setSearchPin] = useState<MapGeocodeResult | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM);
  const [postClock, setPostClock] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setPostClock(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const postMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const placeMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const searchMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const hasCenteredOnUserRef = useRef(false);
  const hasCenteredOnOwnedPlaceRef = useRef(false);
  const skipInitialThemeRef = useRef(true);
  const postMarkerSigRef = useRef('');
  const placeMarkerSigRef = useRef('');
  const friendMarkerSigRef = useRef('');
  const heatBlobSigRef = useRef('');
  const heatBlobMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const mapHostRef = useRef<HTMLDivElement | null>(null);
  const MAP_CONTAINER_ID = 'mymo-mapbox-container';

  const mapCenter: [number, number] = userCoords
    ? [userCoords.lng, userCoords.lat]
    : DEFAULT_CENTER;

  useEffect(() => {
    getStoredAuthSession()
      .then(session => setMyUserId(getAuthUserId(session)))
      .catch(() => setMyUserId(null));

    getUserProfile()
      .then(async profile => {
        setMyUserId(profile.id || null);
        const premium = await hasActivePremium();
        setMyMapMarker(premium ? (profile.mapMarker ?? null) : null);
      })
      .catch(() => {});
    const sub = DeviceEventEmitter.addListener('map-marker:updated', (marker: string | null) => {
      setMyMapMarker(marker);
    });
    return () => sub.remove();
  }, []);

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

  // ── User location (browser geolocation) ────────────────────────────────────
  useEffect(() => {
    if (!locationGranted) {
      setUserCoords(null);
      return;
    }
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;

    const applyCoords = (lat: number, lng: number) => {
      setUserCoords(prev => {
        if (prev && Math.abs(prev.lat - lat) < 0.00008 && Math.abs(prev.lng - lng) < 0.00008) {
          return prev;
        }
        return { lat, lng };
      });
    };

    const readOnce = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => applyCoords(pos.coords.latitude, pos.coords.longitude),
        () => {},
        { enableHighAccuracy: false, maximumAge: 60_000, timeout: 10000 },
      );
    };
    readOnce();
    const timer = setInterval(readOnce, 60_000);
    return () => clearInterval(timer);
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

  // ── Fetch friend locations ─────────────────────────────────────────────────
  const fetchFriendLocations = useCallback(async () => {
    const lat = userCoordsRef.current?.lat;
    const lng = userCoordsRef.current?.lng;
    try {
      const locations = await getFriendsLocations();
      const next = locations.map(loc => friendLocationToMapPin(loc, lat, lng));
      setFriendPins(prev => (
        prev.length === next.length
        && prev.every((pin, i) => pin.id === next[i].id && pin.lat === next[i].lat && pin.lng === next[i].lng)
          ? prev
          : next
      ));
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

  // ── Fetch nearby posts ─────────────────────────────────────────────────────
  const fetchNearbyPosts = useCallback(async () => {
    const lat = userCoordsRef.current?.lat ?? DEFAULT_CENTER[1];
    const lng = userCoordsRef.current?.lng ?? DEFAULT_CENTER[0];
    try {
      const posts = await loadMapNearbyPosts(lat, lng);
      setNearbyPosts(prev => (
        prev.length === posts.length && prev.every((item, i) => item.postId === posts[i].postId)
          ? prev
          : posts
      ));
    } catch {
      setNearbyPosts([]);
    }
  }, []);

  const fetchHeatPoints = useCallback(async () => {
    const lat = userCoordsRef.current?.lat ?? DEFAULT_CENTER[1];
    const lng = userCoordsRef.current?.lng ?? DEFAULT_CENTER[0];
    try {
      const points = await loadMapHeatPoints(lat, lng);
      setHeatPoints(prev => (
        prev.length === points.length
        && prev.every((item, i) =>
          item.latitude === points[i].latitude
          && item.longitude === points[i].longitude
          && item.userId === points[i].userId)
          ? prev
          : points
      ));
    } catch {
      setHeatPoints([]);
    }
  }, []);

  const fetchNearbyPlaces = useCallback(async () => {
    const lat = userCoordsRef.current?.lat ?? DEFAULT_CENTER[1];
    const lng = userCoordsRef.current?.lng ?? DEFAULT_CENTER[0];
    try {
      const places = await getNearbyPlaces(lat, lng, vibeId ? 40 : 20, vibeId ?? undefined);
      setNearbyPlaces(prev => (
        prev.length === places.length && prev.every((item, i) => item.placeId === places[i].placeId)
          ? prev
          : places
      ));
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

  const shownZoom = shownMapZoom(mapZoom);
  const showDetailPins = shownZoom >= MAP_DETAIL_MIN_ZOOM;
  const showBusinessPins = shownZoom >= MAP_BUSINESS_MIN_ZOOM;
  const show3DModels = shownZoom >= MAP_3D_MODEL_MIN_ZOOM;
  const showFreshPosts = shownZoom >= MAP_FRESH_POST_MIN_ZOOM;
  const showPosts = shownZoom >= MAP_POST_MIN_ZOOM;

  const visiblePosts = useMemo(
    () => filteredPosts.filter(post => postVisibleAtZoom(post, shownZoom, postClock)),
    [filteredPosts, shownZoom, postClock],
  );
  const visiblePlaces = useMemo(
    () => filteredPlaces.filter(place =>
      place.isOwnedByCurrentUser || showBusinessPins),
    [filteredPlaces, showBusinessPins],
  );
  useRecordMapImpressions(visiblePlaces, isActive);

  const spreadMapPosts = useMemo(
    () => spreadOverlappingMarkers(visiblePosts),
    [visiblePosts],
  );
  const displayedMapPosts = useMemo(
    () => separatePostsFrom3DPlaces(
      spreadMapPosts,
      show3DModels ? visiblePlaces : [],
    ),
    [spreadMapPosts, visiblePlaces, show3DModels],
  );

  const heatGeoJSON = useMemo(
    () => buildHeatGeoJSON(heatPoints),
    [heatPoints],
  );
  const heatGeoJSONRef = useRef(heatGeoJSON);
  heatGeoJSONRef.current = heatGeoJSON;
  const showHeatmapRef = useRef(showHeatmap);
  showHeatmapRef.current = showHeatmap;

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

  // ── Inject mapbox-gl CSS once and wait for it to load ──────────────────────
  useEffect(() => {
    const existing = document.getElementById('mapbox-gl-css');
    if (existing) {
      setCssLoaded(true);
      return;
    }
    const link = document.createElement('link');
    link.id = 'mapbox-gl-css';
    link.rel = 'stylesheet';
    link.href = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css';
    link.onload = () => setCssLoaded(true);
    link.onerror = () => setCssLoaded(true); // Fallback to avoid blocking completely
    document.head.appendChild(link);
    if (!document.getElementById('mymo-mapbox-stable')) {
      const stable = document.createElement('style');
      stable.id = 'mymo-mapbox-stable';
      stable.textContent = `
        #mymo-mapbox-container,
        #mymo-mapbox-container .mapboxgl-map,
        #mymo-mapbox-container .mapboxgl-canvas-container,
        #mymo-mapbox-container canvas {
          transition: none !important;
          animation: none !important;
        }
      `;
      document.head.appendChild(stable);
    }
  }, []);

  // ── Init map after CSS is loaded ───────────────────────────────────────────
  useEffect(() => {
    if (!cssLoaded) return;
    const container = mapHostRef.current || document.getElementById(MAP_CONTAINER_ID);
    if (!container) return;

    const reused = (container as HTMLElement & { __mymoMap?: mapboxgl.Map }).__mymoMap;
    if (reused) {
      mapRef.current = reused;
      setMapReady(true);
      return;
    }
    if (mapRef.current) return;

    const map = new mapboxgl.Map({
      container,
      style: getMymoMapStyle('purple') as mapboxgl.Style,
      center: mapCenter,
      zoom: DEFAULT_ZOOM,
      attributionControl: false,
      logoPosition: 'bottom-left',
      fadeDuration: 0,
      refreshExpiredTiles: false,
      trackResize: false,
      antialias: false,
      pitchWithRotate: false,
      dragRotate: false,
      touchPitch: false,
    });

    mapRef.current = map;
    (container as HTMLElement & { __mymoMap?: mapboxgl.Map }).__mymoMap = map;

    const syncZoom = () => {
      const next = shownMapZoom(map.getZoom());
      setMapZoom(prev => (prev === next ? prev : next));
    };
    map.on('zoomend', syncZoom);
    map.on('moveend', syncZoom);
    syncZoom();

    map.on('load', () => {
      if (!userMarkerRef.current) {
        const myEl = document.createElement('div');
        paintUserPin(myEl, null);
        userMarkerRef.current = new mapboxgl.Marker({ element: myEl, anchor: 'center' })
          .setLngLat(mapCenter)
          .addTo(map);
      }
      setMapReady(true);
    });
    // Keep the WebGL map. Destroying it on React effect re-runs made the screen flash.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cssLoaded]);

  // ── Switch between purple, yellow, and bright blue MYMO styles ─────────────
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    if (skipInitialThemeRef.current) {
      skipInitialThemeRef.current = false;
      return;
    }
    const map = mapRef.current;
    const center = map.getCenter();
    const zoom = map.getZoom();
    map.setStyle(getMymoMapStyle(mapTheme) as mapboxgl.Style);
    map.once('style.load', () => {
      map.jumpTo({ center, zoom });
      syncHeatMarkers(
        map,
        heatBlobMarkersRef.current,
        heatGeoJSONRef.current.features,
        showHeatmapRef.current,
        zoom,
      );
      heatBlobSigRef.current = heatFeaturesSig(
        heatGeoJSONRef.current.features,
        showHeatmapRef.current,
        zoom,
      );
    });
  }, [mapTheme, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const zoom = map.getZoom();
    const sig = heatFeaturesSig(heatGeoJSON.features, showHeatmap, zoom);
    if (sig === heatBlobSigRef.current) return;
    heatBlobSigRef.current = sig;
    syncHeatMarkers(map, heatBlobMarkersRef.current, heatGeoJSON.features, showHeatmap, zoom);
  }, [heatGeoJSON, showHeatmap, mapReady, mapZoom]);

  // ── Sync post markers ──────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const sig = displayedMapPosts
      .map(({ post, latitude, longitude, markerOffsetX = 0, markerOffsetY = 0 }) =>
        `${post.postId}:${latitude.toFixed(5)}:${longitude.toFixed(5)}:${markerOffsetX}:${markerOffsetY}`)
      .join('|');
    if (sig === postMarkerSigRef.current) return;
    postMarkerSigRef.current = sig;

    postMarkersRef.current.forEach(m => m.remove());
    postMarkersRef.current = [];

    displayedMapPosts.forEach(({ post, latitude, longitude, markerOffsetX = 0, markerOffsetY = 0 }) => {
      const el = createPostMarkerEl(post, () => {
        setSelectedPlace(null);
        setSelectedPostIsOwn(
          Boolean(myUserId && post.userId && myUserId.toLowerCase() === post.userId.toLowerCase()),
        );
        setSelectedPost(toPostView(post));
      });
      const marker = new mapboxgl.Marker({
        element: el,
        anchor: 'bottom',
        offset: [markerOffsetX, markerOffsetY],
      })
        .setLngLat([longitude, latitude])
        .addTo(map);
      postMarkersRef.current.push(marker);
    });
  }, [displayedMapPosts, mapReady, myUserId]);

  useEffect(() => {
    if (!isActive || !mapRef.current || !mapReady) return;
    const frame = requestAnimationFrame(() => mapRef.current?.resize());
    return () => cancelAnimationFrame(frame);
  }, [isActive, mapReady]);

  // ── Default: always center on my location when opening the map ───────────
  useEffect(() => {
    if (!isActive) {
      hasCenteredOnUserRef.current = false;
      hasCenteredOnOwnedPlaceRef.current = false;
      return;
    }
    const map = mapRef.current;
    if (vibeId || !map || !mapReady || !userCoords || hasCenteredOnUserRef.current) return;
    hasCenteredOnUserRef.current = true;
    map.flyTo({
      center: [userCoords.lng, userCoords.lat],
      zoom: DEFAULT_ZOOM,
      duration: 800,
    });
  }, [isActive, mapReady, userCoords, vibeId]);

  // Business owners should land on their own venue so zooming in does not
  // push its 3D house outside the viewport.
  useEffect(() => {
    if (!isActive || !mapReady || vibeId || hasCenteredOnOwnedPlaceRef.current) return;
    const ownedPlace = visiblePlaces.find(place => place.isOwnedByCurrentUser);
    if (!ownedPlace) return;
    hasCenteredOnOwnedPlaceRef.current = true;
    hasCenteredOnUserRef.current = true;
    mapRef.current?.flyTo({
      center: [ownedPlace.longitude, ownedPlace.latitude],
      zoom: Math.max(mapRef.current.getZoom(), DEFAULT_ZOOM),
      duration: 900,
    });
  }, [isActive, mapReady, vibeId, visiblePlaces]);

  const flownVibeRef = useRef<string | null>(null);
  useEffect(() => {
    if (!vibeId) {
      flownVibeRef.current = null;
      return;
    }
    if (!isActive || !mapReady || flownVibeRef.current === vibeId) return;
    const match = visiblePlaces[0] ?? filteredPlaces[0];
    if (!match) return;
    flownVibeRef.current = vibeId;
    mapRef.current?.flyTo({
      center: [match.longitude, match.latitude],
      zoom: MAP_VIBE_OVERVIEW_ZOOM,
      duration: 900,
    });
  }, [vibeId, isActive, mapReady, filteredPlaces, visiblePlaces]);

  // ── Sync place markers ─────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const canShow = showBusinessPins || filteredPlaces.some(place => place.isOwnedByCurrentUser);
    const sig = canShow
      ? `${show3DModels}:${visiblePlaces.map(place => `${place.placeId}:${place.adPackageId ?? ''}`).join('|')}`
      : '';
    if (sig === placeMarkerSigRef.current) return;
    placeMarkerSigRef.current = sig;

    placeMarkersRef.current.forEach(m => m.remove());
    placeMarkersRef.current = [];
    if (!canShow) return;

    placesForMarkerPaint(visiblePlaces).forEach(place => {
      const el = createPlaceMarkerEl(place, () => {
        setSelectedPost(null);
        setSelectedPlace(place);
      }, show3DModels);
      const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([place.longitude, place.latitude])
        .addTo(map);
      placeMarkersRef.current.push(marker);
    });
  }, [visiblePlaces, filteredPlaces, mapReady, showBusinessPins, show3DModels]);

  // ── Sync friend markers ────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const sig = visibleFriendPins.map(f => `${f.id}:${f.lng.toFixed(5)}:${f.lat.toFixed(5)}:${f.mapMarker ?? ''}`).join('|');
    if (sig === friendMarkerSigRef.current) return;
    friendMarkerSigRef.current = sig;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    visibleFriendPins.forEach(f => {
      const el = createFriendMarkerEl(f, () => {
        if (onViewProfile) onViewProfile(f);
        else onFriendTap(f);
      });
      const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([f.lng, f.lat])
        .addTo(map);
      markersRef.current.push(marker);
    });
  }, [visibleFriendPins, mapReady, onFriendTap]);

  // ── Sync search result marker ────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    searchMarkerRef.current?.remove();
    searchMarkerRef.current = null;

    if (!searchPin) return;

    const el = createSearchMarkerEl();
    searchMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
      .setLngLat([searchPin.lng, searchPin.lat])
      .addTo(map);
  }, [searchPin, mapReady]);

  // ── Move user pin when coords update ───────────────────────────────────────
  useEffect(() => {
    if (!userMarkerRef.current || !userCoords) return;
    userMarkerRef.current.setLngLat([userCoords.lng, userCoords.lat]);
  }, [userCoords]);

  useEffect(() => {
    const el = userMarkerRef.current?.getElement() as HTMLElement | undefined;
    if (!el) return;
    paintUserPin(el, myMapMarker);
  }, [myMapMarker, mapReady]);

  // ── Show/hide user pin based on permission ─────────────────────────────────
  useEffect(() => {
    if (!userMarkerRef.current) return;
    const el = userMarkerRef.current.getElement() as HTMLElement;
    el.style.display = visibleOnMap ? 'flex' : 'none';
  }, [visibleOnMap]);

  // ── Fly to selected friend ───────────────────────────────────────────────
  useEffect(() => {
    if (!selectedFriend || !mapRef.current) return;
    const friend = visibleFriendPins.find(f => f.id === selectedFriend.id);
    if (friend) {
      mapRef.current.flyTo({
        center: [friend.lng, friend.lat],
        zoom: 15,
        duration: 1000,
      });
    }
  }, [selectedFriend?.id]);

  // ── Recenter ───────────────────────────────────────────────────────────────
  const recenter = useCallback(() => {
    mapRef.current?.flyTo({ center: mapCenter, zoom: DEFAULT_ZOOM, duration: 800 });
    fetchNearbyPosts();
    fetchHeatPoints();
    fetchNearbyPlaces();
    fetchFriendLocations();
    Toast.show({ type: 'success', text1: t('map.centered') });
  }, [t, mapCenter, fetchNearbyPosts, fetchHeatPoints, fetchNearbyPlaces, fetchFriendLocations]);

  // ── Zoom ───────────────────────────────────────────────────────────────────
  const zoomIn  = useCallback(() => mapRef.current?.zoomIn(), []);
  const zoomOut = useCallback(() => mapRef.current?.zoomOut(), []);

  const handleSelectGeocode = useCallback((result: MapGeocodeResult) => {
    setSearchText(result.placeName);
    setSearchFocused(false);
    setSearchPin(result);
    mapRef.current?.flyTo({
      center: [result.lng, result.lat],
      zoom: 17,
      duration: 800,
    });
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
      {/* ── Real Mapbox GL map container ── */}
      <div
        ref={mapHostRef}
        id={MAP_CONTAINER_ID}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          overflow: 'hidden',
        }}
      />

      <MapWeather
        lat={userCoords?.lat ?? DEFAULT_CENTER[1]}
        lng={userCoords?.lng ?? DEFAULT_CENTER[0]}
        cardBg={themeUi.searchBg}
        chipBg={themeUi.chipInactiveBg}
        chipBorder={themeUi.chipInactiveBorder}
        iconColor={themeUi.weatherIcon}
      />

      {/* ── Incognito ghost overlay ── */}
      {locationGranted && incognito && (
        <View
          style={[
            styles.ghostPin,
            Platform.OS === 'web' ? { pointerEvents: 'none' as const } : undefined,
          ]}
          pointerEvents={Platform.OS === 'web' ? undefined : 'none'}
        >
          <Ionicons name="glasses-outline" size={18} color={Colors.primary} />
        </View>
      )}

      {/* ── Search bar + controls overlay ── */}
      <View
        style={[styles.topBar, Platform.OS === 'web' ? { pointerEvents: 'box-none' as const } : undefined]}
        pointerEvents={Platform.OS === 'web' ? undefined : 'box-none'}
      >
        <View
          style={[styles.searchBlock, Platform.OS === 'web' ? { pointerEvents: 'auto' as const } : undefined]}
          pointerEvents={Platform.OS === 'web' ? undefined : 'auto'}
        >
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
                onPress={() => onDisableIncognito?.()}
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
        <TouchableOpacity onPress={zoomIn}   style={styles.zoomBtn}>
          <Ionicons name="add"            size={20} color={Colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={zoomOut}  style={styles.zoomBtn}>
          <Ionicons name="remove"         size={20} color={Colors.primary} />
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
              <TouchableOpacity onPress={() => onFriendTap(f)} activeOpacity={0.75}>
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
          onMessage={f => { onCloseSheet(); onMessage(f); }}
          onViewProfile={onViewProfile ? f => { onCloseSheet(); onViewProfile(f); } : undefined}
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
    position: 'relative',
  },
  map: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    height: '100%',
  },
  ghostPin: {
    position: 'absolute',
    top: '48%',
    left: '48%',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderWidth: 2,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  vibeBanner: {
    marginLeft: 78,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#F3D4F1',
    gap: 4,
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
