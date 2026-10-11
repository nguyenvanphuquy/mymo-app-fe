import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import mapboxgl from 'mapbox-gl';
import { Colors, Shadows } from '../constants/colors';
import { MAPBOX_ACCESS_TOKEN } from '../constants/mapbox';
import { getMymoMapStyle } from '../utils/mapStyles';
import { reverseGeocodeMapbox, type MapGeocodeResult } from '../services/mapGeocodingApi';
import { useMapGeocodeSearch } from '../hooks/useMapGeocodeSearch';
import MapSearchDropdown from './MapSearchDropdown';
import { useI18n } from '../i18n';

mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

const FALLBACK: [number, number] = [106.8376, 10.8382];
const ZOOM = 15;

export type AddressPick = {
  address: string;
  latitude: number;
  longitude: number;
};

export default function AddressMapPicker({
  value,
  onChange,
}: {
  value: AddressPick | null;
  onChange: (value: AddressPick | null) => void;
}) {
  const { t, lang } = useI18n();
  const language = lang === 'en' ? 'en' : 'vi';
  const [query, setQuery] = useState(value?.address ?? '');
  const chosen = value?.address ?? '';
  const search = useMapGeocodeSearch(query.trim() === chosen.trim() ? '' : query);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const armed = useRef(false);
  const programmatic = useRef(false);
  const [cssLoaded, setCssLoaded] = useState(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const languageRef = useRef(language);
  languageRef.current = language;

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
    link.onerror = () => setCssLoaded(true);
    document.head.appendChild(link);
  }, []);

  const flyTo = (lng: number, lat: number) => {
    mapRef.current?.flyTo({ center: [lng, lat], zoom: ZOOM, essential: true });
  };

  useEffect(() => {
    if (!cssLoaded || !hostRef.current || mapRef.current) return;
    const start = value
      ? [value.longitude, value.latitude] as [number, number]
      : FALLBACK;
    const map = new mapboxgl.Map({
      container: hostRef.current,
      style: getMymoMapStyle('purple') as mapboxgl.Style,
      center: start,
      zoom: value ? ZOOM : 12,
      attributionControl: false,
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
    map.on('moveend', () => {
      if (!armed.current || programmatic.current) return;
      const center = map.getCenter();
      void reverseGeocodeMapbox(center.lng, center.lat, languageRef.current).then((place) => {
        const address = place ?? `${center.lat.toFixed(6)}, ${center.lng.toFixed(6)}`;
        setQuery(address);
        onChangeRef.current({
          address,
          latitude: Math.round(center.lat * 1e6) / 1e6,
          longitude: Math.round(center.lng * 1e6) / 1e6,
        });
      });
    });
    mapRef.current = map;
    if (value) armed.current = true;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // Map is created once. Later picks fly the existing map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cssLoaded]);

  const selectPlace = (result: MapGeocodeResult) => {
    const address = result.placeName.toLowerCase().includes(result.name.toLowerCase())
      ? result.placeName
      : `${result.name}, ${result.placeName}`;
    const next = {
      address,
      latitude: Math.round(result.lat * 1e6) / 1e6,
      longitude: Math.round(result.lng * 1e6) / 1e6,
    };
    setQuery(address);
    onChange(next);
    programmatic.current = true;
    flyTo(next.longitude, next.latitude);
    const enable = () => {
      programmatic.current = false;
      armed.current = true;
    };
    mapRef.current?.once('moveend', enable);
    setTimeout(enable, 900);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{t('biz.register.address')}</Text>
      <View style={styles.searchBox}>
        <Ionicons name="search" size={16} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={(text) => {
            setQuery(text);
            if (text.trim() !== chosen.trim()) onChange(null);
          }}
          onFocus={() => search.setFocused(true)}
          onBlur={() => setTimeout(() => search.setFocused(false), 180)}
          placeholder={t('biz.register.addressSearch')}
          placeholderTextColor={Colors.textMuted}
        />
        {query.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              setQuery('');
              onChange(null);
            }}
            hitSlop={8}
          >
            <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
      <MapSearchDropdown
        visible={search.showDropdown}
        loading={search.loading}
        results={search.results}
        onSelect={selectPlace}
        onClose={() => search.setFocused(false)}
      />
      <View style={styles.mapCard}>
        <View
          ref={(node) => { hostRef.current = node as unknown as HTMLDivElement | null; }}
          style={styles.map}
        />
        <View pointerEvents="none" style={styles.pin}>
          <Ionicons name="location" size={34} color={Colors.primaryDark} />
        </View>
      </View>
      <Text style={styles.hint}>{t('biz.register.addressHint')}</Text>
      {value ? <Text style={styles.address}>{value.address}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14, width: '100%' },
  label: { fontSize: 13, fontWeight: '700', color: Colors.textMid, marginBottom: 6 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...Shadows.soft,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.textDark,
    padding: 0,
    outlineStyle: 'none',
  } as object,
  mapCard: {
    height: 210,
    marginTop: 10,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Colors.primarySoft,
    ...Shadows.soft,
  },
  map: { flex: 1, width: '100%', height: '100%' },
  pin: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    marginLeft: -17,
    marginTop: -32,
  },
  hint: { marginTop: 8, fontSize: 12, color: Colors.textMuted, lineHeight: 18 },
  address: { marginTop: 4, fontSize: 14, fontWeight: '700', color: Colors.textDark, lineHeight: 20 },
});
