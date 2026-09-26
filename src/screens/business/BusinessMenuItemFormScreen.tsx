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
  const [pendingUri, setPendingUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const displayUri = imageUrl || pendingUri;

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Toast.show({ type: 'error', text1: t('biz.menu.photoPermission') });
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
        const fileName = `menu-${Date.now()}.jpg`;
        const meta = guessImageMeta(asset.uri, fileName);
        const fd = await buildImageFormData(asset.uri, fileName, meta.fileType);
        const updated = await uploadMenuItemImage(initial.id, fd);
        setImageUrl(updated.imageUrl ?? '');
        setPendingUri(null);
        Toast.show({ type: 'success', text1: t('biz.menu.imageUploaded') });
      } catch (e) {
        Toast.show({ type: 'error', text1: e instanceof Error ? e.message : t('biz.menu.uploadFail') });
      } finally {
        setUploading(false);
      }
    } else {
      setPendingUri(asset.uri);
    }
  };

  const uploadPending = async (itemId: string, uri: string) => {
    const fileName = `menu-${Date.now()}.jpg`;
    const meta = guessImageMeta(uri, fileName);
    const fd = await buildImageFormData(uri, fileName, meta.fileType);
    const updated = await uploadMenuItemImage(itemId, fd);
    setImageUrl(updated.imageUrl ?? '');
    setPendingUri(null);
  };

  const submit = async () => {
    const priceNum = parseFloat(price.replace(/,/g, ''));
    if (!name.trim()) {
      Toast.show({ type: 'error', text1: t('biz.menu.nameRequired') });
      return;
    }
    if (Number.isNaN(priceNum) || priceNum < 0) {
      Toast.show({ type: 'error', text1: t('biz.menu.priceInvalid') });
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
        Toast.show({ type: 'success', text1: t('biz.menu.saved') });
      } else {
        const created = await createMenuItem(menuId, payload);
        if (pendingUri && created.id) {
          try {
            setUploading(true);
            await uploadPending(created.id, pendingUri);
          } catch {
            Toast.show({ type: 'info', text1: t('biz.menu.imageUploadLater') });
          } finally {
            setUploading(false);
          }
        }
        Toast.show({ type: 'success', text1: t('biz.menu.created') });
      }
      onSaved();
    } catch (e) {
      Toast.show({ type: 'error', text1: e instanceof Error ? e.message : 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  const title = mode === 'create' ? t('biz.menu.addItem') : t('biz.menu.editItem');

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#FAFAFC', '#F0EAFF']} style={StyleSheet.absoluteFill} />
      <View style={{ paddingTop: insets.top }}>
        <BusinessScreenHeader title={title} onBack={onBack} />
      </View>
      <ScrollView contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + 40 }]}>
        <TouchableOpacity style={styles.photoZone} onPress={pickImage} disabled={uploading} activeOpacity={0.9}>
          {displayUri ? (
            <>
              <Image source={{ uri: displayUri }} style={styles.preview} resizeMode="cover" />
              <LinearGradient colors={['transparent', 'rgba(42,23,88,0.6)']} style={styles.previewFade} />
              <View style={styles.changePhoto}>
                <Ionicons name="camera" size={16} color={Colors.white} />
                <Text style={styles.changePhotoText}>{t('biz.menu.changePhoto')}</Text>
              </View>
            </>
          ) : (
            <View style={styles.photoEmpty}>
              {uploading ? (
                <ActivityIndicator color={Colors.primary} />
              ) : (
                <>
                  <LinearGradient colors={Gradients.primary} style={styles.photoIcon}>
                    <Ionicons name="image-outline" size={26} color={Colors.white} />
                  </LinearGradient>
                  <Text style={styles.photoEmptyTitle}>{t('biz.menu.uploadImage')}</Text>
                  <Text style={styles.photoEmptySub}>{t('biz.menu.uploadImageSub')}</Text>
                </>
              )}
            </View>
          )}
        </TouchableOpacity>

        <Field label={t('biz.menu.fieldName')} value={name} onChangeText={setName} />
        <Field label={t('biz.menu.fieldCategory')} value={categoryName} onChangeText={setCategoryName} placeholder={t('biz.menu.categoryPlaceholder')} />
        <Field label={t('biz.menu.fieldPrice')} value={price} onChangeText={setPrice} keyboardType="numeric" />
        {price ? <Text style={styles.priceHint}>{formatVnd(parseFloat(price.replace(/,/g, '')) || 0)}</Text> : null}
        <Field label={t('biz.menu.fieldDescription')} value={description} onChangeText={setDescription} multiline />
        <View style={styles.switchRow}>
          <View>
            <Text style={styles.switchLabel}>{t('biz.menu.available')}</Text>
            <Text style={styles.switchSub}>{t('biz.menu.availableHint')}</Text>
          </View>
          <Switch value={isAvailable} onValueChange={setIsAvailable} trackColor={{ true: Colors.primary }} />
        </View>
        <TouchableOpacity onPress={submit} disabled={saving || uploading} activeOpacity={0.9}>
          <LinearGradient colors={Gradients.primary} style={styles.primaryBtn}>
            {saving ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.primaryBtnText}>
                {mode === 'create' ? t('biz.menu.createItem') : t('common.save')}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function Field({
  label, value, onChangeText, multiline, keyboardType, placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  multiline?: boolean;
  keyboardType?: 'default' | 'numeric';
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
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAFAFC' },
  form: { padding: 20 },
  photoZone: {
    borderRadius: 20, overflow: 'hidden', marginBottom: 20,
    backgroundColor: Colors.white, borderWidth: 2, borderColor: Colors.primarySoft, borderStyle: 'dashed',
    minHeight: 168, ...Shadows.soft,
  },
  preview: { width: '100%', height: 168 },
  previewFade: { ...StyleSheet.absoluteFillObject },
  changePhoto: {
    position: 'absolute', bottom: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14,
  },
  changePhotoText: { color: Colors.white, fontWeight: '800', fontSize: 12 },
  photoEmpty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 32, gap: 8 },
  photoIcon: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  photoEmptyTitle: { fontSize: 15, fontWeight: '900', color: Colors.textDark },
  photoEmptySub: { fontSize: 12, color: Colors.textMuted, textAlign: 'center', paddingHorizontal: 24 },
  field: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, marginBottom: 6 },
  input: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 14, fontSize: 15, color: Colors.textDark,
    borderWidth: 1, borderColor: '#EEEAF5', ...Shadows.soft,
  },
  inputMulti: { minHeight: 88, textAlignVertical: 'top' },
  priceHint: { fontSize: 13, color: Colors.primary, marginTop: -8, marginBottom: 12, fontWeight: '800' },
  switchRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 22, padding: 14, backgroundColor: Colors.white, borderRadius: 16,
    borderWidth: 1, borderColor: '#EEEAF5',
  },
  switchLabel: { fontSize: 15, fontWeight: '800', color: Colors.textDark },
  switchSub: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  primaryBtn: { borderRadius: 16, paddingVertical: 15, alignItems: 'center', ...Shadows.glow },
  primaryBtnText: { color: Colors.white, fontWeight: '900', fontSize: 16 },
});
