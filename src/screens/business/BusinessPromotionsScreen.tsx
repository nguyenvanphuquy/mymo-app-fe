import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Image, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Colors, Shadows } from '../../constants/colors';
import { useI18n } from '../../i18n';
import {
  deletePromotion, formatPromotionRange, getPlacePromotions, type PromotionDto,
} from '../../services/businessPromotionApi';
import BusinessPromotionFormScreen from './BusinessPromotionFormScreen';

function statusStyle(status: string) {
  if (status === 'Active') return styles.statusActive;
  if (status === 'Upcoming') return styles.statusUpcoming;
  return styles.statusExpired;
}

export default function BusinessPromotionsScreen({
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
  const [items, setItems] = useState<PromotionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'create' | 'edit'>('list');
  const [editItem, setEditItem] = useState<PromotionDto | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setItems(await getPlacePromotions(placeId));
    } catch (e) {
      Toast.show({ type: 'error', text1: e instanceof Error ? e.message : 'Load failed' });
    } finally {
      setLoading(false);
    }
  }, [placeId]);

  useEffect(() => { load(); }, [load]);

  const onDelete = (item: PromotionDto) => {
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

  if (view === 'create') {
    return (
      <BusinessPromotionFormScreen
        mode="create"
        placeId={placeId}
        onBack={() => setView('list')}
        onSaved={() => { setView('list'); load(); }}
      />
    );
  }

  if (view === 'edit' && editItem) {
    return (
      <BusinessPromotionFormScreen
        mode="edit"
        placeId={placeId}
        initial={editItem}
        onBack={() => { setView('list'); setEditItem(null); }}
        onSaved={() => { setView('list'); setEditItem(null); load(); }}
      />
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={Colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('biz.promo.title') ?? 'Promotions'}</Text>
        <View style={{ width: 24 }} />
      </View>
      <Text style={styles.subtitle}>{placeName}</Text>
      <TouchableOpacity style={styles.addBtn} onPress={() => setView('create')}>
        <Ionicons name="add-circle-outline" size={20} color={Colors.white} />
        <Text style={styles.addBtnText}>{t('biz.promo.create') ?? '+ Create promotion'}</Text>
      </TouchableOpacity>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={Colors.primary} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {items.length === 0 ? (
            <Text style={styles.empty}>{t('biz.promo.empty') ?? 'No promotions yet'}</Text>
          ) : (
            items.map(item => (
              <View key={item.id} style={styles.card}>
                {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.hero} /> : null}
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  {item.description ? <Text style={styles.desc} numberOfLines={3}>{item.description}</Text> : null}
                  <Text style={styles.range}>{formatPromotionRange(item.startAt, item.endAt)}</Text>
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.primaryTint },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 8 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '900', color: Colors.textDark, textAlign: 'center' },
  subtitle: { textAlign: 'center', color: Colors.textMuted, fontSize: 13, marginVertical: 10 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 20, backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 12, marginBottom: 12,
  },
  addBtnText: { color: Colors.white, fontWeight: '800' },
  scroll: { paddingHorizontal: 20, paddingBottom: 120 },
  empty: { textAlign: 'center', color: Colors.textMuted, marginTop: 32 },
  card: { backgroundColor: Colors.white, borderRadius: 16, marginBottom: 14, overflow: 'hidden', ...Shadows.soft },
  hero: { width: '100%', height: 120, backgroundColor: Colors.primarySoft },
  cardBody: { padding: 14 },
  cardTitle: { fontSize: 17, fontWeight: '900', color: Colors.textDark },
  desc: { fontSize: 13, color: Colors.textMuted, marginTop: 6, lineHeight: 18 },
  range: { fontSize: 12, color: Colors.textDark, marginTop: 8, fontWeight: '600' },
  statusPill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginTop: 8 },
  statusActive: { backgroundColor: 'rgba(16,185,129,0.2)' },
  statusUpcoming: { backgroundColor: Colors.primarySoft },
  statusExpired: { backgroundColor: 'rgba(156,163,175,0.3)' },
  statusText: { fontSize: 11, fontWeight: '800', color: Colors.textDark },
  actions: { flexDirection: 'row', gap: 16, marginTop: 12 },
  edit: { color: Colors.primary, fontWeight: '800' },
  del: { color: '#DC2626', fontWeight: '800' },
});
