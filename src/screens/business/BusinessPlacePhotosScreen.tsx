import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Image, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Colors, Shadows } from '../../constants/colors';
import { useI18n } from '../../i18n';
import {
  deletePlacePhoto,
  getPlacePhotos,
  setPlacePhotoPrimary,
  uploadPlacePhoto,
  type PlacePhotoDto,
} from '../../services/businessPlacePhotosApi';
import { buildImageFormData, guessImageMeta } from '../../utils/imageFormData';

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
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

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
      Toast.show({ type: 'error', text1: t('biz.places.photos.permission') ?? 'Photo permission required' });
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsMultipleSelection: true,
    });
    if (picked.canceled || !picked.assets.length) return;

    setUploading(true);
    let ok = 0;
    let fail = 0;
    const total = picked.assets.length;
    for (let i = 0; i < picked.assets.length; i++) {
      const asset = picked.assets[i];
      setUploadProgress(`${t('biz.places.photos.uploading') ?? 'Uploading'} ${i + 1} / ${total}`);
      try {
        const meta = guessImageMeta(asset.uri, asset.mimeType);
        const fd = await buildImageFormData(asset.uri, meta.fileName, meta.fileType);
        await uploadPlacePhoto(placeId, fd);
        ok++;
      } catch {
        fail++;
      }
    }
    setUploadProgress(null);
    setUploading(false);
    await load();
    if (ok && !fail) {
      Toast.show({ type: 'success', text1: t('biz.places.photos.uploadOk') ?? `${ok} photo(s) uploaded` });
    } else if (ok && fail) {
      Toast.show({
        type: 'info',
        text1: t('biz.places.photos.uploadPartial') ?? `${ok} uploaded, ${fail} failed`,
      });
    } else {
      Toast.show({ type: 'error', text1: t('biz.places.photos.uploadFail') ?? 'Upload failed' });
    }
  };

  const onSetPrimary = async (photoId: string) => {
    try {
      await setPlacePhotoPrimary(placeId, photoId);
      await load();
      Toast.show({ type: 'success', text1: t('biz.places.photos.primarySet') ?? 'Primary updated' });
    } catch (e) {
      Toast.show({ type: 'error', text1: e instanceof Error ? e.message : 'Failed' });
    }
  };

  const onDelete = async (photoId: string) => {
    try {
      await deletePlacePhoto(placeId, photoId);
      await load();
      Toast.show({ type: 'success', text1: t('biz.places.photos.deleted') ?? 'Photo deleted' });
    } catch (e) {
      Toast.show({ type: 'error', text1: e instanceof Error ? e.message : 'Delete failed' });
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={Colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {t('biz.places.photos.title') ?? 'Place Photos'}
        </Text>
        <View style={{ width: 24 }} />
      </View>
      <Text style={styles.subtitle} numberOfLines={2}>{placeName}</Text>

      <TouchableOpacity
        style={[styles.addBtn, uploading && styles.addBtnDisabled]}
        onPress={pickAndUpload}
        disabled={uploading}
        activeOpacity={0.88}
      >
        {uploading ? (
          <ActivityIndicator color={Colors.white} />
        ) : (
          <>
            <Ionicons name="add-circle-outline" size={20} color={Colors.white} />
            <Text style={styles.addBtnText}>{t('biz.places.photos.add') ?? '+ Add Photos'}</Text>
          </>
        )}
      </TouchableOpacity>
      {uploadProgress ? <Text style={styles.progress}>{uploadProgress}</Text> : null}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={Colors.primary} />
      ) : (
        <ScrollView contentContainerStyle={styles.grid}>
          {photos.length === 0 ? (
            <Text style={styles.empty}>{t('biz.places.photos.empty') ?? 'No photos yet'}</Text>
          ) : (
            photos.map(photo => (
              <View key={photo.id} style={styles.card}>
                <Image source={{ uri: photo.imageUrl }} style={styles.thumb} />
                {photo.isPrimary ? (
                  <View style={styles.primaryBadge}>
                    <Text style={styles.primaryText}>{t('biz.places.photos.main') ?? 'Main'}</Text>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.primaryBtn} onPress={() => onSetPrimary(photo.id)}>
                    <Text style={styles.primaryBtnText}>{t('biz.places.photos.setPrimary') ?? 'Set primary'}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(photo.id)}>
                  <Ionicons name="trash-outline" size={16} color="#DC2626" />
                  <Text style={styles.deleteText}>{t('common.delete') ?? 'Delete'}</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.primaryTint },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 4, gap: 8 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '900', color: Colors.textDark, textAlign: 'center' },
  subtitle: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', paddingHorizontal: 24, marginBottom: 12 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 20, backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 12,
  },
  addBtnDisabled: { opacity: 0.7 },
  addBtnText: { color: Colors.white, fontWeight: '800' },
  progress: { textAlign: 'center', marginTop: 8, color: Colors.textMuted, fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, paddingBottom: 120, gap: 12 },
  empty: { width: '100%', textAlign: 'center', color: Colors.textMuted, marginTop: 32 },
  card: {
    width: Platform.OS === 'web' ? '30%' : '47%',
    backgroundColor: Colors.white,
    borderRadius: 14,
    overflow: 'hidden',
    ...Shadows.soft,
  },
  thumb: { width: '100%', height: 120, backgroundColor: Colors.primarySoft },
  primaryBadge: { backgroundColor: 'rgba(16,185,129,0.2)', paddingVertical: 6, alignItems: 'center' },
  primaryText: { fontSize: 11, fontWeight: '800', color: '#059669' },
  primaryBtn: { paddingVertical: 8, alignItems: 'center' },
  primaryBtnText: { fontSize: 11, fontWeight: '700', color: Colors.primary },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingBottom: 10 },
  deleteText: { fontSize: 11, color: '#DC2626', fontWeight: '600' },
});
