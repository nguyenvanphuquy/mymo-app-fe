import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Colors, Gradients, Shadows } from '../../constants/colors';
import { useI18n } from '../../i18n';
import {
  BUSINESS_VIBES,
  listPlaces,
  upsertPlace,
  type BusinessPlace,
  type BusinessSession,
  type BusinessVibe,
} from '../../utils/businessStorage';

export default function BusinessPlacesScreen({ session }: { session: BusinessSession }) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [places, setPlaces] = useState<BusinessPlace[]>([]);
  const [editing, setEditing] = useState<BusinessPlace | null>(null);

  const load = useCallback(async () => {
    setPlaces(await listPlaces(session.accountId));
  }, [session.accountId]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!editing) return;
    await upsertPlace(editing);
    Toast.show({ type: 'success', text1: t('biz.places.saved') });
    setEditing(null);
    load();
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{t('biz.places.title')}</Text>
        {places.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="location-outline" size={28} color={Colors.primary} />
            <Text style={styles.emptyTitle}>{t('biz.places.empty')}</Text>
            <Text style={styles.emptyDesc}>{t('biz.places.emptyDesc')}</Text>
          </View>
        ) : (
          places.map(place => (
            <TouchableOpacity
              key={place.id}
              style={styles.card}
              activeOpacity={0.88}
              onPress={() => setEditing({ ...place })}
            >
              <View style={styles.cardTop}>
                <View style={styles.icon}>
                  <Ionicons name="cafe-outline" size={18} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{place.name}</Text>
                  <Text style={styles.addr}>{place.address}</Text>
                  <Text style={styles.meta}>{place.hours} · {place.vibe}</Text>
                </View>
                <View style={[styles.pill, place.isOpen ? styles.pillOn : styles.pillOff]}>
                  <Text style={[styles.pillText, !place.isOpen && { color: Colors.textMuted }]}>
                    {place.isOpen ? t('biz.places.open') : t('biz.places.closed')}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <Modal visible={!!editing} animationType="slide" onRequestClose={() => setEditing(null)}>
        <View style={[styles.sheet, { paddingTop: insets.top + 12 }]}>
          <Text style={styles.title}>{t('biz.places.edit')}</Text>
          <TextInput
            style={styles.input}
            value={editing?.name ?? ''}
            onChangeText={v => setEditing(e => e ? { ...e, name: v } : e)}
            placeholder={t('premium.partnerDisplayName')}
            placeholderTextColor={Colors.textMuted}
          />
          <TextInput
            style={styles.input}
            value={editing?.address ?? ''}
            onChangeText={v => setEditing(e => e ? { ...e, address: v } : e)}
            placeholder={t('premium.partnerAddress')}
            placeholderTextColor={Colors.textMuted}
          />
          <TextInput
            style={styles.input}
            value={editing?.hours ?? ''}
            onChangeText={v => setEditing(e => e ? { ...e, hours: v } : e)}
            placeholder={t('biz.places.hours')}
            placeholderTextColor={Colors.textMuted}
          />
          <View style={styles.chipRow}>
            {BUSINESS_VIBES.map(item => (
              <TouchableOpacity
                key={item.id}
                style={[styles.chip, editing?.vibe === item.id && styles.chipOn]}
                onPress={() => setEditing(e => e ? { ...e, vibe: item.id as BusinessVibe } : e)}
              >
                <Text style={[styles.chipText, editing?.vibe === item.id && styles.chipTextOn]}>
                  {item.emoji} {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity onPress={save} style={styles.save}>
            <LinearGradient colors={Gradients.primary} style={styles.saveGrad}>
              <Text style={styles.saveText}>{t('biz.places.save')}</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setEditing(null)} style={styles.cancel}>
            <Text style={styles.cancelText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.primaryTint },
  scroll: { paddingHorizontal: 20 },
  title: { fontSize: 24, fontWeight: '900', color: Colors.textDark, marginBottom: 16 },
  card: { backgroundColor: Colors.white, borderRadius: 22, padding: 14, marginBottom: 10, ...Shadows.soft },
  cardTop: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  icon: {
    width: 40, height: 40, borderRadius: 14, backgroundColor: Colors.primaryTint,
    alignItems: 'center', justifyContent: 'center',
  },
  name: { fontSize: 15, fontWeight: '800', color: Colors.textDark },
  addr: { fontSize: 12, color: Colors.textMid, marginTop: 2 },
  meta: { fontSize: 11, color: Colors.textMuted, marginTop: 4 },
  pill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  pillOn: { backgroundColor: 'rgba(16,185,129,0.12)' },
  pillOff: { backgroundColor: Colors.primaryTint },
  pillText: { fontSize: 10, fontWeight: '800', color: Colors.activeGreen },
  empty: {
    backgroundColor: Colors.white, borderRadius: 22, padding: 28, alignItems: 'center', gap: 8, ...Shadows.soft,
  },
  emptyTitle: { fontSize: 14, fontWeight: '800', color: Colors.textDark },
  emptyDesc: { fontSize: 12, color: Colors.textMuted, textAlign: 'center' },
  sheet: { flex: 1, backgroundColor: Colors.primaryTint, paddingHorizontal: 20 },
  input: {
    backgroundColor: Colors.white, borderRadius: 16, borderWidth: 1, borderColor: Colors.primarySoft,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10, color: Colors.textDark,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14,
    backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.primarySoft,
  },
  chipOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryTint },
  chipText: { fontSize: 12, fontWeight: '700', color: Colors.textMid },
  chipTextOn: { color: Colors.primary },
  save: { borderRadius: 16, overflow: 'hidden', ...Shadows.glow },
  saveGrad: { paddingVertical: 14, alignItems: 'center' },
  saveText: { color: Colors.white, fontWeight: '800' },
  cancel: { alignItems: 'center', paddingVertical: 14 },
  cancelText: { color: Colors.textMid, fontWeight: '700' },
});
