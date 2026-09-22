import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Image, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Colors, Shadows } from '../../constants/colors';
import { useI18n } from '../../i18n';
import { getMyPlaceById, type BusinessPlaceDto } from '../../services/businessApi';
import { MAPBOX_ACCESS_TOKEN } from '../../constants/mapbox';

function mapPreviewUrl(lat: number, lng: number) {
  return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+7c3aed(${lng},${lat})/${lng},${lat},14,0/600x280@2x?access_token=${MAPBOX_ACCESS_TOKEN}`;
}

export default function BusinessPlaceDetailScreen({
  placeId,
  onBack,
  onEdit,
  onManagePhotos,
  onManageMenu,
}: {
  placeId: string;
  onBack: () => void;
  onEdit: (place: BusinessPlaceDto) => void;
  onManagePhotos: (place: BusinessPlaceDto) => void;
  onManageMenu: (place: BusinessPlaceDto) => void;
}) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [place, setPlace] = useState<BusinessPlaceDto | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setPlace(await getMyPlaceById(placeId));
    } catch (e) {
      Toast.show({ type: 'error', text1: e instanceof Error ? e.message : 'Load failed' });
    } finally {
      setLoading(false);
    }
  }, [placeId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <View style={[styles.root, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  if (!place) {
    return (
      <View style={[styles.root, styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.muted}>Place not found</Text>
        <TouchableOpacity onPress={onBack}><Text style={styles.link}>{t('common.back') ?? 'Back'}</Text></TouchableOpacity>
      </View>
    );
  }

  const statusStyle = place.status === 'Approved' ? styles.statusOk : styles.statusPending;

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={Colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{place.name}</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {place.thumbnailUrl ? (
          <Image source={{ uri: place.thumbnailUrl }} style={styles.hero} />
        ) : (
          <View style={[styles.hero, styles.heroPlaceholder]}>
            <Ionicons name="image-outline" size={32} color={Colors.textMuted} />
          </View>
        )}
        <View style={[styles.statusPill, statusStyle]}>
          <Text style={styles.statusText}>{place.status}</Text>
        </View>
        <View style={styles.statsRow}>
          <Stat icon="star" label={t('biz.places.rating')} value={place.averageRating.toFixed(1)} />
          <Stat icon="chatbubble-outline" label={t('biz.places.reviews')} value={String(place.reviewCount)} />
          <Stat icon="footsteps-outline" label={t('biz.places.checkins')} value={String(place.checkInCount)} />
        </View>
        <Info label={t('biz.places.fieldCategory')} value={place.categoryName ?? place.categoryId} />
        <Info label={t('biz.places.fieldAddress')} value={place.address ?? '—'} />
        <Info label={t('biz.places.fieldPhone')} value={place.phone ?? '—'} />
        <Info label={t('biz.places.hours')} value={place.openingHours ?? '—'} />
        {place.description ? <Info label={t('biz.places.fieldDescription')} value={place.description} /> : null}
        <Text style={styles.mapLabel}>{t('biz.places.location')}</Text>
        <Image source={{ uri: mapPreviewUrl(place.latitude, place.longitude) }} style={styles.map} resizeMode="cover" />
        <Text style={styles.coords}>{place.latitude}, {place.longitude}</Text>
        <TouchableOpacity style={styles.photosBtn} onPress={() => onManagePhotos(place)} activeOpacity={0.88}>
          <Ionicons name="images-outline" size={18} color={Colors.primary} />
          <Text style={styles.photosBtnText}>{t('biz.places.photos.manage') ?? 'Manage Photos'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.photosBtn} onPress={() => onManageMenu(place)} activeOpacity={0.88}>
          <Ionicons name="restaurant-outline" size={18} color={Colors.primary} />
          <Text style={styles.photosBtnText}>{t('biz.menu.manage') ?? 'Manage Menu'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.editBtn} onPress={() => onEdit(place)} activeOpacity={0.88}>
          <Text style={styles.editBtnText}>{t('biz.places.edit')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function Stat({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={16} color={Colors.primary} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.info}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.primaryTint },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '900', color: Colors.textDark, textAlign: 'center' },
  scroll: { paddingHorizontal: 20, paddingBottom: 120 },
  hero: { width: '100%', height: 180, borderRadius: 20, marginBottom: 12, backgroundColor: Colors.white, ...Shadows.soft },
  heroPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  statusPill: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginBottom: 14 },
  statusOk: { backgroundColor: 'rgba(16,185,129,0.15)' },
  statusPending: { backgroundColor: Colors.primarySoft },
  statusText: { fontSize: 12, fontWeight: '800', color: Colors.textDark },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  stat: { flex: 1, backgroundColor: Colors.white, borderRadius: 16, padding: 12, alignItems: 'center', ...Shadows.soft },
  statValue: { fontSize: 18, fontWeight: '900', color: Colors.textDark, marginTop: 4 },
  statLabel: { fontSize: 10, color: Colors.textMuted, marginTop: 2, textAlign: 'center' },
  info: { backgroundColor: Colors.white, borderRadius: 14, padding: 14, marginBottom: 10, ...Shadows.soft },
  infoLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted },
  infoValue: { fontSize: 14, color: Colors.textDark, marginTop: 4, lineHeight: 20 },
  mapLabel: { fontSize: 13, fontWeight: '800', color: Colors.textDark, marginTop: 8, marginBottom: 8 },
  map: { width: '100%', height: Platform.OS === 'web' ? 200 : 160, borderRadius: 16, backgroundColor: Colors.primarySoft },
  coords: { fontSize: 11, color: Colors.textMuted, marginTop: 6, marginBottom: 16, textAlign: 'center' },
  photosBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.white, borderRadius: 16, paddingVertical: 14, marginBottom: 10, ...Shadows.soft,
  },
  photosBtnText: { color: Colors.primary, fontWeight: '800', fontSize: 15 },
  editBtn: { backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  editBtnText: { color: Colors.white, fontWeight: '800', fontSize: 16 },
  muted: { color: Colors.textMuted },
  link: { color: Colors.primary, fontWeight: '700', marginTop: 12 },
});
