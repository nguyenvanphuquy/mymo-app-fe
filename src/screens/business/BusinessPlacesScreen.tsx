import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Pressable, Platform, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Colors, Gradients, Shadows } from '../../constants/colors';
import { useI18n } from '../../i18n';
import SparkleField from '../../components/SparkleField';
import { getMyPlaces, getPlaceCategories, type BusinessPlaceDto, type BusinessSession } from '../../services/businessApi';
import BusinessPlaceDetailScreen from './BusinessPlaceDetailScreen';
import BusinessPlaceFormScreen from './BusinessPlaceFormScreen';
import BusinessPlacePhotosScreen from './BusinessPlacePhotosScreen';
import BusinessMenuScreen from './BusinessMenuScreen';
import BusinessPromotionsScreen from './BusinessPromotionsScreen';
import { emptyPlaceForm, type BusinessPlaceFormValues } from './businessPlaceTypes';

type PlacesView = 'list' | 'detail' | 'create' | 'edit' | 'photos' | 'menu' | 'promotions';

function placeStatusStyle(status: string) {
  if (status === 'Approved') return { bg: 'rgba(16,185,129,0.92)', icon: 'checkmark-circle' as const };
  if (status === 'Pending') return { bg: 'rgba(251,191,36,0.95)', icon: 'time' as const };
  return { bg: 'rgba(156,124,255,0.92)', icon: 'ellipse' as const };
}

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

  const stats = useMemo(() => {
    const approved = places.filter(p => p.status === 'Approved').length;
    const pending = places.filter(p => p.status === 'Pending').length;
    const checkIns = places.reduce((s, p) => s + p.checkInCount, 0);
    return { total: places.length, approved, pending, checkIns };
  }, [places]);

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

  if (view === 'promotions' && selectedPlaceId) {
    return (
      <BusinessPromotionsScreen
        placeId={selectedPlaceId}
        placeName={photosPlaceName}
        onBack={() => setView('detail')}
      />
    );
  }

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
        onManagePromotions={p => {
          setPhotosPlaceName(p.name);
          setView('promotions');
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
      <SparkleField count={Platform.OS === 'web' ? 5 : 8} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={['#FFFEFF', '#F6F2FF', '#E8DFFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: insets.top + 16 }]}
        >
          <View style={styles.heroDecor1} />
          <View style={styles.heroDecor2} />
          <View style={styles.heroTop}>
            <View style={styles.heroTitleBlock}>
              <View style={styles.heroIconWrap}>
                <Ionicons name="storefront" size={22} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroTitle}>{t('biz.places.title')}</Text>
                <Text style={styles.heroSub}>{t('biz.places.heroSub')}</Text>
              </View>
            </View>
            <Pressable
              onPress={() => { void openCreate(); }}
              style={({ pressed }) => [styles.addFab, pressed && { opacity: 0.92, transform: [{ scale: 0.96 }] }]}
            >
              <Ionicons name="add" size={26} color={Colors.primary} />
            </Pressable>
          </View>

          {!loading && places.length > 0 ? (
            <View style={styles.heroStats}>
              <HeroStat icon="business-outline" value={String(stats.total)} label={t('biz.places.statBranches')} />
              <HeroStat icon="checkmark-done-outline" value={String(stats.approved)} label={t('biz.places.statApproved')} />
              <HeroStat icon="footsteps-outline" value={String(stats.checkIns)} label={t('biz.home.checkins')} />
            </View>
          ) : null}

          <Pressable
            onPress={() => { void openCreate(); }}
            style={({ pressed }) => [styles.heroCta, pressed && { opacity: 0.95 }]}
          >
            <LinearGradient
              colors={['#FFFFFF', '#F0EAFF']}
              style={styles.heroCtaGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="add-circle" size={22} color={Colors.primary} />
              <Text style={styles.heroCtaText}>{t('biz.places.addNew')}</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
            </LinearGradient>
          </Pressable>
        </LinearGradient>

        <View style={styles.listBody}>
          {loading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginTop: 32 }} />
          ) : places.length === 0 ? (
            <View style={styles.empty}>
              <LinearGradient colors={Gradients.primary} style={styles.emptyIconRing}>
                <Ionicons name="map-outline" size={32} color={Colors.white} />
              </LinearGradient>
              <Text style={styles.emptyTitle}>{t('biz.places.empty')}</Text>
              <Text style={styles.emptyDesc}>{t('biz.places.emptyDesc')}</Text>
              <Pressable onPress={() => { void openCreate(); }} style={styles.emptyCta}>
                <LinearGradient colors={Gradients.primary} style={styles.emptyCtaGrad}>
                  <Text style={styles.emptyCtaText}>+ {t('biz.places.addNew')}</Text>
                </LinearGradient>
              </Pressable>
            </View>
          ) : (
            <>
              <Text style={styles.listLabel}>{t('biz.places.yourVenues')}</Text>
              {places.map((place, index) => (
                <PlaceCard
                  key={place.placeId}
                  place={place}
                  index={index}
                  t={t}
                  onView={() => openDetail(place.placeId)}
                  onEdit={() => openEditFromPlace(place)}
                />
              ))}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function HeroStat({
  icon, value, label,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  value: string;
  label: string;
}) {
  return (
    <View style={styles.heroStat}>
      <Ionicons name={icon} size={16} color={Colors.primary} />
      <Text style={styles.heroStatVal}>{value}</Text>
      <Text style={styles.heroStatLbl} numberOfLines={1}>{label}</Text>
    </View>
  );
}

function PlaceCard({
  place, index, t, onView, onEdit,
}: {
  place: BusinessPlaceDto;
  index: number;
  t: (k: string) => string;
  onView: () => void;
  onEdit: () => void;
}) {
  const st = placeStatusStyle(place.status);
  const accent = index % 3 === 0 ? ['#DDD4FF', '#A78BFA'] : index % 3 === 1 ? ['#B7E4FF', '#7CC4FF'] : ['#FFD6EC', '#FFB8E0'];

  return (
    <TouchableOpacity activeOpacity={0.92} onPress={onView} style={styles.card}>
      <View style={styles.cardMedia}>
        {place.thumbnailUrl ? (
          <Image source={{ uri: place.thumbnailUrl }} style={styles.cardImg} />
        ) : (
          <LinearGradient colors={accent as [string, string]} style={styles.cardImgPlaceholder}>
            <Ionicons name="image-outline" size={36} color="rgba(255,255,255,0.7)" />
          </LinearGradient>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(42,23,88,0.75)']}
          style={styles.cardMediaFade}
        />
        <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
          <Ionicons name={st.icon} size={12} color={Colors.white} />
          <Text style={styles.statusBadgeText}>{place.status}</Text>
        </View>
        {place.categoryName ? (
          <View style={styles.catChip}>
            <Text style={styles.catChipText} numberOfLines={1}>{place.categoryName}</Text>
          </View>
        ) : null}
        <View style={styles.cardTitleOnImage}>
          <Text style={styles.cardNameOnImage} numberOfLines={2}>{place.name}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        {place.address ? (
          <View style={styles.addrRow}>
            <Ionicons name="location-outline" size={14} color={Colors.primary} />
            <Text style={styles.addr} numberOfLines={2}>{place.address}</Text>
          </View>
        ) : null}

        <View style={styles.metricRow}>
          <MetricPill icon="star" color="#FBBF24" label={place.averageRating.toFixed(1)} />
          <MetricPill icon="chatbubble-outline" color={Colors.primary} label={String(place.reviewCount)} sub={t('biz.places.reviews')} />
          <MetricPill icon="footsteps-outline" color={Colors.activeGreen} label={String(place.checkInCount)} sub={t('biz.places.checkins')} />
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.viewBtn} onPress={onView} activeOpacity={0.88}>
            <Ionicons name="eye-outline" size={18} color={Colors.primary} />
            <Text style={styles.viewBtnText}>{t('biz.places.view')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.editBtn} onPress={onEdit} activeOpacity={0.88}>
            <LinearGradient colors={Gradients.primary} style={styles.editBtnGrad}>
              <Ionicons name="create-outline" size={18} color={Colors.white} />
              <Text style={styles.editBtnText}>{t('biz.places.edit')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function MetricPill({
  icon, color, label, sub,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  label: string;
  sub?: string;
}) {
  return (
    <View style={styles.metricPill}>
      <Ionicons name={icon} size={14} color={color} />
      <Text style={styles.metricVal}>{label}</Text>
      {sub ? <Text style={styles.metricSub}>{sub}</Text> : null}
    </View>
  );
}

const CARD_RADIUS = 22;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FAFAFC',
    ...Platform.select({ web: { minHeight: '100%' as unknown as number } }),
  },
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
    ...Shadows.glow,
  },
  heroDecor1: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  heroDecor2: {
    position: 'absolute',
    bottom: 20,
    left: -50,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  heroTitleBlock: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.78)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { fontSize: 26, fontWeight: '900', color: Colors.textDark },
  heroSub: { fontSize: 13, color: Colors.textMid, marginTop: 4, fontWeight: '600', lineHeight: 18 },
  addFab: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.float,
  },
  heroStats: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  heroStat: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  heroStatVal: { fontSize: 20, fontWeight: '900', color: Colors.textDark, marginTop: 4 },
  heroStatLbl: { fontSize: 9, fontWeight: '800', color: Colors.textMuted, marginTop: 2, textTransform: 'uppercase' },
  heroCta: { marginTop: 16, borderRadius: 18, overflow: 'hidden', ...Shadows.soft },
  heroCtaGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  heroCtaText: { flex: 1, fontSize: 15, fontWeight: '900', color: Colors.primary },
  listBody: { paddingHorizontal: 20, paddingTop: 20 },
  listLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  empty: {
    backgroundColor: Colors.white,
    borderRadius: CARD_RADIUS,
    padding: 28,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#EEEAF5',
    ...Shadows.soft,
  },
  emptyIconRing: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 17, fontWeight: '900', color: Colors.textDark },
  emptyDesc: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
  emptyCta: { marginTop: 8, borderRadius: 16, overflow: 'hidden', alignSelf: 'stretch' },
  emptyCtaGrad: { paddingVertical: 14, alignItems: 'center' },
  emptyCtaText: { color: Colors.white, fontWeight: '900', fontSize: 15 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: CARD_RADIUS,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EEEAF5',
    ...Shadows.soft,
  },
  cardMedia: { height: 148, position: 'relative' },
  cardImg: { width: '100%', height: '100%' },
  cardImgPlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  cardMediaFade: { ...StyleSheet.absoluteFillObject },
  statusBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusBadgeText: { fontSize: 10, fontWeight: '900', color: Colors.white, textTransform: 'uppercase' },
  catChip: {
    position: 'absolute',
    top: 12,
    left: 12,
    maxWidth: '55%',
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  catChipText: { fontSize: 10, fontWeight: '800', color: Colors.textDark },
  cardTitleOnImage: { position: 'absolute', left: 14, right: 14, bottom: 12 },
  cardNameOnImage: { fontSize: 18, fontWeight: '900', color: Colors.white, textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  cardBody: { padding: 16 },
  addrRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 12 },
  addr: { flex: 1, fontSize: 13, color: Colors.textMid, fontWeight: '600', lineHeight: 18 },
  metricRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  metricPill: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: Colors.primaryTint,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  metricVal: { fontSize: 13, fontWeight: '900', color: Colors.textDark },
  metricSub: { width: '100%', textAlign: 'center', fontSize: 9, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase' },
  actions: { flexDirection: 'row', gap: 10 },
  viewBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: Colors.primaryTint,
    borderWidth: 1,
    borderColor: Colors.primarySoft,
  },
  viewBtnText: { fontWeight: '800', color: Colors.primary, fontSize: 13 },
  editBtn: { flex: 1.15, borderRadius: 14, overflow: 'hidden', ...Shadows.glow },
  editBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  editBtnText: { fontWeight: '800', color: Colors.white, fontSize: 13 },
});
