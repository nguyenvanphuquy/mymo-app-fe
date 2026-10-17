import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BusinessScreenHeader from '../../components/business/BusinessScreenHeader';
import BusinessEmptyState from '../../components/business/BusinessEmptyState';
import { Colors, Shadows } from '../../constants/colors';
import { useI18n } from '../../i18n';
import {
  getNotifications,
  markAllRead,
  type NotificationItem,
} from '../../services/notificationsApi';

function iconFor(type: NotificationItem['type']) {
  if (type === 'like' || type === 'comment') return 'star-outline' as const;
  if (type === 'chat') return 'chatbubble-outline' as const;
  if (type === 'request' || type === 'friend_accepted' || type === 'friend_rejected') return 'people-outline' as const;
  return 'information-circle-outline' as const;
}

export default function BusinessNotificationsScreen({ onBack }: { onBack: () => void }) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems(await getNotifications());
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const markRead = async () => {
    await markAllRead();
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
            <View key={n.id} style={[styles.card, !n.isRead && styles.unread]}>
              <View style={styles.icon}>
                <Ionicons name={iconFor(n.type)} size={20} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{n.title || n.senderName || t('biz.notif.title')}</Text>
                <Text style={styles.cardBody}>{n.body || ''}</Text>
                <Text style={styles.time}>{n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFF9FF' },
  mark: { fontSize: 11, fontWeight: '800', color: Colors.primary },
  card: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F2DAF0',
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
