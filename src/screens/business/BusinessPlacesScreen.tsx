import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Pressable, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Colors, Shadows } from '../../constants/colors';
import { useI18n } from '../../i18n';
import { getMyPlaces, getPlaceCategories, type BusinessPlaceDto, type BusinessSession } from '../../services/businessApi';
import BusinessPlaceDetailScreen from './BusinessPlaceDetailScreen';
import BusinessPlaceFormScreen from './BusinessPlaceFormScreen';
import BusinessPlacePhotosScreen from './BusinessPlacePhotosScreen';
import BusinessMenuScreen from './BusinessMenuScreen';
import { emptyPlaceForm, type BusinessPlaceFormValues } from './businessPlaceTypes';

type PlacesView = 'list' | 'detail' | 'create' | 'edit' | 'photos' | 'menu';

export default function BusinessPlacesScreen({ session: _session }: { session: BusinessSession }) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [view, setView] = useState<PlacesView>('list');
  const [places, setPlaces] = useState<BusinessPlaceDto[]>([]);
  const [categories, setCategories] = useState<{ placeCategoryId: string; name: string }[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<BusinessPlaceFormValues | null>(null);
  const [editPlaceId, setEditPlaceId] = useState<string | null>(null);
  const [photosPlaceName, setPhotosPlaceName] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [cats, list] = await Promise.all([getPlaceCategories(), getMyPlaces()]);
      setCategories(cats);
      setPlaces(list);
    } catch (e) {
      Toast.show({ type: 'error', text1: e instanceof Error ? e.message : 'Load failed' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = async () => {
    let cats = categories;
    if (cats.length === 0) {
      try {
        cats = await getPlaceCategories();
        setCategories(cats);
      } catch (e) {
        Toast.show({
          type: 'error',
          text1: e instanceof Error ? e.message : 'Cannot load categories',
        });
        return;
      }
    }
    if (!cats.length || !cats[0]?.placeCategoryId) {
      Toast.show({ type: 'error', text1: t('biz.places.noCategory') });
      return;
    }
    setEditForm(emptyPlaceForm(cats[0].placeCategoryId));
    setEditPlaceId(null);
    setSelectedPlaceId(null);
    setView('create');
  };

  const openDetail = (placeId: string) => {
    setSelectedPlaceId(placeId);
    setView('detail');
  };

  const openEditFromPlace = (place: BusinessPlaceDto) => {
    setEditPlaceId(place.placeId);
    setEditForm({
      name: place.name,
      categoryId: place.categoryId,
      description: place.description ?? '',
      address: place.address ?? '',
      latitude: String(place.latitude),
      longitude: String(place.longitude),
      phone: place.phone ?? '',
      openingHours: place.openingHours ?? '',
      thumbnailUrl: place.thumbnailUrl ?? '',
    });
    setView('edit');
  };

  const backToList = () => {
    setView('list');
    setSelectedPlaceId(null);
    setEditForm(null);
    setEditPlaceId(null);
    load();
  };

  if (view === 'menu' && selectedPlaceId) {
    return (
      <BusinessMenuScreen
        placeId={selectedPlaceId}
        placeName={photosPlaceName}
        onBack={() => setView('detail')}
      />
    );
  }

  if (view === 'photos' && selectedPlaceId) {
    return (
      <BusinessPlacePhotosScreen
        placeId={selectedPlaceId}
        placeName={photosPlaceName}
        onBack={() => setView('detail')}
      />
    );
  }

  if (view === 'detail' && selectedPlaceId) {
    return (
      <BusinessPlaceDetailScreen
        placeId={selectedPlaceId}
        onBack={backToList}
        onEdit={p => {
          openEditFromPlace(p);
        }}
        onManagePhotos={p => {
          setPhotosPlaceName(p.name);
          setView('photos');
        }}
        onManageMenu={p => {
          setPhotosPlaceName(p.name);
          setView('menu');
        }}
      />
    );
  }

  if ((view === 'create' || view === 'edit') && editForm) {
    return (
      <BusinessPlaceFormScreen
        mode={view === 'create' ? 'create' : 'edit'}
        initial={editForm}
        placeId={editPlaceId ?? undefined}
        categories={categories}
        onBack={() => (selectedPlaceId ? setView('detail') : backToList())}
        onSaved={backToList}
      />
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleRow}>
          <Text style={styles.title}>{t('biz.places.title')}</Text>
          <Pressable
            onPress={() => { void openCreate(); }}
            style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.9 }]}
          >
            <Ionicons name="add" size={22} color={Colors.white} />
            <Text style={styles.addText}>{t('biz.places.addNew')}</Text>
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 24 }} />
        ) : places.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="location-outline" size={28} color={Colors.primary} />
            <Text style={styles.emptyTitle}>{t('biz.places.empty')}</Text>
            <Text style={styles.emptyDesc}>{t('biz.places.emptyDesc')}</Text>
            <Pressable onPress={() => { void openCreate(); }} style={styles.emptyCta}>
              <Text style={styles.emptyCtaText}>+ {t('biz.places.addNew')}</Text>
            </Pressable>
          </View>
        ) : (
          places.map(place => (
            <View key={place.placeId} style={styles.card}>
              <Text style={styles.name}>{place.name}</Text>
              <Text style={styles.addr}>{place.address}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.meta}>⭐ {place.averageRating.toFixed(1)}</Text>
                <Text style={styles.meta}>{t('biz.places.reviews')}: {place.reviewCount}</Text>
                <Text style={styles.meta}>{t('biz.places.checkins')}: {place.checkInCount}</Text>
              </View>
              <View style={[styles.pill, place.status === 'Approved' ? styles.pillOn : styles.pillOff]}>
                <Text style={styles.pillText}>{t('biz.places.status')}: {place.status}</Text>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity style={styles.viewBtn} onPress={() => openDetail(place.placeId)}>
                  <Text style={styles.viewBtnText}>{t('biz.places.view')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.editBtn} onPress={() => openEditFromPlace(place)}>
                  <Text style={styles.editBtnText}>{t('biz.places.edit')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.primaryTint, ...Platform.select({ web: { minHeight: '100%' as unknown as number } }) },
  scroll: { paddingHorizontal: 20 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 8 },
  title: { fontSize: 22, fontWeight: '900', color: Colors.textDark, flex: 1 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14,
  },
  addText: { color: Colors.white, fontWeight: '800', fontSize: 12 },
  empty: { backgroundColor: Colors.white, borderRadius: 22, padding: 24, alignItems: 'center', gap: 8, ...Shadows.soft },
  emptyTitle: { fontSize: 14, fontWeight: '800', color: Colors.textDark },
  emptyDesc: { fontSize: 12, color: Colors.textMuted, textAlign: 'center' },
  emptyCta: { marginTop: 12, backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 14 },
  emptyCtaText: { color: Colors.white, fontWeight: '800' },
  card: { backgroundColor: Colors.white, borderRadius: 20, padding: 16, marginBottom: 12, ...Shadows.soft },
  name: { fontSize: 16, fontWeight: '800', color: Colors.textDark },
  addr: { fontSize: 12, color: Colors.textMid, marginTop: 4 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  meta: { fontSize: 12, color: Colors.textMid, fontWeight: '600' },
  pill: { alignSelf: 'flex-start', marginTop: 10, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  pillOn: { backgroundColor: 'rgba(16,185,129,0.15)' },
  pillOff: { backgroundColor: Colors.primarySoft },
  pillText: { fontSize: 11, fontWeight: '800', color: Colors.textDark },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  viewBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: Colors.primaryTint, alignItems: 'center' },
  viewBtnText: { fontWeight: '800', color: Colors.primary, fontSize: 13 },
  editBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: Colors.primary, alignItems: 'center' },
  editBtnText: { fontWeight: '800', color: Colors.white, fontSize: 13 },
});
