import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BusinessScreenHeader from '../../components/business/BusinessScreenHeader';
import DemoBadge from '../../components/business/DemoBadge';
import BusinessEmptyState from '../../components/business/BusinessEmptyState';
import { Colors, Shadows } from '../../constants/colors';
import { useI18n } from '../../i18n';
import {
  listBusinessNotifications,
  markAllNotificationsRead,
  type BizNotificationItem,
} from '../../mocks/businessNotificationsDemo';

function iconFor(kind: BizNotificationItem['kind']) {
  if (kind === 'place') return 'location-outline';
  if (kind === 'campaign') return 'megaphone-outline';
  if (kind === 'review') return 'star-outline';
  return 'information-circle-outline';
}

export default function BusinessNotificationsScreen({ onBack }: { onBack: () => void }) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<BizNotificationItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setItems(await listBusinessNotifications());
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const markRead = async () => {
    await markAllNotificationsRead();
    await load();
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <BusinessScreenHeader
        title={t('biz.notif.title')}
        onBack={onBack}
        right={(
          <TouchableOpacity onPress={markRead} hitSlop={8}>
            <Text style={styles.mark}>{t('biz.notif.markRead')}</Text>
          </TouchableOpacity>
        )}
      />
      <View style={styles.demoRow}>
        <DemoBadge />
        <Text style={styles.demoHint}>{t('biz.notif.demoHint')}</Text>
      </View>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {items.length === 0 ? (
          <BusinessEmptyState
            icon="notifications-outline"
            title={t('biz.notif.empty')}
            description={t('biz.notif.emptyDesc')}
          />
        ) : (
          items.map(n => (
            <View key={n.id} style={[styles.card, !n.read && styles.unread]}>
              <View style={styles.icon}>
                <Ionicons name={iconFor(n.kind)} size={20} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{n.title}</Text>
                <Text style={styles.cardBody}>{n.body}</Text>
                <Text style={styles.time}>{new Date(n.createdAt).toLocaleString()}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAFAFC' },
  mark: { fontSize: 11, fontWeight: '800', color: Colors.primary },
  demoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, marginBottom: 4 },
  demoHint: { fontSize: 11, color: Colors.textMuted, flex: 1 },
  card: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EEEAF5',
    ...Shadows.soft,
  },
  unread: { borderColor: Colors.primarySoft, backgroundColor: '#FDFCFF' },
  icon: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.primaryTint,
    alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { fontSize: 14, fontWeight: '800', color: Colors.textDark },
  cardBody: { fontSize: 13, color: Colors.textMid, marginTop: 4, lineHeight: 18 },
  time: { fontSize: 10, color: Colors.textMuted, marginTop: 8 },
});
