import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Image, Platform, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Colors, Shadows } from '../../constants/colors';
import { useI18n } from '../../i18n';
import {
  getMyPlaceById,
  getPlaceModels,
  updatePlaceModel3D,
  type BusinessPlaceDto,
  type PlaceModel3D,
} from '../../services/businessApi';
import { MAPBOX_ACCESS_TOKEN } from '../../constants/mapbox';
import Model3DViewer from '../../components/Model3DViewer';

function mapPreviewUrl(lat: number, lng: number) {
  return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+7c3aed(${lng},${lat})/${lng},${lat},14,0/600x280@2x?access_token=${MAPBOX_ACCESS_TOKEN}`;
}

export default function BusinessPlaceDetailScreen({
  placeId,
  openModelPickerOnLoad = false,
  onBack,
  onEdit,
  onManagePhotos,
  onManageMenu,
  onManagePromotions,
}: {
  placeId: string;
  openModelPickerOnLoad?: boolean;
  onBack: () => void;
  onEdit: (place: BusinessPlaceDto) => void;
  onManagePhotos: (place: BusinessPlaceDto) => void;
  onManageMenu: (place: BusinessPlaceDto) => void;
  onManagePromotions: (place: BusinessPlaceDto) => void;
}) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [place, setPlace] = useState<BusinessPlaceDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [models, setModels] = useState<PlaceModel3D[]>([]);
  const [modelKey, setModelKey] = useState<string | null>(null);
  const [savingModel, setSavingModel] = useState(false);
  const [autoOpenedPicker, setAutoOpenedPicker] = useState(false);
  const modelChoicesRef = useRef<ScrollView>(null);
  const modelChoicesX = useRef(0);

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

  const openModelPicker = async () => {
    try {
      const catalog = models.length > 0 ? models : await getPlaceModels();
      setModels(catalog);
      setModelKey(place?.model3DKey ?? catalog[0]?.key ?? null);
      setModelPickerOpen(true);
    } catch (e) {
      Toast.show({ type: 'error', text1: e instanceof Error ? e.message : 'Không tải được mẫu 3D' });
    }
  };

  useEffect(() => {
    if (!openModelPickerOnLoad || autoOpenedPicker || !place) return;
    setAutoOpenedPicker(true);
    void openModelPicker();
  }, [autoOpenedPicker, openModelPickerOnLoad, place]);

  const saveModel = async () => {
    if (!place) return;
    try {
      setSavingModel(true);
      const updated = await updatePlaceModel3D(place.placeId, modelKey);
      setPlace(updated);
      setModelPickerOpen(false);
      Toast.show({ type: 'success', text1: 'Đã lưu nhà 3D cho cơ sở' });
    } catch (e) {
      Toast.show({ type: 'error', text1: e instanceof Error ? e.message : 'Không lưu được mẫu 3D' });
    } finally {
      setSavingModel(false);
    }
  };

  const scrollModelChoices = (direction: -1 | 1) => {
    const nextX = Math.max(0, modelChoicesX.current + direction * 240);
    modelChoicesRef.current?.scrollTo({ x: nextX, animated: true });
    modelChoicesX.current = nextX;
  };

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
        <Text style={styles.mapLabel}>Nhà 3D trên bản đồ</Text>
        {place.model3DUrl ? (
          <Model3DViewer src={place.model3DUrl} style={styles.modelPreview} />
        ) : (
          <View style={[styles.modelPreview, styles.heroPlaceholder]}>
            <Ionicons name="cube-outline" size={34} color={Colors.primary} />
            <Text style={styles.modelEmpty}>Cơ sở chưa chọn nhà 3D</Text>
          </View>
        )}
        <TouchableOpacity style={styles.modelBtn} onPress={openModelPicker} activeOpacity={0.88}>
          <Ionicons name="cube-outline" size={19} color={Colors.white} />
          <Text style={styles.modelBtnText}>
            {place.model3DKey ? 'Đổi nhà 3D' : 'Chọn nhà 3D'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.photosBtn} onPress={() => onManagePhotos(place)} activeOpacity={0.88}>
          <Ionicons name="images-outline" size={18} color={Colors.primary} />
          <Text style={styles.photosBtnText}>{t('biz.places.photos.manage') ?? 'Manage Photos'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.photosBtn} onPress={() => onManageMenu(place)} activeOpacity={0.88}>
          <Ionicons name="restaurant-outline" size={18} color={Colors.primary} />
          <Text style={styles.photosBtnText}>{t('biz.menu.manage') ?? 'Manage Menu'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.photosBtn} onPress={() => onManagePromotions(place)} activeOpacity={0.88}>
          <Ionicons name="flame-outline" size={18} color={Colors.primary} />
          <Text style={styles.photosBtnText}>{t('biz.promo.manage') ?? 'Promotions'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.editBtn} onPress={() => onEdit(place)} activeOpacity={0.88}>
          <Text style={styles.editBtnText}>{t('biz.places.edit')}</Text>
        </TouchableOpacity>
      </ScrollView>
      <Modal
        visible={modelPickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setModelPickerOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modelModal}>
            <View style={styles.modelModalHeader}>
              <View>
                <Text style={styles.modelModalTitle}>Chọn nhà 3D</Text>
                <Text style={styles.modelModalHint}>Mô hình sẽ xuất hiện tại điểm quán trên bản đồ.</Text>
              </View>
              <TouchableOpacity onPress={() => setModelPickerOpen(false)} hitSlop={10}>
                <Ionicons name="close" size={24} color={Colors.textDark} />
              </TouchableOpacity>
            </View>
            <View style={styles.modelChoicesRow}>
              <TouchableOpacity
                style={styles.modelScrollBtn}
                onPress={() => scrollModelChoices(-1)}
                accessibilityLabel="Xem mẫu nhà trước"
              >
                <Ionicons name="chevron-back" size={18} color={Colors.primary} />
              </TouchableOpacity>
              <ScrollView
                ref={modelChoicesRef}
                horizontal
                nestedScrollEnabled
                showsHorizontalScrollIndicator={false}
                scrollEventThrottle={16}
                onScroll={event => {
                  modelChoicesX.current = event.nativeEvent.contentOffset.x;
                }}
                contentContainerStyle={styles.modelChoices}
                style={styles.modelChoicesScroll}
              >
                {models.map(model => (
                  <TouchableOpacity
                    key={model.key}
                    style={[styles.modelChoice, modelKey === model.key && styles.modelChoiceOn]}
                    onPress={() => setModelKey(model.key)}
                  >
                    <Ionicons name="home-outline" size={16} color={modelKey === model.key ? Colors.white : Colors.primary} />
                    <Text style={[styles.modelChoiceText, modelKey === model.key && styles.modelChoiceTextOn]}>
                      {model.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={styles.modelScrollBtn}
                onPress={() => scrollModelChoices(1)}
                accessibilityLabel="Xem mẫu nhà tiếp theo"
              >
                <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
              </TouchableOpacity>
            </View>
            {models.find(model => model.key === modelKey)?.url ? (
              <Model3DViewer
                src={models.find(model => model.key === modelKey)!.url}
                style={styles.modelPickerPreview}
              />
            ) : null}
            <View style={styles.modelActions}>
              <TouchableOpacity style={styles.removeModelBtn} onPress={() => setModelKey(null)}>
                <Text style={styles.removeModelText}>Gỡ mô hình</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveModelBtn} onPress={saveModel} disabled={savingModel}>
                {savingModel ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.saveModelText}>Lưu lên bản đồ</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  modelPreview: {
    width: '100%',
    height: Platform.OS === 'web' ? 230 : 150,
    borderRadius: 18,
    marginBottom: 10,
  },
  modelEmpty: { marginTop: 8, color: Colors.textMuted, fontWeight: '700' },
  modelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 14,
    marginBottom: 16,
  },
  modelBtnText: { color: Colors.white, fontWeight: '900', fontSize: 15 },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(42,23,88,0.28)',
  },
  modelModal: {
    maxHeight: '86%',
    backgroundColor: '#FBFAFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 18,
  },
  modelModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  modelModalTitle: { fontSize: 20, fontWeight: '900', color: Colors.textDark },
  modelModalHint: { marginTop: 3, fontSize: 12, color: Colors.textMuted },
  modelChoicesRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  modelChoicesScroll: { flex: 1, minWidth: 0 },
  modelChoices: { gap: 8, paddingVertical: 14, paddingHorizontal: 2 },
  modelScrollBtn: {
    width: 30,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryTint,
    borderWidth: 1,
    borderColor: Colors.primarySoft,
  },
  modelChoice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modelChoiceOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  modelChoiceText: { color: Colors.primaryDark, fontWeight: '800', fontSize: 12 },
  modelChoiceTextOn: { color: Colors.white },
  modelPickerPreview: { width: '100%', height: 310, borderRadius: 20 },
  modelActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  removeModelBtn: {
    flex: 0.8,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 15,
    backgroundColor: Colors.primarySoft,
  },
  removeModelText: { color: Colors.primaryDark, fontWeight: '800' },
  saveModelBtn: {
    flex: 1.2,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 15,
    backgroundColor: Colors.primary,
  },
  saveModelText: { color: Colors.white, fontWeight: '900' },
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
