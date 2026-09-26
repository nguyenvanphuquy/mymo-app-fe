import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Image, Platform, Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Colors, Gradients, Shadows } from '../../constants/colors';
import { useI18n } from '../../i18n';
import BusinessScreenHeader from '../../components/business/BusinessScreenHeader';
import {
  deletePlacePhoto,
  getPlacePhotos,
  setPlacePhotoPrimary,
  sortPlacePhotos,
  uploadPlacePhoto,
  type PlacePhotoDto,
} from '../../services/businessPlacePhotosApi';
import { buildImageFormData, guessImageMeta } from '../../utils/imageFormData';

const GRID_GAP = 10;
const COLS = 2;
const H_PAD = 20;

function mergePhotos(prev: PlacePhotoDto[], incoming: PlacePhotoDto[]): PlacePhotoDto[] {
  const map = new Map<string, PlacePhotoDto>();
  for (const p of prev) map.set(p.id, p);
  for (const p of incoming) map.set(p.id, p);
  return sortPlacePhotos([...map.values()]);
}

function uniqueUploadName(index: number, uri: string, mimeType?: string | null): string {
  const meta = guessImageMeta(uri, `photo-${index}.jpg`);
  const ext = meta.fileName.includes('.') ? meta.fileName.split('.').pop() : 'jpg';
  return `place-${Date.now()}-${index}.${ext ?? 'jpg'}`;
}

