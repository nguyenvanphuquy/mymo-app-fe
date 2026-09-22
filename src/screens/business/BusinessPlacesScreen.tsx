import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, TextInput, ActivityIndicator, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Colors, Gradients, Shadows } from '../../constants/colors';
import { useI18n } from '../../i18n';
import {
  createBusiness,
  createPlace,
  getMyBusinesses,
  getMyPlaces,
  getPlaceCategories,
  updatePlace,
  type BusinessPlaceDto,
  type BusinessSession,
} from '../../services/businessApi';

type EditForm = {
  placeId?: string;
  name: string;
  address: string;
  latitude: string;
  longitude: string;
  description: string;
  openingHours: string;
  categoryId: string;
};

const emptyForm = (categoryId = ''): EditForm => ({
  name: '',
  address: '',
  latitude: '10.838',
  longitude: '106.837',
  description: '',
  openingHours: '07:00 - 22:00',
  categoryId,
});

export default function BusinessPlacesScreen({ session }: { session: BusinessSession }) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [places, setPlaces] = useState<BusinessPlaceDto[]>([]);
  const [categories, setCategories] = useState<{ placeCategoryId: string; name: string }[]>([]);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const cats = await getPlaceCategories();
      setCategories(cats);
      const businesses = await getMyBusinesses();
      let bizId = businesses[0]?.businessId ?? null;
      if (!bizId) {
        const created = await createBusiness({
          name: `${session.displayName} Business`,
          email: session.email,
        });
        bizId = created.businessId;
      }
      setBusinessId(bizId);
      setPlaces(await getMyPlaces());
    } catch (e) {
      Toast.show({ type: 'error', text1: e instanceof Error ? e.message : 'Load failed' });
    } finally {
      setLoading(false);
    }
  }, [session.displayName, session.email]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    const defaultCat = categories[0]?.placeCategoryId ?? '';
    setEditing(emptyForm(defaultCat));
  };

  const resolveBusinessId = async (): Promise<string | null> => {
    if (businessId) return businessId;
    try {
      const businesses = await getMyBusinesses();
      let bizId = businesses[0]?.businessId ?? null;
      if (!bizId) {
        const created = await createBusiness({
          name: `${session.displayName} Business`,
          email: session.email,
        });
        bizId = created.businessId;
      }
      setBusinessId(bizId);
      return bizId;
    } catch (e) {
      Toast.show({
        type: 'error',
        text1: e instanceof Error ? e.message : 'Cannot load business profile',
        text2: 'Check role Business and login again',
      });
      return null;
    }
  };

  const save = async () => {
    if (!editing) return;

    const lat = parseFloat(editing.latitude);
    const lng = parseFloat(editing.longitude);
    if (!editing.name.trim() || !editing.address.trim() || !editing.categoryId) {
      Toast.show({ type: 'error', text1: 'Name, category and address are required' });
      return;
    }
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      Toast.show({ type: 'error', text1: 'Invalid latitude or longitude' });
      return;
    }

    const bizId = await resolveBusinessId();
    if (!bizId) return;

    try {
      setSaving(true);
      const payload = {
        name: editing.name.trim(),
        categoryId: editing.categoryId,
        address: editing.address.trim(),
        latitude: lat,
        longitude: lng,
        description: editing.description || undefined,
        openingHours: editing.openingHours || undefined,
      };
      if (editing.placeId) {
        await updatePlace(editing.placeId, payload);
      } else {
        await createPlace({ businessId: bizId, ...payload });
      }
      Toast.show({ type: 'success', text1: t('biz.places.saved') });
      setEditing(null);
      await load();
    } catch (e) {
      Toast.show({ type: 'error', text1: e instanceof Error ? e.message : 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleRow}>
          <Text style={styles.title}>{t('biz.places.title')}</Text>
          <TouchableOpacity onPress={openCreate} style={styles.addBtn}>
            <Ionicons name="add" size={22} color={Colors.white} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 24 }} />
        ) : places.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="location-outline" size={28} color={Colors.primary} />
            <Text style={styles.emptyTitle}>{t('biz.places.empty')}</Text>
            <Text style={styles.emptyDesc}>{t('biz.places.emptyDesc')}</Text>
            <TouchableOpacity onPress={openCreate} style={styles.emptyCta}>
              <Text style={styles.emptyCtaText}>+ {t('biz.places.save')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          places.map(place => (
            <TouchableOpacity
              key={place.placeId}
              style={styles.card}
              activeOpacity={0.88}
              onPress={() => setEditing({
                placeId: place.placeId,
                name: place.name,
                address: place.address ?? '',
                latitude: String(place.latitude),
                longitude: String(place.longitude),
                description: place.description ?? '',
                openingHours: place.openingHours ?? '',
                categoryId: place.categoryId,
              })}
            >
              <View style={styles.cardTop}>
                <View style={styles.icon}>
                  <Ionicons name="cafe-outline" size={18} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{place.name}</Text>
                  <Text style={styles.addr}>{place.address}</Text>
                  <Text style={styles.meta}>{place.openingHours ?? '—'} · {place.status}</Text>
                </View>
                <View style={[styles.pill, place.status === 'Approved' ? styles.pillOn : styles.pillOff]}>
                  <Text style={styles.pillText}>{place.status}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <Modal visible={!!editing} animationType="slide" onRequestClose={() => setEditing(null)}>
        <View style={[styles.sheet, { paddingTop: insets.top + 12 }]}>
          <Text style={styles.title}>{editing?.placeId ? t('biz.places.edit') : 'New place'}</Text>
          <TextInput style={styles.input} value={editing?.name ?? ''} onChangeText={v => setEditing(e => e ? { ...e, name: v } : e)} placeholder="Name" placeholderTextColor={Colors.textMuted} />
          <TextInput style={styles.input} value={editing?.address ?? ''} onChangeText={v => setEditing(e => e ? { ...e, address: v } : e)} placeholder="Address" placeholderTextColor={Colors.textMuted} />
          <TextInput style={styles.input} value={editing?.latitude ?? ''} onChangeText={v => setEditing(e => e ? { ...e, latitude: v } : e)} placeholder="Latitude" placeholderTextColor={Colors.textMuted} keyboardType="decimal-pad" />
          <TextInput style={styles.input} value={editing?.longitude ?? ''} onChangeText={v => setEditing(e => e ? { ...e, longitude: v } : e)} placeholder="Longitude" placeholderTextColor={Colors.textMuted} keyboardType="decimal-pad" />
          <TextInput style={styles.input} value={editing?.openingHours ?? ''} onChangeText={v => setEditing(e => e ? { ...e, openingHours: v } : e)} placeholder={t('biz.places.hours')} placeholderTextColor={Colors.textMuted} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {categories.map(cat => (
              <TouchableOpacity
                key={cat.placeCategoryId}
                style={[styles.chip, editing?.categoryId === cat.placeCategoryId && styles.chipOn]}
                onPress={() => setEditing(e => e ? { ...e, categoryId: cat.placeCategoryId } : e)}
              >
                <Text style={[styles.chipText, editing?.categoryId === cat.placeCategoryId && styles.chipTextOn]}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Pressable
            onPress={save}
            disabled={saving || loading}
            style={({ pressed }) => [styles.save, pressed && { opacity: 0.9 }]}
          >
            <LinearGradient colors={Gradients.primary} style={styles.saveGrad} pointerEvents="none">
              {saving ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.saveText}>{t('biz.places.save')}</Text>}
            </LinearGradient>
          </Pressable>
          <TouchableOpacity onPress={() => setEditing(null)} style={styles.cancel}>
            <Text style={styles.cancelText}>{t('common.cancel') ?? 'Cancel'}</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.primaryTint },
  scroll: { paddingHorizontal: 20 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '900', color: Colors.textDark },
  addBtn: { backgroundColor: Colors.primary, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  empty: { backgroundColor: Colors.white, borderRadius: 22, padding: 24, alignItems: 'center', gap: 8, ...Shadows.soft },
  emptyTitle: { fontSize: 14, fontWeight: '800', color: Colors.textDark },
  emptyDesc: { fontSize: 12, color: Colors.textMuted, textAlign: 'center' },
  emptyCta: { marginTop: 12, backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 14 },
  emptyCtaText: { color: Colors.white, fontWeight: '800' },
  card: { backgroundColor: Colors.white, borderRadius: 20, padding: 16, marginBottom: 12, ...Shadows.soft },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  icon: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 16, fontWeight: '800', color: Colors.textDark },
  addr: { fontSize: 12, color: Colors.textMid, marginTop: 4 },
  meta: { fontSize: 11, color: Colors.textMuted, marginTop: 4 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  pillOn: { backgroundColor: 'rgba(16,185,129,0.15)' },
  pillOff: { backgroundColor: Colors.primarySoft },
  pillText: { fontSize: 10, fontWeight: '800', color: Colors.activeGreen },
  sheet: { flex: 1, backgroundColor: Colors.white, paddingHorizontal: 20 },
  input: {
    borderWidth: 1, borderColor: Colors.primarySoft, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10, fontSize: 14,
  },
  chipRow: { marginVertical: 8, maxHeight: 44 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: Colors.primarySoft, marginRight: 8 },
  chipOn: { backgroundColor: Colors.primary },
  chipText: { fontSize: 12, fontWeight: '700', color: Colors.textMid },
  chipTextOn: { color: Colors.white },
  save: { marginTop: 12 },
  saveGrad: { borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  saveText: { color: Colors.white, fontWeight: '800' },
  cancel: { alignItems: 'center', padding: 16 },
  cancelText: { color: Colors.textMuted, fontWeight: '700' },
});
