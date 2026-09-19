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
  addEvent,
  listEvents,
  listPlaces,
  type BusinessEvent,
  type BusinessPlace,
  type BusinessSession,
  type BusinessVibe,
} from '../../utils/businessStorage';

export default function BusinessEventsScreen({
  session,
  createOpen,
  onCloseCreate,
  onOpenCreate,
}: {
  session: BusinessSession;
  createOpen: boolean;
  onCloseCreate: () => void;
  onOpenCreate: () => void;
}) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [events, setEvents] = useState<BusinessEvent[]>([]);
  const [places, setPlaces] = useState<BusinessPlace[]>([]);
  const [title, setTitle] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [coverNote, setCoverNote] = useState('');
  const [vibe, setVibe] = useState<BusinessVibe>('party');
  const [placeId, setPlaceId] = useState('');

  const load = useCallback(async () => {
    const [ev, pl] = await Promise.all([listEvents(session.accountId), listPlaces(session.accountId)]);
    setEvents(ev);
    setPlaces(pl);
    setPlaceId(prev => prev || pl[0]?.id || '');
  }, [session.accountId]);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!title.trim() || !startsAt.trim() || !placeId) {
      Toast.show({ type: 'error', text1: t('biz.events.needFields') });
      return;
    }
    await addEvent({
      id: `evt_${Date.now()}`,
      accountId: session.accountId,
      title: title.trim(),
      startsAt: startsAt.trim(),
      vibe,
      placeId,
      coverNote: coverNote.trim(),
    });
    Toast.show({ type: 'success', text1: t('biz.events.created') });
    setTitle('');
    setStartsAt('');
    setCoverNote('');
    onCloseCreate();
    load();
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.head}>
          <Text style={styles.title}>{t('biz.events.title')}</Text>
          <TouchableOpacity onPress={onOpenCreate}>
            <Text style={styles.add}>{t('biz.events.create')}</Text>
          </TouchableOpacity>
        </View>
        {events.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={28} color={Colors.primary} />
            <Text style={styles.emptyTitle}>{t('biz.events.empty')}</Text>
            <Text style={styles.emptyDesc}>{t('biz.events.emptyDesc')}</Text>
          </View>
        ) : (
          events.map(ev => (
            <View key={ev.id} style={styles.card}>
              <Text style={styles.name}>{ev.title}</Text>
              <Text style={styles.meta}>{ev.startsAt} · {ev.vibe}</Text>
              {ev.coverNote ? <Text style={styles.note}>{ev.coverNote}</Text> : null}
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={createOpen} animationType="slide" onRequestClose={onCloseCreate}>
        <View style={[styles.sheet, { paddingTop: insets.top + 12 }]}>
          <Text style={styles.title}>{t('biz.events.create')}</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder={t('biz.events.name')}
            placeholderTextColor={Colors.textMuted}
          />
          <TextInput
            style={styles.input}
            value={startsAt}
            onChangeText={setStartsAt}
            placeholder={t('biz.events.when')}
            placeholderTextColor={Colors.textMuted}
          />
          <TextInput
            style={[styles.input, { minHeight: 72 }]}
            value={coverNote}
            onChangeText={setCoverNote}
            placeholder={t('biz.events.cover')}
            placeholderTextColor={Colors.textMuted}
            multiline
          />
          <View style={styles.chipRow}>
            {BUSINESS_VIBES.map(item => (
              <TouchableOpacity
                key={item.id}
                style={[styles.chip, vibe === item.id && styles.chipOn]}
                onPress={() => setVibe(item.id)}
              >
                <Text style={[styles.chipText, vibe === item.id && styles.chipTextOn]}>
                  {item.emoji} {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.label}>{t('biz.events.place')}</Text>
          {places.map(p => (
            <TouchableOpacity
              key={p.id}
              style={[styles.placeRow, placeId === p.id && styles.placeOn]}
              onPress={() => setPlaceId(p.id)}
            >
              <Text style={styles.placeText}>{p.name}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={submit} style={styles.save}>
            <LinearGradient colors={Gradients.primary} style={styles.saveGrad}>
              <Text style={styles.saveText}>{t('biz.events.create')}</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity onPress={onCloseCreate} style={styles.cancel}>
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
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '900', color: Colors.textDark, marginBottom: 8 },
  add: { fontSize: 13, fontWeight: '800', color: Colors.primary },
  card: { backgroundColor: Colors.white, borderRadius: 20, padding: 16, marginBottom: 10, ...Shadows.soft },
  name: { fontSize: 15, fontWeight: '800', color: Colors.textDark },
  meta: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
  note: { fontSize: 13, color: Colors.textMid, marginTop: 8 },
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
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14,
    backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.primarySoft,
  },
  chipOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryTint },
  chipText: { fontSize: 12, fontWeight: '700', color: Colors.textMid },
  chipTextOn: { color: Colors.primary },
  label: { fontSize: 11, fontWeight: '800', color: Colors.textMuted, marginBottom: 8 },
  placeRow: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: Colors.primarySoft,
  },
  placeOn: { borderColor: Colors.primary },
  placeText: { fontWeight: '700', color: Colors.textDark },
  save: { borderRadius: 16, overflow: 'hidden', marginTop: 8, ...Shadows.glow },
  saveGrad: { paddingVertical: 14, alignItems: 'center' },
  saveText: { color: Colors.white, fontWeight: '800' },
  cancel: { alignItems: 'center', paddingVertical: 14 },
  cancelText: { color: Colors.textMid, fontWeight: '700' },
});