export default function BusinessPlacePhotosScreen({
  placeId,
  placeName,
  onBack,
}: {
  placeId: string;
  placeName: string;
  onBack: () => void;
}) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [photos, setPhotos] = useState<PlacePhotoDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadIndex, setUploadIndex] = useState(0);
  const [uploadTotal, setUploadTotal] = useState(0);

  const tileWidth = useMemo(() => {
    const screenW = Dimensions.get('window').width;
    const maxW = Platform.OS === 'web' ? Math.min(screenW, 500) : screenW;
    return (maxW - H_PAD * 2 - GRID_GAP * (COLS - 1)) / COLS;
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setPhotos(await getPlacePhotos(placeId));
    } catch (e) {
      Toast.show({ type: 'error', text1: e instanceof Error ? e.message : 'Load failed' });
    } finally {
      setLoading(false);
    }
  }, [placeId]);

  useEffect(() => { load(); }, [load]);

  const pickAndUpload = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Toast.show({ type: 'error', text1: t('biz.places.photos.permission') });
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsMultipleSelection: true,
      selectionLimit: 0,
    });
    if (picked.canceled || !picked.assets.length) return;

    setUploading(true);
    let ok = 0;
    let fail = 0;
    const total = picked.assets.length;
    setUploadTotal(total);
    const batchUploaded: PlacePhotoDto[] = [];

    for (let i = 0; i < picked.assets.length; i++) {
      const asset = picked.assets[i];
      setUploadIndex(i + 1);
      try {
        const fileName = uniqueUploadName(i, asset.uri, asset.mimeType);
        const meta = guessImageMeta(asset.uri, fileName);
        const fd = await buildImageFormData(asset.uri, fileName, meta.fileType);
        const created = await uploadPlacePhoto(placeId, fd);
        batchUploaded.push(created);
        setPhotos(prev => mergePhotos(prev, [created]));
        ok++;
      } catch {
        fail++;
      }
    }

    setUploading(false);
    setUploadIndex(0);
    setUploadTotal(0);
    await load();
    setPhotos(prev => mergePhotos(prev, batchUploaded));

    if (ok && !fail) {
      Toast.show({
        type: 'success',
        text1: t('biz.places.photos.uploadOk').replace('{n}', String(ok)),
      });
    } else if (ok && fail) {
      Toast.show({
        type: 'info',
        text1: t('biz.places.photos.uploadPartial').replace('{ok}', String(ok)).replace('{fail}', String(fail)),
      });
    } else {
      Toast.show({ type: 'error', text1: t('biz.places.photos.uploadFail') });
    }
  };

  const onSetPrimary = async (photoId: string) => {
    try {
      const updated = await setPlacePhotoPrimary(placeId, photoId);
      setPhotos(prev => prev.map(p => ({ ...p, isPrimary: p.id === updated.id })));
      Toast.show({ type: 'success', text1: t('biz.places.photos.primarySet') });
    } catch (e) {
      Toast.show({ type: 'error', text1: e instanceof Error ? e.message : 'Failed' });
    }
  };

  const onDelete = async (photoId: string) => {
    try {
      await deletePlacePhoto(placeId, photoId);
      setPhotos(prev => prev.filter(p => p.id !== photoId));
      await load();
      Toast.show({ type: 'success', text1: t('biz.places.photos.deleted') });
    } catch (e) {
      Toast.show({ type: 'error', text1: e instanceof Error ? e.message : 'Delete failed' });
    }
  };

  const primaryCount = photos.filter(p => p.isPrimary).length;

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#FAFAFC', '#F0EAFF']} style={StyleSheet.absoluteFill} />
      <View style={{ paddingTop: insets.top }}>
        <BusinessScreenHeader title={t('biz.places.photos.title')} onBack={onBack} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient colors={Gradients.primary} style={styles.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={styles.heroRow}>
            <View style={styles.heroIcon}>
              <Ionicons name="images" size={22} color={Colors.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroPlace} numberOfLines={2}>{placeName}</Text>
              <Text style={styles.heroHint}>{t('biz.places.photos.heroHint')}</Text>
            </View>
          </View>
          <View style={styles.heroStatRow}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatN}>{photos.length}</Text>
              <Text style={styles.heroStatL}>{t('biz.places.photos.count')}</Text>
            </View>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatN}>{primaryCount || (photos.length ? 1 : 0)}</Text>
              <Text style={styles.heroStatL}>{t('biz.places.photos.main')}</Text>
            </View>
          </View>
        </LinearGradient>

        <TouchableOpacity
          style={[styles.uploadCard, uploading && styles.uploadCardBusy]}
          onPress={pickAndUpload}
          disabled={uploading}
          activeOpacity={0.9}
        >
          {uploading ? (
            <View style={styles.uploadBusy}>
              <ActivityIndicator color={Colors.primary} />
              <Text style={styles.uploadBusyText}>
                {t('biz.places.photos.uploadingProgress')
                  .replace('{current}', String(uploadIndex))
                  .replace('{total}', String(uploadTotal))}
              </Text>
            </View>
          ) : (
            <>
              <LinearGradient colors={['#FFFFFF', '#F6F2FF']} style={styles.uploadIconRing}>
                <Ionicons name="cloud-upload-outline" size={28} color={Colors.primary} />
              </LinearGradient>
              <Text style={styles.uploadTitle}>{t('biz.places.photos.add')}</Text>
              <Text style={styles.uploadSub}>{t('biz.places.photos.addSub')}</Text>
            </>
          )}
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 32 }} color={Colors.primary} />
        ) : photos.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="image-outline" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>{t('biz.places.photos.empty')}</Text>
            <Text style={styles.emptyDesc}>{t('biz.places.photos.emptyDesc')}</Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionLabel}>{t('biz.places.photos.gallery')}</Text>
            <View style={styles.grid}>
              {photos.map((photo, index) => (
                <PhotoTile
                  key={`${photo.id}-${index}`}
                  photo={photo}
                  width={tileWidth}
                  t={t}
                  onSetPrimary={() => onSetPrimary(photo.id)}
                  onDelete={() => onDelete(photo.id)}
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function PhotoTile({
  photo, width, t, onSetPrimary, onDelete,
}: {
  photo: PlacePhotoDto;
  width: number;
  t: (k: string) => string;
  onSetPrimary: () => void;
  onDelete: () => void;
}) {
  const height = width * 1.15;
  return (
    <View style={[styles.tile, { width }]}>
      <Image source={{ uri: photo.imageUrl }} style={[styles.tileImg, { height }]} resizeMode="cover" />
      <LinearGradient colors={['transparent', 'rgba(42,23,88,0.85)']} style={styles.tileFade} />
      {photo.isPrimary ? (
        <View style={styles.mainBadge}>
          <Ionicons name="star" size={10} color="#FBBF24" />
          <Text style={styles.mainBadgeText}>{t('biz.places.photos.main')}</Text>
        </View>
      ) : (
        <TouchableOpacity style={styles.setMainBtn} onPress={onSetPrimary} hitSlop={8}>
          <Ionicons name="star-outline" size={14} color={Colors.white} />
        </TouchableOpacity>
      )}
      <View style={styles.tileActions}>
        {!photo.isPrimary ? (
          <TouchableOpacity style={styles.tileAction} onPress={onSetPrimary}>
            <Text style={styles.tileActionText}>{t('biz.places.photos.setPrimary')}</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity style={[styles.tileAction, styles.tileActionDanger]} onPress={onDelete}>
          <Ionicons name="trash-outline" size={14} color="#FECACA" />
          <Text style={styles.tileActionDangerText}>{t('common.delete')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAFAFC' },
  scroll: { paddingHorizontal: H_PAD, paddingTop: 8 },
  hero: {
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    overflow: 'hidden',
    ...Shadows.glow,
  },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPlace: { fontSize: 17, fontWeight: '900', color: Colors.white },
  heroHint: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 4, fontWeight: '600' },
  heroStatRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  heroStat: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  heroStatN: { fontSize: 20, fontWeight: '900', color: Colors.white },
  heroStatL: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.8)', marginTop: 2, textTransform: 'uppercase' },
  uploadCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.primarySoft,
    borderStyle: 'dashed',
    paddingVertical: 22,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 20,
    ...Shadows.soft,
  },
  uploadCardBusy: { borderStyle: 'solid', opacity: 0.95 },
  uploadIconRing: {
    width: 56,
    height: 56,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  uploadTitle: { fontSize: 16, fontWeight: '900', color: Colors.textDark },
  uploadSub: { fontSize: 12, color: Colors.textMuted, marginTop: 4, textAlign: 'center' },
  uploadBusy: { alignItems: 'center', gap: 10, paddingVertical: 8 },
  uploadBusyText: { fontSize: 13, fontWeight: '700', color: Colors.textMid },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP },
  tile: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: Colors.primarySoft,
    ...Shadows.soft,
  },
  tileImg: { width: '100%' },
  tileFade: { ...StyleSheet.absoluteFillObject, top: '40%' },
  mainBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16,185,129,0.95)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  mainBadgeText: { fontSize: 9, fontWeight: '900', color: Colors.white, textTransform: 'uppercase' },
  setMainBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileActions: { position: 'absolute', left: 8, right: 8, bottom: 10, gap: 6 },
  tileAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  tileActionText: { fontSize: 10, fontWeight: '800', color: Colors.white },
  tileActionDanger: { backgroundColor: 'rgba(220,38,38,0.45)' },
  tileActionDangerText: { fontSize: 10, fontWeight: '800', color: '#FECACA' },
  empty: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
    gap: 8,
  },
  emptyTitle: { fontSize: 15, fontWeight: '900', color: Colors.textDark },
  emptyDesc: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
});
