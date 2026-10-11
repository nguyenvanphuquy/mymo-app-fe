import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Mapbox, { Camera, MapView } from '@rnmapbox/maps';
import { Colors, Shadows } from '../constants/colors';
import { MAPBOX_ACCESS_TOKEN } from '../constants/mapbox';
import { getMymoMapStyle } from '../utils/mapStyles';
import { reverseGeocodeMapbox, type MapGeocodeResult } from '../services/mapGeocodingApi';
import { useMapGeocodeSearch } from '../hooks/useMapGeocodeSearch';
import MapSearchDropdown from './MapSearchDropdown';
import { useI18n } from '../i18n';

Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);

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
  const cameraRef = useRef<Camera>(null);
  const armed = useRef(false);
  const programmatic = useRef(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const languageRef = useRef(language);
  languageRef.current = language;

  useEffect(() => {
    if (!value) return;
    cameraRef.current?.setCamera({
      centerCoordinate: [value.longitude, value.latitude],
      zoomLevel: ZOOM,
      animationDuration: 0,
    });
    armed.current = true;
    // Center once when a saved registration is loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    cameraRef.current?.setCamera({
      centerCoordinate: [next.longitude, next.latitude],
      zoomLevel: ZOOM,
      animationDuration: 500,
    });
    setTimeout(() => {
      programmatic.current = false;
      armed.current = true;
    }, 700);
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
        <MapView
          style={styles.map}
          styleJSON={JSON.stringify(getMymoMapStyle('purple'))}
          logoEnabled={false}
          attributionEnabled={false}
          compassEnabled={false}
          scaleBarEnabled={false}
          onMapIdle={(state) => {
            if (!armed.current || programmatic.current) return;
            const [lng, lat] = state.properties.center;
            if (typeof lng !== 'number' || typeof lat !== 'number') return;
            void reverseGeocodeMapbox(lng, lat, languageRef.current).then((place) => {
              const address = place ?? `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
              setQuery(address);
              onChangeRef.current({
                address,
                latitude: Math.round(lat * 1e6) / 1e6,
                longitude: Math.round(lng * 1e6) / 1e6,
              });
            });
          }}
        >
          <Camera
            ref={cameraRef}
            defaultSettings={{
              centerCoordinate: value ? [value.longitude, value.latitude] : FALLBACK,
              zoomLevel: value ? ZOOM : 12,
            }}
          />
        </MapView>
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
  searchInput: { flex: 1, fontSize: 15, color: Colors.textDark, padding: 0 },
  mapCard: {
    height: 210,
    marginTop: 10,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Colors.primarySoft,
    ...Shadows.soft,
  },
  map: { flex: 1 },
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
