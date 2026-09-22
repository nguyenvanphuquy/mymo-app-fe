import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Image, TextInput, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Colors, Shadows } from '../../constants/colors';
import { useI18n } from '../../i18n';
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
  const [newMenuName, setNewMenuName] = useState('Main Menu');
  const [itemForm, setItemForm] = useState<'list' | 'create' | 'edit'>('list');
  const [editItem, setEditItem] = useState<MenuItemDto | null>(null);

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
      const key = item.categoryName?.trim() || (t('biz.menu.uncategorized') ?? 'Other');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return Array.from(map.entries()).map(([title, items]) => ({ title, items }));
  }, [menu, t]);

  const onCreateMenu = async () => {
    if (!newMenuName.trim()) return;
    try {
      setCreatingMenu(true);
      setMenu(await createPlaceMenu(placeId, { name: newMenuName.trim() }));
      Toast.show({ type: 'success', text1: t('biz.menu.menuCreated') ?? 'Menu created' });
    } catch (e) {
      Toast.show({ type: 'error', text1: e instanceof Error ? e.message : 'Failed' });
    } finally {
      setCreatingMenu(false);
    }
  };

  const confirmDelete = (item: MenuItemDto) => {
    Alert.alert(
      t('biz.menu.deleteTitle') ?? 'Delete item',
      item.name,
      [
        { text: t('common.cancel') ?? 'Cancel', style: 'cancel' },
        {
          text: t('common.delete') ?? 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMenuItem(item.id);
              await load();
            } catch (e) {
              Toast.show({ type: 'error', text1: e instanceof Error ? e.message : 'Delete failed' });
            }
          },
        },
      ],
    );
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
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={Colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('biz.menu.title') ?? 'Menu'}</Text>
        <View style={{ width: 24 }} />
      </View>
      <Text style={styles.subtitle}>{placeName}</Text>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={Colors.primary} />
      ) : !menu ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>{t('biz.menu.noMenu') ?? 'No menu yet'}</Text>
          <TextInput style={styles.input} value={newMenuName} onChangeText={setNewMenuName} placeholder="Main Menu" />
          <TouchableOpacity style={styles.primaryBtn} onPress={onCreateMenu} disabled={creatingMenu}>
            {creatingMenu ? <ActivityIndicator color={Colors.white} /> : (
              <Text style={styles.primaryBtnText}>{t('biz.menu.createMenu') ?? 'Create menu'}</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <Text style={styles.menuName}>{menu.name}</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setItemForm('create')}>
            <Ionicons name="add-circle-outline" size={20} color={Colors.white} />
            <Text style={styles.addBtnText}>{t('biz.menu.addItem') ?? '+ Add menu item'}</Text>
          </TouchableOpacity>
          <ScrollView contentContainerStyle={styles.scroll}>
            {grouped.map(section => (
              <View key={section.title} style={styles.section}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                {section.items.map(item => (
                  <View key={item.id} style={styles.card}>
                    {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.thumb} /> : null}
                    <View style={styles.cardBody}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.price}>{formatVnd(item.price)}</Text>
                      {item.description ? <Text style={styles.desc} numberOfLines={2}>{item.description}</Text> : null}
                      <Text style={[styles.avail, !item.isAvailable && styles.unavail]}>
                        {item.isAvailable ? (t('biz.menu.available') ?? 'Available') : (t('biz.menu.unavailable') ?? 'Unavailable')}
                      </Text>
                      <View style={styles.actions}>
                        <TouchableOpacity onPress={() => { setEditItem(item); setItemForm('edit'); }}>
                          <Text style={styles.edit}>{t('common.edit') ?? 'Edit'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => confirmDelete(item)}>
                          <Text style={styles.del}>{t('common.delete') ?? 'Delete'}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            ))}
            {menu.items.length === 0 ? (
              <Text style={styles.emptyText}>{t('biz.menu.noItems') ?? 'No items yet'}</Text>
            ) : null}
          </ScrollView>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.primaryTint },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 8 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '900', color: Colors.textDark, textAlign: 'center' },
  subtitle: { textAlign: 'center', color: Colors.textMuted, fontSize: 13, marginBottom: 12 },
  menuName: { fontSize: 18, fontWeight: '900', color: Colors.textDark, paddingHorizontal: 20, marginBottom: 8 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 20, backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 12, marginBottom: 12,
  },
  addBtnText: { color: Colors.white, fontWeight: '800' },
  scroll: { paddingHorizontal: 20, paddingBottom: 120 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '900', color: Colors.textDark, marginBottom: 8 },
  card: { flexDirection: 'row', backgroundColor: Colors.white, borderRadius: 14, marginBottom: 10, overflow: 'hidden', ...Shadows.soft },
  thumb: { width: 88, height: '100%', minHeight: 88, backgroundColor: Colors.primarySoft },
  cardBody: { flex: 1, padding: 12 },
  itemName: { fontSize: 16, fontWeight: '800', color: Colors.textDark },
  price: { fontSize: 14, fontWeight: '800', color: Colors.primary, marginTop: 4 },
  desc: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
  avail: { fontSize: 11, fontWeight: '700', color: '#059669', marginTop: 6 },
  unavail: { color: '#DC2626' },
  actions: { flexDirection: 'row', gap: 16, marginTop: 10 },
  edit: { color: Colors.primary, fontWeight: '800', fontSize: 13 },
  del: { color: '#DC2626', fontWeight: '800', fontSize: 13 },
  emptyBox: { padding: 24 },
  emptyText: { textAlign: 'center', color: Colors.textMuted, marginBottom: 16 },
  input: { backgroundColor: Colors.white, borderRadius: 12, padding: 14, marginBottom: 12, ...Shadows.soft },
  primaryBtn: { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  primaryBtnText: { color: Colors.white, fontWeight: '800' },
});
