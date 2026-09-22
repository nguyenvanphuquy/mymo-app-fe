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
  createMenuItem, updateMenuItem, uploadMenuItemImage, formatVnd, type MenuItemDto,
} from '../../services/businessMenuApi';
import { buildImageFormData, guessImageMeta } from '../../utils/imageFormData';

export default function BusinessMenuItemFormScreen({
  mode,
  menuId,
  initial,
  onBack,
  onSaved,
}: {
  mode: 'create' | 'edit';
  menuId: string;
  initial?: MenuItemDto;
  onBack: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [price, setPrice] = useState(initial ? String(initial.price) : '');
  const [categoryName, setCategoryName] = useState(initial?.categoryName ?? '');
  const [isAvailable, setIsAvailable] = useState(initial?.isAvailable ?? true);
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const pickImage = async (itemId: string) => {
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
      const meta = guessImageMeta(asset.uri, asset.mimeType);
      const fd = await buildImageFormData(asset.uri, meta.fileName, meta.fileType);
      const updated = await uploadMenuItemImage(itemId, fd);
      setImageUrl(updated.imageUrl ?? '');
      Toast.show({ type: 'success', text1: 'Image uploaded' });
    } catch (e) {
      Toast.show({ type: 'error', text1: e instanceof Error ? e.message : 'Upload failed' });
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    const priceNum = parseFloat(price.replace(/,/g, ''));
    if (!name.trim()) {
      Toast.show({ type: 'error', text1: t('biz.menu.nameRequired') ?? 'Name is required' });
      return;
    }
    if (Number.isNaN(priceNum) || priceNum < 0) {
      Toast.show({ type: 'error', text1: t('biz.menu.priceInvalid') ?? 'Invalid price' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        price: priceNum,
        categoryName: categoryName.trim() || undefined,
        isAvailable,
      };
      if (mode === 'edit' && initial) {
        await updateMenuItem(initial.id, payload);
        Toast.show({ type: 'success', text1: t('biz.menu.saved') ?? 'Saved' });
      } else {
        const created = await createMenuItem(menuId, payload);
        Toast.show({ type: 'success', text1: t('biz.menu.created') ?? 'Item created' });
        if (created.id) {
          // optional immediate image — user can edit again
        }
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
        <Text style={styles.headerTitle}>
          {mode === 'create' ? (t('biz.menu.addItem') ?? 'Add item') : (t('biz.menu.editItem') ?? 'Edit item')}
        </Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.form}>
        {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.preview} /> : null}
        {mode === 'edit' && initial ? (
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => pickImage(initial.id)} disabled={uploading}>
            {uploading ? <ActivityIndicator color={Colors.primary} /> : (
              <Text style={styles.secondaryBtnText}>{t('biz.menu.uploadImage') ?? 'Upload image'}</Text>
            )}
          </TouchableOpacity>
        ) : null}
        <Field label={t('biz.menu.fieldName') ?? 'Name'} value={name} onChangeText={setName} />
        <Field label={t('biz.menu.fieldCategory') ?? 'Category'} value={categoryName} onChangeText={setCategoryName} />
        <Field label={t('biz.menu.fieldPrice') ?? 'Price'} value={price} onChangeText={setPrice} keyboardType="numeric" />
        {price ? <Text style={styles.priceHint}>{formatVnd(parseFloat(price.replace(/,/g, '')) || 0)}</Text> : null}
        <Field label={t('biz.menu.fieldDescription') ?? 'Description'} value={description} onChangeText={setDescription} multiline />
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>{t('biz.menu.available') ?? 'Available'}</Text>
          <Switch value={isAvailable} onValueChange={setIsAvailable} trackColor={{ true: Colors.primary }} />
        </View>
        <TouchableOpacity style={styles.primaryBtn} onPress={submit} disabled={saving}>
          {saving ? <ActivityIndicator color={Colors.white} /> : (
            <Text style={styles.primaryBtnText}>{mode === 'create' ? (t('biz.menu.createItem') ?? 'Create item') : (t('common.save') ?? 'Save')}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function Field({
  label, value, onChangeText, multiline, keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  multiline?: boolean;
  keyboardType?: 'default' | 'numeric';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMulti]}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        keyboardType={keyboardType}
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
  input: { backgroundColor: Colors.white, borderRadius: 12, padding: 14, fontSize: 15, ...Shadows.soft },
  inputMulti: { minHeight: 88, textAlignVertical: 'top' },
  priceHint: { fontSize: 12, color: Colors.primary, marginTop: -8, marginBottom: 12, fontWeight: '700' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, paddingHorizontal: 4 },
  switchLabel: { fontSize: 15, fontWeight: '700', color: Colors.textDark },
  primaryBtn: { backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  primaryBtnText: { color: Colors.white, fontWeight: '800', fontSize: 16 },
  secondaryBtn: { alignItems: 'center', paddingVertical: 12, marginBottom: 12 },
  secondaryBtnText: { color: Colors.primary, fontWeight: '800' },
  preview: { width: '100%', height: 160, borderRadius: 16, marginBottom: 12, backgroundColor: Colors.primarySoft },
});
