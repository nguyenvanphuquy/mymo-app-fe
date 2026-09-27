import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Image, Switch,
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
  createPromotion, updatePromotion, uploadPromotionImage, toUtcIso, splitIsoToLocalFields, type PromotionDto,
} from '../../services/businessPromotionApi';
import { buildImageFormData, guessImageMeta } from '../../utils/imageFormData';

export default function BusinessPromotionFormScreen({
  mode,
  placeId,
  placeName,
  onChangePlace,
  initial,
  onBack,
  onSaved,
}: {
  mode: 'create' | 'edit';
  placeId: string;
  placeName?: string;
  onChangePlace?: () => void;
  initial?: PromotionDto;
  onBack: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const startFields = initial ? splitIsoToLocalFields(initial.startAt) : { date: '', time: '14:00' };
  const endFields = initial ? splitIsoToLocalFields(initial.endAt) : { date: '', time: '17:00' };

  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [startDate, setStartDate] = useState(startFields.date);
  const [startTime, setStartTime] = useState(startFields.time);
  const [endDate, setEndDate] = useState(endFields.date);
  const [endTime, setEndTime] = useState(endFields.time);
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? '');
  const [pendingUri, setPendingUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const displayUri = imageUrl || pendingUri;
  const headerTitle = mode === 'create' ? t('biz.promo.create') : t('biz.promo.edit');

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Toast.show({ type: 'error', text1: t('biz.promo.photoPermission') });
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (picked.canceled || !picked.assets[0]) return;

    const asset = picked.assets[0];
    if (mode === 'edit' && initial?.id) {
      try {
        setUploading(true);
        const fileName = `promo-${Date.now()}.jpg`;
        const meta = guessImageMeta(asset.uri, fileName);
        const fd = await buildImageFormData(asset.uri, fileName, meta.fileType);
        const updated = await uploadPromotionImage(initial.id, fd);
        setImageUrl(updated.imageUrl ?? '');
        setPendingUri(null);
        Toast.show({ type: 'success', text1: t('biz.promo.imageUploaded') });
      } catch (e) {
        Toast.show({ type: 'error', text1: e instanceof Error ? e.message : t('biz.promo.uploadFail') });
      } finally {
        setUploading(false);
      }
    } else {
      setPendingUri(asset.uri);
    }
  };

  const uploadPending = async (promotionId: string, uri: string) => {
    const fileName = `promo-${Date.now()}.jpg`;
    const meta = guessImageMeta(uri, fileName);
    const fd = await buildImageFormData(uri, fileName, meta.fileType);
    const updated = await uploadPromotionImage(promotionId, fd);
    setImageUrl(updated.imageUrl ?? '');
    setPendingUri(null);
  };

  const submit = async () => {
    if (!title.trim()) {
      Toast.show({ type: 'error', text1: t('biz.promo.titleRequired') });
      return;
    }
    if (!startDate || !endDate) {
      Toast.show({ type: 'error', text1: t('biz.promo.dateRequired') });
      return;
    }
    const startAt = toUtcIso(startDate, startTime || '00:00');
    const endAt = toUtcIso(endDate, endTime || '23:59');
    if (new Date(endAt) <= new Date(startAt)) {
      Toast.show({ type: 'error', text1: t('biz.promo.endAfterStart') });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        startAt,
        endAt,
        isActive,
      };
      if (mode === 'edit' && initial) {
        await updatePromotion(initial.id, payload);
        Toast.show({ type: 'success', text1: t('biz.promo.saved') });
      } else {
        const created = await createPromotion(placeId, payload);
        if (pendingUri && created.id) {
          try {
            setUploading(true);
            await uploadPending(created.id, pendingUri);
          } catch {
            Toast.show({ type: 'info', text1: t('biz.promo.imageUploadLater') });
          } finally {
            setUploading(false);
          }
        }
        Toast.show({ type: 'success', text1: t('biz.promo.created') });
      }
      onSaved();
    } catch (e) {
      Toast.show({ type: 'error', text1: e instanceof Error ? e.message : 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#FAFAFC', '#F0EAFF']} style={StyleSheet.absoluteFill} />
      <View style={{ paddingTop: insets.top }}>
        <BusinessScreenHeader title={headerTitle} onBack={onBack} />
      </View>
      <ScrollView contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + 40 }]}>
        {placeName ? (
          <View style={styles.placeBanner}>
            <Ionicons name="location" size={18} color={Colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.placeBannerLabel}>{t('biz.events.place')}</Text>
              <Text style={styles.placeBannerName}>{placeName}</Text>
            </View>
            {onChangePlace ? (
              <TouchableOpacity onPress={onChangePlace} hitSlop={8}>
                <Text style={styles.placeBannerChange}>{t('biz.events.changePlace')}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        <TouchableOpacity style={styles.photoZone} onPress={pickImage} disabled={uploading} activeOpacity={0.9}>
          {displayUri ? (
            <>
              <Image source={{ uri: displayUri }} style={styles.preview} resizeMode="cover" />
              <View style={styles.changePhoto}>
                <Ionicons name="camera" size={16} color={Colors.white} />
                <Text style={styles.changePhotoText}>{t('biz.promo.changePhoto')}</Text>
              </View>
            </>
          ) : (
            <View style={styles.photoEmpty}>
              {uploading ? <ActivityIndicator color={Colors.primary} /> : (
                <>
                  <LinearGradient colors={Gradients.primary} style={styles.photoIcon}>
                    <Ionicons name="image-outline" size={26} color={Colors.white} />
                  </LinearGradient>
                  <Text style={styles.photoEmptyTitle}>{t('biz.promo.uploadImage')}</Text>
                  <Text style={styles.photoEmptySub}>{t('biz.promo.uploadImageSub')}</Text>
                </>
              )}
            </View>
          )}
        </TouchableOpacity>

        <Field label={t('biz.promo.fieldTitle')} value={title} onChangeText={setTitle} />
        <Field label={t('biz.promo.fieldDescription')} value={description} onChangeText={setDescription} multiline />
        <Text style={styles.section}>{t('biz.promo.start')}</Text>
        <Field label={t('biz.promo.dateLabel')} value={startDate} onChangeText={setStartDate} placeholder="2026-10-01" />
        <Field label={t('biz.promo.timeLabel')} value={startTime} onChangeText={setStartTime} placeholder="14:00" />
        <Text style={styles.section}>{t('biz.promo.end')}</Text>
        <Field label={t('biz.promo.dateLabel')} value={endDate} onChangeText={setEndDate} placeholder="2026-10-07" />
        <Field label={t('biz.promo.timeLabel')} value={endTime} onChangeText={setEndTime} placeholder="22:00" />
        <View style={styles.switchRow}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={styles.switchLabel}>{t('biz.promo.active')}</Text>
            <Text style={styles.switchSub}>{t('biz.promo.activeHint')}</Text>
          </View>
          <Switch value={isActive} onValueChange={setIsActive} trackColor={{ true: Colors.primary }} />
        </View>
        <TouchableOpacity onPress={submit} disabled={saving || uploading} activeOpacity={0.9}>
          <LinearGradient colors={Gradients.primary} style={styles.primaryBtn}>
            {saving ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.primaryBtnText}>
                {mode === 'create' ? t('biz.promo.createBtn') : t('common.save')}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function Field({
  label, value, onChangeText, multiline, placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  multiline?: boolean;
  placeholder?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMulti]}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAFAFC' },
  form: { padding: 20 },
  placeBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.white, borderRadius: 14,
    padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#EEEAF5', ...Shadows.soft,
  },
  placeBannerLabel: { fontSize: 11, fontWeight: '800', color: Colors.textMuted, textTransform: 'uppercase' },
  placeBannerName: { fontSize: 15, fontWeight: '800', color: Colors.textDark, marginTop: 2 },
  placeBannerChange: { fontSize: 13, fontWeight: '800', color: Colors.primary },
  photoZone: {
    borderRadius: 20, overflow: 'hidden', marginBottom: 20, minHeight: 160,
    backgroundColor: Colors.white, borderWidth: 2, borderColor: Colors.primarySoft, borderStyle: 'dashed',
    ...Shadows.soft,
  },
  preview: { width: '100%', height: 160 },
  changePhoto: {
    position: 'absolute', bottom: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14,
  },
  changePhotoText: { color: Colors.white, fontWeight: '800', fontSize: 12 },
  photoEmpty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 28, gap: 8 },
  photoIcon: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  photoEmptyTitle: { fontSize: 15, fontWeight: '900', color: Colors.textDark },
  photoEmptySub: { fontSize: 12, color: Colors.textMuted, textAlign: 'center', paddingHorizontal: 20 },
  field: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, marginBottom: 6 },
  section: { fontSize: 13, fontWeight: '800', color: Colors.textDark, marginTop: 4, marginBottom: 8 },
  input: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 14, fontSize: 15, color: Colors.textDark,
    borderWidth: 1, borderColor: '#EEEAF5', ...Shadows.soft,
  },
  inputMulti: { minHeight: 88, textAlignVertical: 'top' },
  switchRow: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 22, padding: 14,
    backgroundColor: Colors.white, borderRadius: 16, borderWidth: 1, borderColor: '#EEEAF5',
  },
  switchLabel: { fontSize: 15, fontWeight: '800', color: Colors.textDark },
  switchSub: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  primaryBtn: { borderRadius: 16, paddingVertical: 15, alignItems: 'center', ...Shadows.glow },
  primaryBtnText: { color: Colors.white, fontWeight: '900', fontSize: 16 },
});
