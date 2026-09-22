import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Pressable, Image, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Colors, Gradients } from '../../constants/colors';
import { useI18n } from '../../i18n';
import { createPlace, updatePlace } from '../../services/businessApi';
import { uploadMedia } from '../../services/mediaApi';
import { buildImageFormData, guessImageMeta } from '../../utils/imageFormData';
import type { BusinessPlaceFormValues } from './businessPlaceTypes';

export default function BusinessPlaceFormScreen({
  mode,
  initial,
  placeId,
  categories,
  onBack,
  onSaved,
}: {
  mode: 'create' | 'edit';
  initial: BusinessPlaceFormValues;
  placeId?: string;
  categories: { placeCategoryId: string; name: string }[];
  onBack: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState<BusinessPlaceFormValues>(initial);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const pickThumbnail = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Toast.show({ type: 'error', text1: 'Photo permission required' });
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85 });
    if (picked.canceled || !picked.assets[0]) return;
    try {
      setUploading(true);
      const asset = picked.assets[0];
      const meta = guessImageMeta(asset.uri, asset.mimeType);
      const fd = buildImageFormData(asset.uri, meta.fileName, meta.mimeType);
      const uploaded = await uploadMedia(fd);
      const url = uploaded.url ?? (uploaded as { Url?: string }).Url;
      if (!url) throw new Error('No URL returned from upload');
      setForm(f => ({ ...f, thumbnailUrl: url }));
      Toast.show({ type: 'success', text1: 'Thumbnail uploaded' });
    } catch (e) {
      Toast.show({ type: 'error', text1: e instanceof Error ? e.message : 'Upload failed' });
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    const lat = parseFloat(form.latitude);
    const lng = parseFloat(form.longitude);
    if (!form.name.trim() || !form.address.trim() || !form.categoryId) {
      Toast.show({
        type: 'error',
        text1: t('biz.places.validationRequired'),
        text2: !form.categoryId ? t('biz.places.pickCategory') : undefined,
      });
      return;
    }
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      Toast.show({ type: 'error', text1: t('biz.places.validationCoords') });
      return;
    }
    const payload = {
      name: form.name.trim(),
      categoryId: form.categoryId,
      address: form.address.trim(),
      latitude: lat,
      longitude: lng,
      description: form.description.trim() || undefined,
      phone: form.phone.trim() || undefined,
      openingHours: form.openingHours.trim() || undefined,
      thumbnailUrl: form.thumbnailUrl.trim() || undefined,
    };
    try {
      setSaving(true);
      if (mode === 'edit' && placeId) {
        await updatePlace(placeId, payload);
        Toast.show({ type: 'success', text1: t('biz.places.updated') });
      } else {
        await createPlace(payload);
        Toast.show({ type: 'success', text1: t('biz.places.submitted') });
      }
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
        <Text style={styles.title}>{mode === 'create' ? t('biz.places.createTitle') : t('biz.places.edit')}</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Field label={t('biz.places.fieldName')} value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} />
        <Text style={styles.label}>{t('biz.places.fieldCategory')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat.placeCategoryId}
              style={[styles.chip, form.categoryId === cat.placeCategoryId && styles.chipOn]}
              onPress={() => setForm(f => ({ ...f, categoryId: cat.placeCategoryId }))}
            >
              <Text style={[styles.chipText, form.categoryId === cat.placeCategoryId && styles.chipTextOn]}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <Field label={t('biz.places.fieldDescription')} value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} multiline />
        <Field label={t('biz.places.fieldAddress')} value={form.address} onChange={v => setForm(f => ({ ...f, address: v }))} />
        <View style={styles.row}>
          <View style={styles.half}>
            <Field label="Lat" value={form.latitude} onChange={v => setForm(f => ({ ...f, latitude: v }))} keyboard="decimal-pad" />
          </View>
          <View style={styles.half}>
            <Field label="Lng" value={form.longitude} onChange={v => setForm(f => ({ ...f, longitude: v }))} keyboard="decimal-pad" />
          </View>
        </View>
        <Field label={t('biz.places.fieldPhone')} value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} keyboard="phone-pad" />
        <Field label={t('biz.places.hours')} value={form.openingHours} onChange={v => setForm(f => ({ ...f, openingHours: v }))} />
        <Text style={styles.label}>{t('biz.places.fieldThumbnail')}</Text>
        {form.thumbnailUrl ? (
          <Image source={{ uri: form.thumbnailUrl }} style={styles.thumb} />
        ) : null}
        <TouchableOpacity style={styles.uploadBtn} onPress={pickThumbnail} disabled={uploading}>
          {uploading ? <ActivityIndicator color={Colors.primary} /> : (
            <>
              <Ionicons name="cloud-upload-outline" size={18} color={Colors.primary} />
              <Text style={styles.uploadText}>{t('biz.places.uploadThumb')}</Text>
            </>
          )}
        </TouchableOpacity>
        <Pressable onPress={submit} disabled={saving || uploading} style={({ pressed }) => [styles.save, pressed && { opacity: 0.9 }]}>
          <LinearGradient colors={Gradients.primary} style={styles.saveGrad} pointerEvents="none">
            {saving ? <ActivityIndicator color={Colors.white} /> : (
              <Text style={styles.saveText}>{mode === 'create' ? t('biz.places.createBtn') : t('biz.places.save')}</Text>
            )}
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function Field({
  label, value, onChange, multiline, keyboard,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  keyboard?: 'default' | 'decimal-pad' | 'phone-pad';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMulti]}
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        keyboardType={keyboard}
        placeholderTextColor={Colors.textMuted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.primaryTint },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 },
  title: { fontSize: 17, fontWeight: '900', color: Colors.textDark },
  scroll: { padding: 20, paddingBottom: 120 },
  field: { marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '700', color: Colors.textMid, marginBottom: 6 },
  input: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 14, fontSize: 14, color: Colors.textDark,
    borderWidth: 1, borderColor: Colors.primarySoft,
  },
  inputMulti: { minHeight: 88, textAlignVertical: 'top' },
  chipRow: { marginBottom: 12, maxHeight: 44 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: Colors.primarySoft, marginRight: 8 },
  chipOn: { backgroundColor: Colors.primary },
  chipText: { fontSize: 12, fontWeight: '700', color: Colors.textMid },
  chipTextOn: { color: Colors.white },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  thumb: { width: '100%', height: 160, borderRadius: 16, marginBottom: 8, backgroundColor: Colors.primarySoft },
  uploadBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: 12, borderRadius: 14, backgroundColor: Colors.white, marginBottom: 16,
  },
  uploadText: { fontWeight: '700', color: Colors.primary },
  save: { marginTop: 4 },
  saveGrad: { borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  saveText: { color: Colors.white, fontWeight: '800' },
});
