/**
 * MapScreen.web.tsx — Web platform implementation.
 * Uses Mapbox GL JS (mapbox-gl) directly in the browser.
 * Native platform → see MapScreen.native.tsx (@rnmapbox/maps).
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import Toast from 'react-native-toast-message';

// ─── Mapbox GL JS (web-only) ──────────────────────────────────────────────────
import mapboxgl from 'mapbox-gl';

mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

// ─── Default center: Tòa S1.07, Vinhomes Grand Park, Quận 9 ──────────────────
const DEFAULT_CENTER: [number, number] = [106.8376, 10.8382];
const DEFAULT_ZOOM = 17;

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
}

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

  if (friend.avatarUrl) {
    const img = document.createElement('img');
    img.src = friend.avatarUrl;
    img.alt = friend.name;
    img.style.cssText = 'width:100%; height:100%; object-fit:cover; display:block;';
    ring.appendChild(img);
  } else {
    ring.textContent = friend.emoji;
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
    font-size:10px; font-weight:700; color:#2A1758;
    box-shadow:0 2px 8px rgba(124,91,255,0.12); white-space:nowrap;
  `;
  nameTag.textContent = friend.name;

  el.appendChild(ring);
  el.appendChild(nameTag);
  el.addEventListener('click', onTap);
  return el;
}

function createPlaceMarkerEl(place: PlaceSummary, onTap: () => void): HTMLDivElement {
  const el = document.createElement('div');
  el.style.cssText = 'display:flex; flex-direction:column; align-items:center; cursor:pointer; z-index:4; max-width:110px;';

  const bubble = document.createElement('div');
  bubble.style.cssText = `
    width:44px; height:44px; border-radius:50%;
    background:linear-gradient(135deg, #9C7CFF, #7C5BFF);
    border:2.5px solid #fff;
    display:flex; align-items:center; justify-content:center;
    box-shadow:0 4px 16px rgba(124,91,255,0.45);
  `;

  const inner = document.createElement('div');
  inner.style.cssText = `
    width:34px; height:34px; border-radius:50%;
    background:#fff; overflow:hidden;
    display:flex; align-items:center; justify-content:center;
    font-size:16px;
  `;

  if (place.thumbnailUrl) {
    const img = document.createElement('img');
    img.src = place.thumbnailUrl;
    img.alt = place.name;
    img.style.cssText = 'width:100%; height:100%; object-fit:cover; display:block;';
    inner.appendChild(img);
  } else {
    inner.textContent = '📍';
  }

  bubble.appendChild(inner);

  const tip = document.createElement('div');
  tip.style.cssText = `
    width:0; height:0; margin-top:-1px;
    border-left:7px solid transparent;
    border-right:7px solid transparent;
    border-top:9px solid #7C5BFF;
  `;

  const chip = document.createElement('div');
  chip.style.cssText = `
    margin-top:4px; max-width:108px;
    display:flex; align-items:center; gap:4px;
    background:rgba(255,255,255,0.96);
    padding:5px 8px; border-radius:12px;
    border:1px solid #E8DFFF;
    box-shadow:0 2px 8px rgba(124,91,255,0.12);
  `;

  const name = document.createElement('span');
  name.style.cssText = `
    font-size:9px; font-weight:800; color:#2A1758;
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
    flex:1; min-width:0;
  `;
  name.textContent = place.name;
  chip.appendChild(name);

  if (place.averageRating && place.averageRating > 0) {
    const rating = document.createElement('span');
    rating.style.cssText = `
      font-size:8px; font-weight:800; color:#4E3A87;
      background:#F6F2FF; padding:2px 5px; border-radius:8px;
      white-space:nowrap; flex-shrink:0;
    `;
    rating.textContent = `★ ${place.averageRating.toFixed(1)}`;
    chip.appendChild(rating);
  }

  el.appendChild(bubble);
  el.appendChild(tip);
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
    font-size:9px; font-weight:700; color:#2A1758;
    box-shadow:0 2px 8px rgba(124,91,255,0.12);
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis; text-align:center;
  `;
  nameTag.textContent = post.displayName;

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
    background:linear-gradient(135deg, #9C7CFF, #7C5BFF);
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
    border-top:9px solid #7C5BFF;
  `;

  el.appendChild(bubble);
  el.appendChild(tip);
  return el;
}

// ─────────────────────────────────────────────────────────────────────────────

export default function MapScreen({
  locationGranted, visibleOnMap, incognito, isActive = true,
  onFriendTap, selectedFriend, onCloseSheet, onMessage, onDisableIncognito,
}: MapScreenProps) {
  const { t } = useI18n();
  const [searchText, setSearchText] = useState('');
  const [cssLoaded, setCssLoaded] = useState(false);
  const [mapTheme, setMapTheme] = useState<MapTheme>('purple');
  const themeUi = MAP_THEME_UI[mapTheme];
  const mapFilters = [
    { id: 'all', label: t('map.filterAll') },
    { id: 'friends', label: t('map.filterFriends') },
    { id: 'public', label: t('map.filterPublic') },
    { id: 'events', label: t('map.filterEvents') },
    { id: 'vibe', label: t('map.filterVibe') },
  ];
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const userCoordsRef = useRef(userCoords);
  userCoordsRef.current = userCoords;
  const coordsBucket = userCoords
    ? `${userCoords.lat.toFixed(3)},${userCoords.lng.toFixed(3)}`
    : 'none';
  const [nearbyPosts, setNearbyPosts] = useState<NearbyPost[]>([]);
  const [nearbyPlaces, setNearbyPlaces] = useState<PlaceSummary[]>([]);
  const [selectedPost, setSelectedPost] = useState<PostView | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<PlaceSummary | null>(null);
  const [friendPins, setFriendPins] = useState<MapFriendPin[]>([]);
  const [searchPin, setSearchPin] = useState<MapGeocodeResult | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const postMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const placeMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const searchMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const hasCenteredOnUserRef = useRef(false);
  const skipInitialThemeRef = useRef(true);
  const MAP_CONTAINER_ID = 'mymo-mapbox-container';

  const mapCenter: [number, number] = userCoords
    ? [userCoords.lng, userCoords.lat]
    : DEFAULT_CENTER;

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

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      () => {},
      { enableHighAccuracy: false, timeout: 10000 },
    );

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setUserCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      () => {},
      { enableHighAccuracy: false, maximumAge: 30000, timeout: 10000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [locationGranted]);

  // ── Share own location with server (null = hide from friends' maps) ──────
  useEffect(() => {
    const sharing = locationGranted && visibleOnMap && !incognito;
    if (!sharing) {
      updateUserLocation(null, null);
      return;
    }
    if (!userCoords) return;
    updateUserLocation(userCoords.lat, userCoords.lng);
  }, [locationGranted, visibleOnMap, incognito, userCoords?.lat, userCoords?.lng]);

  // ── Fetch friend locations ─────────────────────────────────────────────────
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

  // ── Fetch nearby posts ─────────────────────────────────────────────────────
  const fetchNearbyPosts = useCallback(async () => {
    const lat = userCoordsRef.current?.lat ?? DEFAULT_CENTER[1];
    const lng = userCoordsRef.current?.lng ?? DEFAULT_CENTER[0];
    try {
      const posts = await getNearbyPosts(lat, lng, 5, 1, 20);
      setNearbyPosts(filterActivePosts(posts));
    } catch {
      setNearbyPosts([]);
    }
  }, []);

  const fetchNearbyPlaces = useCallback(async () => {
    const lat = userCoordsRef.current?.lat ?? DEFAULT_CENTER[1];
    const lng = userCoordsRef.current?.lng ?? DEFAULT_CENTER[0];
    try {
      const places = await getNearbyPlaces(lat, lng, 5);
      setNearbyPlaces(places);
    } catch {
      setNearbyPlaces([]);
    }
  }, []);

  useEffect(() => {
    if (!isActive) return;
    fetchNearbyPosts();
    fetchNearbyPlaces();
    const sub = DeviceEventEmitter.addListener('post:created', () => {
      fetchNearbyPosts();
      fetchNearbyPlaces();
    });
    return () => sub.remove();
  }, [isActive, coordsBucket, fetchNearbyPosts, fetchNearbyPlaces]);

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
    link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.9.4/mapbox-gl.css';
    link.onload = () => setCssLoaded(true);
    link.onerror = () => setCssLoaded(true); // Fallback to avoid blocking completely
    document.head.appendChild(link);
  }, []);

  // ── Init map after CSS is loaded ───────────────────────────────────────────
  useEffect(() => {
    if (!cssLoaded) return;
    const container = document.getElementById(MAP_CONTAINER_ID);
    if (!container || mapRef.current) return;

    const map = new mapboxgl.Map({
      container,
      style: getMymoMapStyle('purple') as mapboxgl.Style,
      center: mapCenter,
      zoom: DEFAULT_ZOOM,
      attributionControl: false,
      logoPosition: 'bottom-left',
    });

    mapRef.current = map;

    map.on('load', () => {
      // Force resize to ensure correct canvas sizing
      map.resize();
      setTimeout(() => {
        map.resize();
      }, 150);

      // ── My location marker ──────────────────────────────────────────────
      const myEl = document.createElement('div');
      myEl.style.cssText = `
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
      myEl.appendChild(myDot);
      userMarkerRef.current = new mapboxgl.Marker({ element: myEl, anchor: 'center' })
        .setLngLat(mapCenter)
        .addTo(map);

      setMapReady(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = [];
      postMarkersRef.current = [];
      placeMarkersRef.current.forEach(m => m.remove());
      placeMarkersRef.current = [];
      searchMarkerRef.current?.remove();
      searchMarkerRef.current = null;
      userMarkerRef.current = null;
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cssLoaded]);

  // ── Switch between purple and yellow MYMO styles ───────────────────────────
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
      map.resize();
    });
  }, [mapTheme, mapReady]);

  // ── Sync post markers ──────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    postMarkersRef.current.forEach(m => m.remove());
    postMarkersRef.current = [];

    filteredPosts.forEach(post => {
      const el = createPostMarkerEl(post, () => {
        setSelectedPlace(null);
        setSelectedPost(toPostView(post));
      });
      const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([post.longitude, post.latitude])
        .addTo(map);
      postMarkersRef.current.push(marker);
    });
  }, [filteredPosts, mapReady]);

  // ── Default: always center on my location when opening the map ───────────
  useEffect(() => {
    if (!isActive) {
      hasCenteredOnUserRef.current = false;
      return;
    }
    const map = mapRef.current;
    if (!map || !mapReady || !userCoords || hasCenteredOnUserRef.current) return;
    hasCenteredOnUserRef.current = true;
    map.flyTo({
      center: [userCoords.lng, userCoords.lat],
      zoom: DEFAULT_ZOOM,
      duration: 800,
    });
  }, [isActive, mapReady, userCoords]);

  // ── Sync place markers ─────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    placeMarkersRef.current.forEach(m => m.remove());
    placeMarkersRef.current = [];

    filteredPlaces.forEach(place => {
      const el = createPlaceMarkerEl(place, () => {
        setSelectedPost(null);
        setSelectedPlace(place);
      });
      const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([place.longitude, place.latitude])
        .addTo(map);
      placeMarkersRef.current.push(marker);
    });
  }, [filteredPlaces, mapReady]);

  // ── Sync friend markers ────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    friendPins.forEach(f => {
      const el = createFriendMarkerEl(f, () => onFriendTap(f));
      const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([f.lng, f.lat])
        .addTo(map);
      markersRef.current.push(marker);
    });
  }, [friendPins, mapReady, onFriendTap]);

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

  // ── Show/hide user pin based on permission ─────────────────────────────────
  useEffect(() => {
    if (!userMarkerRef.current) return;
    const el = userMarkerRef.current.getElement() as HTMLElement;
    el.style.display = visibleOnMap ? 'flex' : 'none';
  }, [visibleOnMap]);

  // ── Fly to selected friend ───────────────────────────────────────────────
  useEffect(() => {
    if (!selectedFriend || !mapRef.current) return;
    const friend = friendPins.find(f => f.id === selectedFriend.id);
    if (friend) {
      mapRef.current.flyTo({
        center: [friend.lng, friend.lat],
        zoom: 15,
        duration: 1000,
      });
    }
  }, [selectedFriend, friendPins]);

  // ── Recenter ───────────────────────────────────────────────────────────────
  const recenter = useCallback(() => {
    mapRef.current?.flyTo({ center: mapCenter, zoom: DEFAULT_ZOOM, duration: 800 });
    fetchNearbyPosts();
    fetchNearbyPlaces();
    fetchFriendLocations();
    Toast.show({ type: 'success', text1: t('map.centered') });
  }, [t, mapCenter, fetchNearbyPosts, fetchNearbyPlaces, fetchFriendLocations]);

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
      <View nativeID={MAP_CONTAINER_ID} style={styles.map} />

      <MapAtmosphere theme={mapTheme} />

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
              onPress={() => onFriendTap(f)}
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
          onMessage={f => { onCloseSheet(); onMessage(f); }}
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
    ...Platform.select({
      web: {
        maxWidth: 500,
        width: '100%',
        marginHorizontal: 'auto',
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: '#EBE8F5',
        position: 'relative',
        boxShadow: '0 8px 30px rgba(124, 91, 255, 0.06)',
      },
      default: {},
    }),
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
