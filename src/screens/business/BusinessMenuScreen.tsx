import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Image, TextInput, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Colors, Gradients, Shadows } from '../../constants/colors';
import { useI18n } from '../../i18n';
import BusinessScreenHeader from '../../components/business/BusinessScreenHeader';
import {
  createPlaceMenu, deleteMenuItem, formatVnd, getPlaceMenu, type BusinessMenuDto, type MenuItemDto,
} from '../../services/businessMenuApi';
import BusinessMenuItemFormScreen from './BusinessMenuItemFormScreen';

export default function BusinessMenuScreen({
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
  const [menu, setMenu] = useState<BusinessMenuDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [creatingMenu, setCreatingMenu] = useState(false);
  const [newMenuName, setNewMenuName] = useState('');
  const [itemForm, setItemForm] = useState<'list' | 'create' | 'edit'>('list');
  const [editItem, setEditItem] = useState<MenuItemDto | null>(null);

  useEffect(() => {
    setNewMenuName(t('biz.menu.defaultName'));
  }, [t]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setMenu(await getPlaceMenu(placeId));
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (msg.toLowerCase().includes('not found')) {
        setMenu(null);
      } else {
        Toast.show({ type: 'error', text1: msg || 'Load failed' });
      }
    } finally {
      setLoading(false);
    }
  }, [placeId]);

  useEffect(() => { load(); }, [load]);

  const grouped = useMemo(() => {
    if (!menu?.items.length) return [] as { title: string; items: MenuItemDto[] }[];
    const map = new Map<string, MenuItemDto[]>();
    for (const item of menu.items) {
      const key = item.categoryName?.trim() || t('biz.menu.uncategorized');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return Array.from(map.entries()).map(([title, items]) => ({ title, items }));
  }, [menu, t]);

  const stats = useMemo(() => {
    const items = menu?.items ?? [];
    const available = items.filter(i => i.isAvailable).length;
    const categories = new Set(items.map(i => i.categoryName?.trim() || t('biz.menu.uncategorized'))).size;
    return { total: items.length, available, categories };
  }, [menu, t]);

  const onCreateMenu = async () => {
    if (!newMenuName.trim()) return;
    try {
      setCreatingMenu(true);
      setMenu(await createPlaceMenu(placeId, { name: newMenuName.trim() }));
      Toast.show({ type: 'success', text1: t('biz.menu.menuCreated') });
    } catch (e) {
      Toast.show({ type: 'error', text1: e instanceof Error ? e.message : 'Failed' });
    } finally {
      setCreatingMenu(false);
    }
  };

  const confirmDelete = (item: MenuItemDto) => {
    Alert.alert(t('biz.menu.deleteTitle'), item.name, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMenuItem(item.id);
            await load();
            Toast.show({ type: 'success', text1: t('biz.menu.deleted') });
          } catch (e) {
            Toast.show({ type: 'error', text1: e instanceof Error ? e.message : 'Delete failed' });
          }
        },
      },
    ]);
  };

  if (itemForm === 'create' && menu) {
    return (
      <BusinessMenuItemFormScreen
        mode="create"
        menuId={menu.id}
        onBack={() => setItemForm('list')}
        onSaved={() => { setItemForm('list'); load(); }}
      />
    );
  }

  if (itemForm === 'edit' && menu && editItem) {
    return (
      <BusinessMenuItemFormScreen
        mode="edit"
        menuId={menu.id}
        initial={editItem}
        onBack={() => { setItemForm('list'); setEditItem(null); }}
        onSaved={() => { setItemForm('list'); setEditItem(null); load(); }}
      />
    );
  }

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#FAFAFC', '#F0EAFF']} style={StyleSheet.absoluteFill} />
      <View style={{ paddingTop: insets.top }}>
        <BusinessScreenHeader title={t('biz.menu.title')} onBack={onBack} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient colors={Gradients.primary} style={styles.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={styles.heroRow}>
            <View style={styles.heroIcon}>
              <Ionicons name="restaurant" size={22} color={Colors.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroPlace} numberOfLines={2}>{placeName}</Text>
              <Text style={styles.heroHint}>{t('biz.menu.heroHint')}</Text>
            </View>
          </View>
          {menu ? (
            <View style={styles.heroStats}>
              <HeroStat n={String(stats.total)} l={t('biz.menu.statItems')} />
              <HeroStat n={String(stats.available)} l={t('biz.menu.statAvailable')} />
              <HeroStat n={String(stats.categories)} l={t('biz.menu.statCategories')} />
            </View>
          ) : null}
        </LinearGradient>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 32 }} color={Colors.primary} />
        ) : !menu ? (
          <View style={styles.setupCard}>
            <LinearGradient colors={['#FFFFFF', '#F6F2FF']} style={styles.setupIcon}>
              <Ionicons name="book-outline" size={32} color={Colors.primary} />
            </LinearGradient>
            <Text style={styles.setupTitle}>{t('biz.menu.noMenu')}</Text>
            <Text style={styles.setupDesc}>{t('biz.menu.noMenuDesc')}</Text>
            <Text style={styles.fieldLabel}>{t('biz.menu.menuNameLabel')}</Text>
            <TextInput
              style={styles.input}
              value={newMenuName}
              onChangeText={setNewMenuName}
              placeholder={t('biz.menu.defaultName')}
              placeholderTextColor={Colors.textMuted}
            />
            <TouchableOpacity onPress={onCreateMenu} disabled={creatingMenu} activeOpacity={0.9}>
              <LinearGradient colors={Gradients.primary} style={styles.primaryGrad}>
                {creatingMenu ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.primaryGradText}>{t('biz.menu.createMenu')}</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.menuTitleRow}>
              <Text style={styles.menuName}>{menu.name}</Text>
              <View style={styles.activePill}>
                <View style={styles.activeDot} />
                <Text style={styles.activeText}>{t('biz.menu.active')}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.addCard}
              onPress={() => setItemForm('create')}
              activeOpacity={0.9}
            >
              <LinearGradient colors={['#FFFFFF', '#F6F2FF']} style={styles.addIcon}>
                <Ionicons name="add" size={28} color={Colors.primary} />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={styles.addTitle}>{t('biz.menu.addItem')}</Text>
                <Text style={styles.addSub}>{t('biz.menu.addItemSub')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
            </TouchableOpacity>

            {menu.items.length === 0 ? (
              <View style={styles.emptyItems}>
                <Ionicons name="fast-food-outline" size={36} color={Colors.textMuted} />
                <Text style={styles.emptyItemsTitle}>{t('biz.menu.noItems')}</Text>
                <Text style={styles.emptyItemsDesc}>{t('biz.menu.noItemsDesc')}</Text>
              </View>
            ) : (
              grouped.map(section => (
                <View key={section.title} style={styles.section}>
                  <View style={styles.sectionHead}>
                    <Ionicons name="pricetag-outline" size={16} color={Colors.primary} />
                    <Text style={styles.sectionTitle}>{section.title}</Text>
                    <Text style={styles.sectionCount}>{section.items.length}</Text>
                  </View>
                  {section.items.map(item => (
                    <MenuItemCard
                      key={item.id}
                      item={item}
                      t={t}
                      onEdit={() => { setEditItem(item); setItemForm('edit'); }}
                      onDelete={() => confirmDelete(item)}
                    />
                  ))}
                </View>
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

function MenuItemCard({
  item, t, onEdit, onDelete,
}: {
  item: MenuItemDto;
  t: (k: string) => string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={styles.card}>
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.thumb} resizeMode="cover" />
      ) : (
        <LinearGradient colors={['#E8DFFF', '#C8A8FF']} style={styles.thumbPlaceholder}>
          <Ionicons name="fast-food-outline" size={28} color={Colors.primary} />
        </LinearGradient>
      )}
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.price}>{formatVnd(item.price)}</Text>
        </View>
        {item.description ? (
          <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
        ) : null}
        <View style={styles.cardFooter}>
          <View style={[styles.availPill, !item.isAvailable && styles.availPillOff]}>
            <Ionicons
              name={item.isAvailable ? 'checkmark-circle' : 'close-circle'}
              size={12}
              color={item.isAvailable ? '#059669' : '#DC2626'}
            />
            <Text style={[styles.availText, !item.isAvailable && styles.availTextOff]}>
              {item.isAvailable ? t('biz.menu.available') : t('biz.menu.unavailable')}
            </Text>
          </View>
          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.iconBtn} onPress={onEdit}>
              <Ionicons name="create-outline" size={18} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.iconBtn, styles.iconBtnDanger]} onPress={onDelete}>
              <Ionicons name="trash-outline" size={18} color="#DC2626" />
            </TouchableOpacity>
          </View>
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
  heroHint: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 4, fontWeight: '600' },
  heroStats: { flexDirection: 'row', gap: 8, marginTop: 16 },
  heroStat: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14,
    paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  heroStatN: { fontSize: 18, fontWeight: '900', color: Colors.white },
  heroStatL: { fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.8)', marginTop: 2, textTransform: 'uppercase' },
  setupCard: {
    backgroundColor: Colors.white, borderRadius: 22, padding: 22,
    borderWidth: 1, borderColor: '#EEEAF5', alignItems: 'center', ...Shadows.soft,
  },
  setupIcon: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  setupTitle: { fontSize: 17, fontWeight: '900', color: Colors.textDark },
  setupDesc: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  fieldLabel: { alignSelf: 'stretch', fontSize: 12, fontWeight: '700', color: Colors.textMuted, marginTop: 16, marginBottom: 6 },
  input: {
    alignSelf: 'stretch', backgroundColor: '#FAFAFC', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#EEEAF5', fontSize: 15, color: Colors.textDark, marginBottom: 14,
  },
  primaryGrad: { alignSelf: 'stretch', borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  primaryGradText: { color: Colors.white, fontWeight: '900', fontSize: 15 },
  menuTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  menuName: { fontSize: 20, fontWeight: '900', color: Colors.textDark, flex: 1 },
  activePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(16,185,129,0.12)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.activeGreen },
  activeText: { fontSize: 10, fontWeight: '800', color: '#059669' },
  addCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.white, borderRadius: 18, padding: 14, marginBottom: 20,
    borderWidth: 2, borderColor: Colors.primarySoft, borderStyle: 'dashed', ...Shadows.soft,
  },
  addIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  addTitle: { fontSize: 15, fontWeight: '900', color: Colors.textDark },
  addSub: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  section: { marginBottom: 18 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionTitle: { flex: 1, fontSize: 14, fontWeight: '900', color: Colors.textDark },
  sectionCount: {
    fontSize: 11, fontWeight: '800', color: Colors.primary,
    backgroundColor: Colors.primaryTint, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  card: {
    flexDirection: 'row', backgroundColor: Colors.white, borderRadius: 18, marginBottom: 10,
    overflow: 'hidden', borderWidth: 1, borderColor: '#EEEAF5', ...Shadows.soft,
  },
  thumb: { width: 96, minHeight: 96, backgroundColor: Colors.primarySoft },
  thumbPlaceholder: { width: 96, minHeight: 96, alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1, padding: 12, justifyContent: 'space-between' },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  itemName: { flex: 1, fontSize: 15, fontWeight: '800', color: Colors.textDark, lineHeight: 20 },
  price: { fontSize: 14, fontWeight: '900', color: Colors.primary },
  desc: { fontSize: 12, color: Colors.textMuted, marginTop: 6, lineHeight: 17 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  availPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(16,185,129,0.12)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10,
  },
  availPillOff: { backgroundColor: 'rgba(220,38,38,0.08)' },
  availText: { fontSize: 10, fontWeight: '800', color: '#059669' },
  availTextOff: { color: '#DC2626' },
  cardActions: { flexDirection: 'row', gap: 6 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 12, backgroundColor: Colors.primaryTint,
    alignItems: 'center', justifyContent: 'center',
  },
  iconBtnDanger: { backgroundColor: 'rgba(220,38,38,0.08)' },
  emptyItems: { alignItems: 'center', paddingVertical: 28, gap: 8 },
  emptyItemsTitle: { fontSize: 15, fontWeight: '900', color: Colors.textDark },
  emptyItemsDesc: { fontSize: 13, color: Colors.textMuted, textAlign: 'center' },
});
