import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../constants/colors';
import { useI18n } from '../i18n';
import type { MapGeocodeResult } from '../services/mapGeocodingApi';

interface MapSearchDropdownProps {
  visible: boolean;
  loading: boolean;
  results: MapGeocodeResult[];
  onSelect: (result: MapGeocodeResult) => void;
  onClose: () => void;
}

export default function MapSearchDropdown({
  visible,
  loading,
  results,
  onSelect,
  onClose,
}: MapSearchDropdownProps) {
  const { t } = useI18n();
  if (!visible) return null;

  return (
    <View style={styles.wrap}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        style={styles.list}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
      >
        {loading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={Colors.primary} />
          </View>
        )}

        {!loading && results.length === 0 && (
          <View style={styles.emptyRow}>
            <Text style={styles.emptyText}>{t('map.searchNoResults')}</Text>
          </View>
        )}

        {results.map(result => (
          <TouchableOpacity
            key={result.id}
            style={styles.row}
            activeOpacity={0.85}
            onPress={() => {
              onSelect(result);
              onClose();
            }}
          >
            <View style={styles.iconWrap}>
              <Ionicons name="location-outline" size={16} color={Colors.primary} />
            </View>
            <View style={styles.copy}>
              <Text style={styles.title} numberOfLines={1}>{result.name}</Text>
              <Text style={styles.sub} numberOfLines={2}>{result.placeName}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 8,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderWidth: 1,
    borderColor: '#EBE8F5',
    overflow: 'hidden',
    maxHeight: 260,
    zIndex: 20,
    elevation: 20,
    ...Shadows.float,
  },
  list: {
    maxHeight: 260,
  },
  loadingRow: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  emptyRow: {
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F1F8',
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: Colors.primaryTint,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  copy: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textDark,
    marginBottom: 2,
  },
  sub: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 16,
  },
});
