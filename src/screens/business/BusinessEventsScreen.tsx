import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Image, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Colors, Gradients, Shadows } from '../../constants/colors';
import { useI18n } from '../../i18n';
import type { BusinessSession } from '../../services/businessApi';
import { getMyPlaces, type BusinessPlaceDto } from '../../services/businessApi';
import {
  deletePromotion,
  formatPromotionRange,
  getAllMyPromotions,
  type PromotionWithPlace,
} from '../../services/businessPromotionApi';
import BusinessPromotionFormScreen from './BusinessPromotionFormScreen';

function statusStyle(status: string) {
  if (status === 'Active') return styles.statusActive;
  if (status === 'Upcoming') return styles.statusUpcoming;
  return styles.statusExpired;
}

export default function BusinessEventsScreen({
  session: _session,
  createOpen,
  onCloseCreate,
}: {
  session: BusinessSession;
  createOpen: boolean;
  onCloseCreate: () => void;
  onOpenCreate: () => void;
}) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [places, setPlaces] = useState<BusinessPlaceDto[]>([]);
  const [items, setItems] = useState<PromotionWithPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'pickPlace' | 'create' | 'edit'>('list');
  const [createPlaceId, setCreatePlaceId] = useState('');
  const [editItem, setEditItem] = useState<PromotionWithPlace | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'Active' | 'Upcoming' | 'Expired'>('all');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const pl = await getMyPlaces();
      setPlaces(pl);
      setItems(await getAllMyPromotions(pl.map(p => ({ placeId: p.placeId, name: p.name }))));
    } catch (e) {
      Toast.show({ type: 'error', text1: e instanceof Error ? e.message : 'Load failed' });
    } finally {
      setLoading(false);
    }
  }, []);

  const pendingCreateRef = useRef(false);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!createOpen) return;
    pendingCreateRef.current = true;
    onCloseCreate();
  }, [createOpen, onCloseCreate]);

  const beginCreate = useCallback(() => {
    if (loading) {
      pendingCreateRef.current = true;
      return;
    }
    if (places.length === 0) {
      Toast.show({ type: 'info', text1: t('biz.events.noPlaces') ?? 'Create a place first (Places tab)' });
      return;
    }
    setCreatePlaceId(places.length === 1 ? places[0].placeId : '');
    setView('pickPlace');
  }, [places, t, loading]);

  useEffect(() => {
    if (loading || !pendingCreateRef.current) return;
    pendingCreateRef.current = false;
    beginCreate();
  }, [loading, places, beginCreate]);

  const exitCreateFlow = () => {
    setCreatePlaceId('');
    setView('list');
    onCloseCreate();
  };

  const onDelete = (item: PromotionWithPlace) => {
    Alert.alert(t('biz.promo.deleteTitle') ?? 'Delete', item.title, [
      { text: t('common.cancel') ?? 'Cancel', style: 'cancel' },
      {
        text: t('common.delete') ?? 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePromotion(item.id);
            await load();
          } catch (e) {
            Toast.show({ type: 'error', text1: e instanceof Error ? e.message : 'Delete failed' });
          }
        },
      },
    ]);
  };

  const selectedPlace = places.find(p => p.placeId === createPlaceId);
  const filteredItems = statusFilter === 'all'
    ? items
    : items.filter(i => i.status === statusFilter);

  if (view === 'create' && createPlaceId) {
    return (
      <BusinessPromotionFormScreen
        mode="create"
        placeId={createPlaceId}
        placeName={selectedPlace?.name}
        onChangePlace={places.length > 1 ? () => setView('pickPlace') : undefined}
        onBack={exitCreateFlow}
        onSaved={() => { exitCreateFlow(); load(); }}
      />
    );
  }

  if (view === 'edit' && editItem) {
    return (
      <BusinessPromotionFormScreen
        mode="edit"
        placeId={editItem.placeId}
        initial={editItem}
        onBack={() => { setView('list'); setEditItem(null); }}
        onSaved={() => { setView('list'); setEditItem(null); load(); }}
      />
    );
  }

  if (view === 'pickPlace') {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
        <View style={styles.pickHeader}>
          <TouchableOpacity onPress={exitCreateFlow} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={Colors.textDark} />
          </TouchableOpacity>
          <Text style={styles.pickHeaderTitle}>{t('biz.events.create')}</Text>
          <View style={{ width: 24 }} />
        </View>
        <Text style={styles.pickSection}>{t('biz.events.place')}</Text>
        <Text style={styles.pickHint}>{t('biz.events.pickPlace') ?? 'Choose a branch for this event'}</Text>
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: 24 }]}>
          {places.map(p => {
            const selected = createPlaceId === p.placeId;
            return (
              <TouchableOpacity
                key={p.placeId}
                style={[styles.placeRow, selected && styles.placeRowOn]}
                onPress={() => setCreatePlaceId(p.placeId)}
                activeOpacity={0.88}
              >
                <View style={styles.placeRowMain}>
                  <Text style={styles.placeText}>{p.name}</Text>
                  {p.address ? <Text style={styles.placeAddr} numberOfLines={1}>{p.address}</Text> : null}
                </View>
                {selected ? (
                  <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />
                ) : (
                  <Ionicons name="ellipse-outline" size={22} color={Colors.textMuted} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <View style={[styles.pickFooter, { paddingBottom: insets.bottom + 100 }]}>
          <TouchableOpacity
            style={[styles.continueBtn, !createPlaceId && styles.continueBtnDisabled]}
            disabled={!createPlaceId}
            onPress={() => setView('create')}
            activeOpacity={0.88}
          >
            <LinearGradient colors={Gradients.primary} style={styles.continueGrad}>
              <Text style={styles.continueText}>{t('biz.events.continue') ?? 'Continue'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.head}>
          <Text style={styles.title}>{t('biz.events.title')}</Text>
          <TouchableOpacity onPress={beginCreate}>
            <Text style={styles.add}>{t('biz.events.create')}</Text>
          </TouchableOpacity>
        </View>
        {!loading && items.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
            {(['all', 'Active', 'Upcoming', 'Expired'] as const).map(key => {
              const on = statusFilter === key;
              const label = key === 'all' ? t('biz.events.filterAll') : key;
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => setStatusFilter(key)}
                  style={[styles.filterChip, on && styles.filterChipOn]}
                >
                  <Text style={[styles.filterChipText, on && styles.filterChipTextOn]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : null}
        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={Colors.primary} />
        ) : items.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={28} color={Colors.primary} />
            <Text style={styles.emptyTitle}>{t('biz.events.empty')}</Text>
            <Text style={styles.emptyDesc}>{t('biz.events.emptyDesc')}</Text>
            <TouchableOpacity onPress={beginCreate} style={styles.emptyBtn} activeOpacity={0.88}>
              <LinearGradient colors={Gradients.primary} style={styles.emptyBtnGrad}>
                <Text style={styles.emptyBtnText}>{t('biz.events.create')}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : filteredItems.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{t('biz.events.filterEmpty')}</Text>
            <TouchableOpacity onPress={() => setStatusFilter('all')}>
              <Text style={styles.add}>{t('biz.events.filterReset')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredItems.map(item => (
            <View key={item.id} style={styles.card}>
              {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.hero} /> : null}
              <View style={styles.cardBody}>
                <Text style={styles.placeLabel}>{item.placeName}</Text>
                <Text style={styles.name}>{item.title}</Text>
                {item.description ? (
                  <Text style={styles.note} numberOfLines={3}>{item.description}</Text>
                ) : null}
                <Text style={styles.meta}>{formatPromotionRange(item.startAt, item.endAt)}</Text>
                <View style={[styles.statusPill, statusStyle(item.status)]}>
                  <Text style={styles.statusText}>{item.status}</Text>
                </View>
                <View style={styles.actions}>
                  <TouchableOpacity onPress={() => { setEditItem(item); setView('edit'); }}>
                    <Text style={styles.edit}>{t('common.edit') ?? 'Edit'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => onDelete(item)}>
                    <Text style={styles.del}>{t('common.delete') ?? 'Delete'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.primaryTint },
  scroll: { paddingHorizontal: 20 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  filterScroll: { marginBottom: 12, marginHorizontal: -20 },
  filterRow: { paddingHorizontal: 20, gap: 8 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.primarySoft,
  },
  filterChipOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterChipText: { fontSize: 12, fontWeight: '800', color: Colors.textMuted },
  filterChipTextOn: { color: Colors.white },
  title: { fontSize: 24, fontWeight: '900', color: Colors.textDark },
  add: { fontSize: 13, fontWeight: '800', color: Colors.primary },
  pickHint: { fontSize: 13, color: Colors.textMuted, paddingHorizontal: 20, marginBottom: 12 },
  card: { backgroundColor: Colors.white, borderRadius: 20, marginBottom: 12, overflow: 'hidden', ...Shadows.soft },
  hero: { width: '100%', height: 100, backgroundColor: Colors.primarySoft },
  cardBody: { padding: 16 },
  placeLabel: { fontSize: 11, fontWeight: '800', color: Colors.primary, marginBottom: 4, textTransform: 'uppercase' },
  name: { fontSize: 15, fontWeight: '800', color: Colors.textDark },
  meta: { fontSize: 12, color: Colors.textMuted, marginTop: 6, fontWeight: '600' },
  note: { fontSize: 13, color: Colors.textMid, marginTop: 6, lineHeight: 18 },
  statusPill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginTop: 8 },
  statusActive: { backgroundColor: 'rgba(16,185,129,0.2)' },
  statusUpcoming: { backgroundColor: Colors.primarySoft },
  statusExpired: { backgroundColor: 'rgba(156,163,175,0.3)' },
  statusText: { fontSize: 11, fontWeight: '800', color: Colors.textDark },
  actions: { flexDirection: 'row', gap: 16, marginTop: 12 },
  edit: { color: Colors.primary, fontWeight: '800' },
  del: { color: '#DC2626', fontWeight: '800' },
  empty: {
    backgroundColor: Colors.white, borderRadius: 22, padding: 28, alignItems: 'center', gap: 8, ...Shadows.soft,
  },
  emptyTitle: { fontSize: 14, fontWeight: '800', color: Colors.textDark },
  emptyDesc: { fontSize: 12, color: Colors.textMuted, textAlign: 'center' },
  emptyBtn: { marginTop: 12, borderRadius: 16, overflow: 'hidden', alignSelf: 'stretch' },
  emptyBtnGrad: { paddingVertical: 12, alignItems: 'center' },
  emptyBtnText: { color: Colors.white, fontWeight: '800' },
  pickHeader: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12, gap: 8,
  },
  pickHeaderTitle: { flex: 1, fontSize: 17, fontWeight: '900', color: Colors.textDark, textAlign: 'center' },
  pickSection: { fontSize: 13, fontWeight: '800', color: Colors.textMuted, paddingHorizontal: 20, marginBottom: 4 },
  placeRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.white, borderRadius: 14, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: Colors.primarySoft,
  },
  placeRowOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryTint },
  placeRowMain: { flex: 1, marginRight: 8 },
  placeText: { fontWeight: '800', color: Colors.textDark, fontSize: 15 },
  placeAddr: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
  pickFooter: { paddingHorizontal: 20, paddingTop: 8 },
  continueBtn: { borderRadius: 16, overflow: 'hidden', ...Shadows.glow },
  continueBtnDisabled: { opacity: 0.45 },
  continueGrad: { paddingVertical: 14, alignItems: 'center' },
  continueText: { color: Colors.white, fontWeight: '800', fontSize: 16 },
});
