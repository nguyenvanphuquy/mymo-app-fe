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
import Toast from 'react-native-toast-message';

// ─── Mapbox GL JS (web-only) ──────────────────────────────────────────────────
import mapboxgl from 'mapbox-gl';

const MAPBOX_TOKEN = 'pk.eyJ1IjoiYm9uZHpwcm9ubzEiLCJhIjoiY21yMXExczYwMHMwejJwcHJ1b3NzY216bSJ9.YrjzCaT5z32W_kCTOwQOGw';
mapboxgl.accessToken = MAPBOX_TOKEN;

// ─── Default center: Tòa S1.07, Vinhomes Grand Park, Quận 9 ──────────────────
const DEFAULT_CENTER: [number, number] = [106.8376, 10.8382];
const DEFAULT_ZOOM = 17;

// ─── Custom MYMO Purple style for Mapbox ─────────────────────────────────────
const MYMO_STYLE: mapboxgl.Style = {
  version: 8,
  name: 'MYMO Purple',
  glyphs: 'mapbox://fonts/mapbox/{fontstack}/{range}',
  sprite: 'mapbox://sprites/mapbox/streets-v11',
  sources: {
    composite: {
      type: 'vector',
      url: 'mapbox://mapbox.mapbox-streets-v8,mapbox.mapbox-terrain-v2',
    },
  },
  layers: [
    { id: 'background',      type: 'background', paint: { 'background-color': '#F6F2FF' } },
    { id: 'landuse',         type: 'fill',   source: 'composite', 'source-layer': 'landuse',
      paint: { 'fill-color': '#EDE8FF', 'fill-opacity': 0.9 } },
    { id: 'landcover',       type: 'fill',   source: 'composite', 'source-layer': 'landcover',
      paint: { 'fill-color': '#D8CCFF', 'fill-opacity': 0.7 } },
    { id: 'national-park',   type: 'fill',   source: 'composite', 'source-layer': 'landuse',
      filter: ['==', ['get', 'class'], 'national_park'],
      paint: { 'fill-color': '#C8BBFF', 'fill-opacity': 0.8 } },
    { id: 'water',           type: 'fill',   source: 'composite', 'source-layer': 'water',
      paint: { 'fill-color': '#B8A9FF', 'fill-opacity': 0.85 } },
    { id: 'water-stroke',    type: 'line',   source: 'composite', 'source-layer': 'water',
      paint: { 'line-color': '#9C87FF', 'line-width': 1.5, 'line-opacity': 0.6 } },
    { id: 'building',        type: 'fill',   source: 'composite', 'source-layer': 'building',
      paint: { 'fill-color': '#DDD4FF', 'fill-opacity': 0.75 } },
    { id: 'building-outline',type: 'line',   source: 'composite', 'source-layer': 'building',
      paint: { 'line-color': '#C4B5FF', 'line-width': 0.5 } },
    { id: 'road-case',       type: 'line',   source: 'composite', 'source-layer': 'road',
      filter: ['==', ['geometry-type'], 'LineString'],
      paint: { 'line-color': '#C8BCFF',
        'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1, 16, 6] as any,
        'line-opacity': 0.5 } },
    { id: 'road',            type: 'line',   source: 'composite', 'source-layer': 'road',
      filter: ['==', ['geometry-type'], 'LineString'],
      paint: { 'line-color': '#EEE9FF',
        'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.8, 16, 5] as any } },
    { id: 'road-major',      type: 'line',   source: 'composite', 'source-layer': 'road',
      filter: ['in', ['get', 'class'], ['literal', ['primary','secondary','tertiary','trunk']]],
      paint: { 'line-color': '#FFFFFF',
        'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1.5, 16, 8] as any } },
    { id: 'road-highway',    type: 'line',   source: 'composite', 'source-layer': 'road',
      filter: ['in', ['get', 'class'], ['literal', ['motorway','motorway_link']]],
      paint: { 'line-color': '#EDE8FF',
        'line-width': ['interpolate', ['linear'], ['zoom'], 10, 2, 16, 10] as any } },
    { id: 'road-label',      type: 'symbol', source: 'composite', 'source-layer': 'road',
      layout: {
        'text-field': ['get', 'name'] as any,
        'text-font': ['DIN Pro Regular', 'Arial Unicode MS Regular'],
        'text-size': 10,
        'symbol-placement': 'line',
      },
      paint: { 'text-color': '#7C5BFF', 'text-halo-color': '#FFFFFF', 'text-halo-width': 2 } },
    { id: 'place-label',     type: 'symbol', source: 'composite', 'source-layer': 'place_label',
      layout: {
        'text-field': ['get', 'name'] as any,
        'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 8, 10, 14, 16] as any,
      },
      paint: { 'text-color': '#3A2470', 'text-halo-color': '#F6F2FF', 'text-halo-width': 2 } },
  ],
};

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

// ─────────────────────────────────────────────────────────────────────────────

export default function MapScreen({
  locationGranted, visibleOnMap, incognito, isActive = true,
  onFriendTap, selectedFriend, onCloseSheet, onMessage,
}: MapScreenProps) {
  const { t } = useI18n();
  const [searchText, setSearchText] = useState('');
  const [cssLoaded, setCssLoaded] = useState(false);
  const [mapTheme, setMapTheme] = useState<'purple' | 'yellow'>('purple');
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [nearbyPosts, setNearbyPosts] = useState<NearbyPost[]>([]);
  const [nearbyPlaces, setNearbyPlaces] = useState<PlaceSummary[]>([]);
  const [selectedPost, setSelectedPost] = useState<PostView | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<PlaceSummary | null>(null);
  const [friendPins, setFriendPins] = useState<MapFriendPin[]>([]);
  const [mapReady, setMapReady] = useState(false);

  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const postMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const placeMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const hasFittedPostsRef = useRef(false);
  const MAP_CONTAINER_ID = 'mymo-mapbox-container';

  const mapCenter: [number, number] = userCoords
    ? [userCoords.lng, userCoords.lat]
    : DEFAULT_CENTER;

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

  // ── Share own location with server ───────────────────────────────────────
  useEffect(() => {
    if (!locationGranted || !userCoords) return;
    const sharing = visibleOnMap && !incognito;
    updateUserLocation(
      sharing ? userCoords.lat : null,
      sharing ? userCoords.lng : null,
    );
  }, [locationGranted, visibleOnMap, incognito, userCoords?.lat, userCoords?.lng]);

  // ── Fetch friend locations ─────────────────────────────────────────────────
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

  // ── Fetch nearby posts ─────────────────────────────────────────────────────
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

  // ── Apply theme colors to map layers ───────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    const applyColors = () => {
      const isPurple = mapTheme === 'purple';
      const colors = isPurple ? {
        background: '#F5F0FF',
        water: '#C3B5FF',
        landuse: '#E8DFFF',
        building: '#DDD4FF',
        parks: '#E2D8FF',
      } : {
        background: '#FAF6E6', // Sunny light yellow
        water: '#BDE3FF',      // Beautiful light blue water
        landuse: '#F5EDA3',    // Light yellow-green parks
        building: '#FAF0CD',   // Light yellow buildings
        parks: '#E9E0A6',      // Sunny green-yellow parks
      };

      const layerPaintProperties: { [layerId: string]: [string, string] } = {
        'background': ['background-color', colors.background],
        'water': ['fill-color', colors.water],
        'landuse': ['fill-color', colors.landuse],
        'building': ['fill-color', colors.building],
        'national-park': ['fill-color', colors.parks],
        'park-outline': ['line-color', colors.parks],
        'landuse-park': ['fill-color', colors.parks],
        'building-outline': ['line-color', colors.building],
      };

      try {
        Object.entries(layerPaintProperties).forEach(([layerId, [prop, value]]) => {
          if (map.getLayer(layerId)) {
            map.setPaintProperty(layerId, prop, value);
          }
        });
      } catch (err) {
        console.warn('Error applying style paint properties:', err);
      }
    };

    if (map.isStyleLoaded()) {
      applyColors();
    } else {
      map.on('style.load', applyColors);
    }
  }, [mapTheme, cssLoaded]);

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
      style: 'mapbox://styles/mapbox/streets-v12',
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
      userMarkerRef.current = null;
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cssLoaded]);

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

    if (nearbyPosts.length > 0 && !hasFittedPostsRef.current) {
      hasFittedPostsRef.current = true;
      if (nearbyPosts.length === 1) {
        const post = nearbyPosts[0];
        map.flyTo({
          center: [post.longitude, post.latitude],
          zoom: DEFAULT_ZOOM,
          duration: 800,
        });
      } else {
        const bounds = new mapboxgl.LngLatBounds();
        nearbyPosts.forEach(p => bounds.extend([p.longitude, p.latitude]));
        if (userCoords) bounds.extend([userCoords.lng, userCoords.lat]);
        map.fitBounds(bounds, { padding: 80, maxZoom: DEFAULT_ZOOM, duration: 800 });
      }
    }
  }, [filteredPosts, nearbyPosts.length, mapReady, userCoords]);

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

  return (
    <View style={styles.container}>
      {/* ── Real Mapbox GL map container ── */}
      <View nativeID={MAP_CONTAINER_ID} style={styles.map} />

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
          style={[styles.searchRow, Platform.OS === 'web' ? { pointerEvents: 'auto' as const } : undefined]}
          pointerEvents={Platform.OS === 'web' ? undefined : 'auto'}
        >
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
        <TouchableOpacity onPress={zoomIn}   style={styles.zoomBtn}>
          <Ionicons name="add"            size={20} color={Colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={zoomOut}  style={styles.zoomBtn}>
          <Ionicons name="remove"         size={20} color={Colors.primary} />
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
    backgroundColor: Colors.primaryTint,
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
