import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Image, Switch,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Colors, Shadows } from '../../constants/colors';
import { useI18n } from '../../i18n';
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
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const pickImage = async (promotionId: string) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Toast.show({ type: 'error', text1: 'Photo permission required' });
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (picked.canceled || !picked.assets[0]) return;
    try {
      setUploading(true);
      const asset = picked.assets[0];
      const meta = guessImageMeta(asset.uri);
      const fd = await buildImageFormData(asset.uri, meta.fileName, meta.fileType);
      const updated = await uploadPromotionImage(promotionId, fd);
      setImageUrl(updated.imageUrl ?? '');
      Toast.show({ type: 'success', text1: 'Image uploaded' });
    } catch (e) {
      Toast.show({ type: 'error', text1: e instanceof Error ? e.message : 'Upload failed' });
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (!title.trim()) {
      Toast.show({ type: 'error', text1: t('biz.promo.titleRequired') ?? 'Title required' });
      return;
    }
    if (!startDate || !endDate) {
      Toast.show({ type: 'error', text1: t('biz.promo.dateRequired') ?? 'Start and end dates required' });
      return;
    }
    const startAt = toUtcIso(startDate, startTime || '00:00');
    const endAt = toUtcIso(endDate, endTime || '23:59');
    if (new Date(endAt) <= new Date(startAt)) {
      Toast.show({ type: 'error', text1: t('biz.promo.endAfterStart') ?? 'End must be after start' });
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
      } else {
        await createPromotion(placeId, payload);
      }
      Toast.show({ type: 'success', text1: t('biz.promo.saved') ?? 'Saved' });
      onSaved();
    } catch (e) {
      Toast.show({ type: 'error', text1: e instanceof Error ? e.message : 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={Colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {mode === 'create' ? (t('biz.promo.create') ?? 'Create promotion') : (t('biz.promo.edit') ?? 'Edit promotion')}
        </Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.form}>
        {mode === 'create' && placeName ? (
          <View style={styles.placeBanner}>
            <View style={{ flex: 1 }}>
              <Text style={styles.placeBannerLabel}>{t('biz.events.place') ?? 'Branch'}</Text>
              <Text style={styles.placeBannerName}>{placeName}</Text>
            </View>
            {onChangePlace ? (
              <TouchableOpacity onPress={onChangePlace} hitSlop={8}>
                <Text style={styles.placeBannerChange}>{t('biz.events.changePlace') ?? 'Change'}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
        {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.preview} /> : null}
        {mode === 'edit' && initial ? (
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => pickImage(initial.id)} disabled={uploading}>
            {uploading ? <ActivityIndicator color={Colors.primary} /> : (
              <Text style={styles.secondaryBtnText}>{t('biz.promo.uploadImage') ?? 'Upload image'}</Text>
            )}
          </TouchableOpacity>
        ) : null}
        <Field label={t('biz.promo.fieldTitle') ?? 'Title'} value={title} onChangeText={setTitle} />
        <Field label={t('biz.promo.fieldDescription') ?? 'Description'} value={description} onChangeText={setDescription} multiline />
        <Text style={styles.section}>{t('biz.promo.start') ?? 'Start'}</Text>
        <Field label="YYYY-MM-DD" value={startDate} onChangeText={setStartDate} placeholder="2026-10-01" />
        <Field label="HH:mm" value={startTime} onChangeText={setStartTime} placeholder="14:00" />
        <Text style={styles.section}>{t('biz.promo.end') ?? 'End'}</Text>
        <Field label="YYYY-MM-DD" value={endDate} onChangeText={setEndDate} placeholder="2026-10-01" />
        <Field label="HH:mm" value={endTime} onChangeText={setEndTime} placeholder="17:00" />
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>{t('biz.promo.active') ?? 'Active'}</Text>
          <Switch value={isActive} onValueChange={setIsActive} trackColor={{ true: Colors.primary }} />
        </View>
        <TouchableOpacity style={styles.primaryBtn} onPress={submit} disabled={saving}>
          {saving ? <ActivityIndicator color={Colors.white} /> : (
            <Text style={styles.primaryBtnText}>{mode === 'create' ? (t('biz.promo.createBtn') ?? 'Create promotion') : (t('common.save') ?? 'Save')}</Text>
          )}
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
  root: { flex: 1, backgroundColor: Colors.primaryTint },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8, gap: 8 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '900', color: Colors.textDark, textAlign: 'center' },
  form: { padding: 20, paddingBottom: 120 },
  field: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, marginBottom: 6 },
  section: { fontSize: 14, fontWeight: '800', color: Colors.textDark, marginTop: 8, marginBottom: 8 },
  input: { backgroundColor: Colors.white, borderRadius: 12, padding: 14, fontSize: 15, ...Shadows.soft },
  inputMulti: { minHeight: 88, textAlignVertical: 'top' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, paddingHorizontal: 4 },
  switchLabel: { fontSize: 15, fontWeight: '700', color: Colors.textDark },
  primaryBtn: { backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  primaryBtnText: { color: Colors.white, fontWeight: '800', fontSize: 16 },
  secondaryBtn: { alignItems: 'center', paddingVertical: 12, marginBottom: 12 },
  secondaryBtnText: { color: Colors.primary, fontWeight: '800' },
  preview: { width: '100%', height: 160, borderRadius: 16, marginBottom: 12, backgroundColor: Colors.primarySoft },
  placeBanner: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: 14,
    padding: 14, marginBottom: 16, borderWidth: 1, borderColor: Colors.primarySoft, ...Shadows.soft,
  },
  placeBannerLabel: { fontSize: 11, fontWeight: '800', color: Colors.textMuted, textTransform: 'uppercase' },
  placeBannerName: { fontSize: 15, fontWeight: '800', color: Colors.textDark, marginTop: 4 },
  placeBannerChange: { fontSize: 13, fontWeight: '800', color: Colors.primary },
});
