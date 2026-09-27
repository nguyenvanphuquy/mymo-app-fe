import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Image, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Colors, Gradients, Shadows } from '../../constants/colors';
import { useI18n } from '../../i18n';
import BusinessScreenHeader from '../../components/business/BusinessScreenHeader';
import {
  deletePromotion, formatPromotionRange, getPlacePromotions, type PromotionDto,
} from '../../services/businessPromotionApi';
import BusinessPromotionFormScreen from './BusinessPromotionFormScreen';

type StatusFilter = 'all' | 'Active' | 'Upcoming' | 'Expired';

function statusStyle(status: string) {
  if (status === 'Active') return styles.statusActive;
  if (status === 'Upcoming') return styles.statusUpcoming;
  return styles.statusExpired;
}

function statusLabel(t: (k: string) => string, status: string): string {
  if (status === 'Active') return t('biz.promo.statusActive');
  if (status === 'Upcoming') return t('biz.promo.statusUpcoming');
  return t('biz.promo.statusExpired');
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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

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

  const stats = useMemo(() => ({
    total: items.length,
    active: items.filter(i => i.status === 'Active').length,
    upcoming: items.filter(i => i.status === 'Upcoming').length,
  }), [items]);

  const filtered = useMemo(() => (
    statusFilter === 'all' ? items : items.filter(i => i.status === statusFilter)
  ), [items, statusFilter]);

  const onDelete = (item: PromotionDto) => {
    Alert.alert(t('biz.promo.deleteTitle'), item.title, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePromotion(item.id);
            await load();
            Toast.show({ type: 'success', text1: t('biz.promo.deleted') });
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
        placeName={placeName}
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
        placeName={placeName}
        initial={editItem}
        onBack={() => { setView('list'); setEditItem(null); }}
        onSaved={() => { setView('list'); setEditItem(null); load(); }}
      />
    );
  }

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#FAFAFC', '#F0EAFF']} style={StyleSheet.absoluteFill} />
      <View style={{ paddingTop: insets.top }}>
        <BusinessScreenHeader title={t('biz.promo.title')} onBack={onBack} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient colors={Gradients.primary} style={styles.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={styles.heroRow}>
            <View style={styles.heroIcon}>
              <Ionicons name="megaphone" size={22} color={Colors.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroPlace} numberOfLines={2}>{placeName}</Text>
              <Text style={styles.heroHint}>{t('biz.promo.heroHint')}</Text>
            </View>
          </View>
          <View style={styles.heroStats}>
            <HeroStat n={String(stats.total)} l={t('biz.promo.statTotal')} />
            <HeroStat n={String(stats.active)} l={t('biz.promo.statActive')} />
            <HeroStat n={String(stats.upcoming)} l={t('biz.promo.statUpcoming')} />
          </View>
        </LinearGradient>

        <TouchableOpacity style={styles.addCard} onPress={() => setView('create')} activeOpacity={0.9}>
          <LinearGradient colors={Gradients.primary} style={styles.addIcon}>
            <Ionicons name="add" size={26} color={Colors.white} />
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={styles.addTitle}>{t('biz.promo.create')}</Text>
            <Text style={styles.addSub}>{t('biz.promo.createSub')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 32 }} color={Colors.primary} />
        ) : items.length === 0 ? (
          <View style={styles.empty}>
            <LinearGradient colors={['#FFFFFF', '#F6F2FF']} style={styles.emptyIcon}>
              <Ionicons name="gift-outline" size={36} color={Colors.primary} />
            </LinearGradient>
            <Text style={styles.emptyTitle}>{t('biz.promo.empty')}</Text>
            <Text style={styles.emptyDesc}>{t('biz.promo.emptyDesc')}</Text>
          </View>
        ) : (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
              {(['all', 'Active', 'Upcoming', 'Expired'] as const).map(key => {
                const on = statusFilter === key;
                const label = key === 'all' ? t('biz.events.filterAll') : statusLabel(t, key);
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

            {filtered.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>{t('biz.promo.filterEmpty')}</Text>
                <TouchableOpacity onPress={() => setStatusFilter('all')}>
                  <Text style={styles.filterReset}>{t('biz.events.filterReset')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              filtered.map(item => (
                <PromoCard
                  key={item.id}
                  item={item}
                  t={t}
                  statusText={statusLabel(t, item.status)}
                  onEdit={() => { setEditItem(item); setView('edit'); }}
                  onDelete={() => onDelete(item)}
                />
              ))
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function HeroStat({ n, l }: { n: string; l: string }) {
  return (
    <View style={styles.heroStat}>
      <Text style={styles.heroStatN}>{n}</Text>
      <Text style={styles.heroStatL} numberOfLines={1}>{l}</Text>
    </View>
  );
}

function PromoCard({
  item, t, statusText, onEdit, onDelete,
}: {
  item: PromotionDto;
  t: (k: string) => string;
  statusText: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={styles.card}>
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.heroImg} resizeMode="cover" />
      ) : (
        <LinearGradient colors={['#FFB8E0', '#E879A8']} style={styles.heroImg}>
          <Ionicons name="sparkles" size={32} color="rgba(255,255,255,0.85)" />
        </LinearGradient>
      )}
      <View style={[styles.statusBadge, statusStyle(item.status)]}>
        <Text style={styles.statusBadgeText}>{statusText}</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        {item.description ? (
          <Text style={styles.desc} numberOfLines={3}>{item.description}</Text>
        ) : null}
        <View style={styles.rangeRow}>
          <Ionicons name="calendar-outline" size={14} color={Colors.primary} />
          <Text style={styles.range}>{formatPromotionRange(item.startAt, item.endAt)}</Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} onPress={onEdit}>
            <Ionicons name="create-outline" size={16} color={Colors.primary} />
            <Text style={styles.edit}>{t('common.edit')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={onDelete}>
            <Ionicons name="trash-outline" size={16} color="#DC2626" />
            <Text style={styles.del}>{t('common.delete')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAFAFC' },
  scroll: { paddingHorizontal: 20, paddingTop: 8 },
  hero: { borderRadius: 22, padding: 18, marginBottom: 16, overflow: 'hidden', ...Shadows.glow },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroIcon: {
    width: 44, height: 44, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
  },
  heroPlace: { fontSize: 17, fontWeight: '900', color: Colors.white },
  heroHint: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 4, fontWeight: '600', lineHeight: 17 },
  heroStats: { flexDirection: 'row', gap: 8, marginTop: 16 },
  heroStat: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14,
    paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  heroStatN: { fontSize: 18, fontWeight: '900', color: Colors.white },
  heroStatL: { fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.8)', marginTop: 2, textTransform: 'uppercase' },
  addCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.white, borderRadius: 18, padding: 14, marginBottom: 16,
    borderWidth: 2, borderColor: Colors.primarySoft, borderStyle: 'dashed', ...Shadows.soft,
  },
  addIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  addTitle: { fontSize: 15, fontWeight: '900', color: Colors.textDark },
  addSub: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  filters: { gap: 8, marginBottom: 14, paddingRight: 8 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.primarySoft,
  },
  filterChipOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterChipText: { fontSize: 12, fontWeight: '800', color: Colors.textMuted },
  filterChipTextOn: { color: Colors.white },
  filterReset: { fontSize: 13, fontWeight: '800', color: Colors.primary, marginTop: 8 },
  empty: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 12, gap: 8 },
  emptyIcon: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 16, fontWeight: '900', color: Colors.textDark, textAlign: 'center' },
  emptyDesc: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
  card: {
    backgroundColor: Colors.white, borderRadius: 20, marginBottom: 14,
    overflow: 'hidden', borderWidth: 1, borderColor: '#EEEAF5', ...Shadows.soft,
  },
  heroImg: { width: '100%', height: 130, alignItems: 'center', justifyContent: 'center' },
  statusBadge: { position: 'absolute', top: 12, right: 12, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusActive: { backgroundColor: 'rgba(16,185,129,0.92)' },
  statusUpcoming: { backgroundColor: 'rgba(124,91,255,0.92)' },
  statusExpired: { backgroundColor: 'rgba(107,114,128,0.85)' },
  statusBadgeText: { fontSize: 10, fontWeight: '900', color: Colors.white, textTransform: 'uppercase' },
  cardBody: { padding: 16 },
  cardTitle: { fontSize: 17, fontWeight: '900', color: Colors.textDark },
  desc: { fontSize: 13, color: Colors.textMuted, marginTop: 6, lineHeight: 18 },
  rangeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  range: { fontSize: 12, color: Colors.textMid, fontWeight: '700', flex: 1 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 12, backgroundColor: Colors.primaryTint,
  },
  actionBtnDanger: { backgroundColor: 'rgba(220,38,38,0.08)' },
  edit: { color: Colors.primary, fontWeight: '800', fontSize: 13 },
  del: { color: '#DC2626', fontWeight: '800', fontSize: 13 },
});
