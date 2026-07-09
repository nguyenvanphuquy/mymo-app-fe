import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Image,
  Platform, DeviceEventEmitter, Pressable, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import { Colors, Shadows } from '../constants/colors';
import { useI18n } from '../i18n';
import {
  getFriendRequests,
  acceptFriend,
  rejectFriend,
  type PendingFriendRequest,
} from '../services/friendsApi';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  clearAllNotifications,
  deleteNotification,
  type NotificationItem,
} from '../services/notificationsApi';
import { groupNotifications } from '../utils/notificationGrouping';

interface DropdownItem {
  id: string;
  type: NotificationItem['type'];
  who: string;
  textKey: string;
  body?: string;
  time: string;
  avatarUrl?: string | null;
  isRead?: boolean;
  requesterId?: string;
  notificationId?: string;
  groupIds?: string[];
  postId?: string | null;
  conversationId?: string | null;
}

interface NotificationDropdownProps {
  visible: boolean;
  onClose: () => void;
  topOffset?: number;
  onUnreadCountChange?: (count: number) => void;
  onOpenPost?: (postId: string) => void;
  onOpenChat?: (conversationId: string, title: string, avatarUrl?: string | null) => void;
}

const FALLBACK_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&h=120&fit=crop';

function isActivityType(type: DropdownItem['type']): boolean {
  return type === 'like' || type === 'comment';
}

function isFriendRequestNotification(nt: NotificationItem, requesterId: string): boolean {
  if (nt.type !== 'request') return false;
  const rid = nt.referenceId || nt.senderId;
  return rid === requesterId;
}

export default function NotificationDropdown({
  visible,
  onClose,
  topOffset = 64,
  onUnreadCountChange,
  onOpenPost,
  onOpenChat,
}: NotificationDropdownProps) {
  const { t, lang } = useI18n();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [friendRequests, setFriendRequests] = useState<PendingFriendRequest[]>([]);
  const [handledRequesterIds, setHandledRequesterIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const refreshUnread = useCallback(async () => {
    const count = await getUnreadCount().catch(() => 0);
    onUnreadCountChange?.(count);
  }, [onUnreadCountChange]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [notifs, requests] = await Promise.all([
        getNotifications().catch(() => []),
        getFriendRequests().catch(() => []),
      ]);
      setNotifications(notifs);
      setFriendRequests(requests);
      await refreshUnread();
    } finally {
      setLoading(false);
    }
  }, [refreshUnread]);

  useEffect(() => {
    if (!visible) return;
    loadData();
  }, [visible, loadData]);

  useEffect(() => {
    if (!visible) return;
    const sub1 = DeviceEventEmitter.addListener('friend:requested', loadData);
    const sub2 = DeviceEventEmitter.addListener('friend:accepted', loadData);
    const sub3 = DeviceEventEmitter.addListener('post:liked', loadData);
    const sub4 = DeviceEventEmitter.addListener('post:commented', loadData);
    return () => {
      sub1.remove();
      sub2.remove();
      sub3.remove();
      sub4.remove();
    };
  }, [visible, loadData]);

  const requestIds = new Set(friendRequests.map(r => r.userId));

  const items: DropdownItem[] = useMemo(() => {
    return groupNotifications(notifications, lang)
      .filter(nt => {
        if (nt.type === 'request') {
          const requesterId = nt.referenceId || nt.senderId;
          if (!requesterId || handledRequesterIds.has(requesterId)) return false;
          return !requestIds.has(requesterId);
        }
        return true;
      })
      .map(nt => ({
        id: nt.id,
        type: nt.type,
        who: nt.senderName || nt.title || t('friends.someone'),
        textKey: nt.type === 'friend_accepted'
          ? 'notif.text.accepted'
          : nt.type === 'friend_rejected'
          ? 'notif.text.rejected'
          : nt.type === 'request'
          ? 'notif.text.request'
          : nt.type === 'like'
          ? 'notif.text.like'
          : nt.type === 'comment'
          ? 'notif.text.comment'
          : nt.type === 'chat'
          ? 'notif.text.chat'
          : 'notif.text.generic',
        body: nt.body,
        time: nt.createdAt ? new Date(nt.createdAt).toLocaleString() : t('common.now'),
        avatarUrl: nt.avatarUrl,
        isRead: nt.isRead,
        requesterId: nt.referenceId || nt.senderId,
        notificationId: nt.id,
        groupIds: nt.groupIds,
        postId: nt.postId,
        conversationId: nt.conversationId,
      }));
  }, [notifications, lang, handledRequesterIds, requestIds, t]);

  const dismissFriendRequestNotifications = async (requesterId: string) => {
    setHandledRequesterIds(prev => new Set(prev).add(requesterId));
    const matching = notifications.filter(n => isFriendRequestNotification(n, requesterId));
    setNotifications(prev => prev.filter(n => !isFriendRequestNotification(n, requesterId)));
    await Promise.all(matching.map(n => deleteNotification(n.id).catch(() => false)));
    await refreshUnread();
  };

  const handleDelete = async (item: DropdownItem) => {
    if (deletingId) return;
    setDeletingId(item.id);
    try {
      const ids = item.groupIds?.length
        ? item.groupIds
        : [item.notificationId || item.id];
      await Promise.all(ids.map(id => deleteNotification(id).catch(() => false)));
      setNotifications(prev => prev.filter(n => !ids.includes(n.id)));
      await refreshUnread();
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: String(err instanceof Error ? err.message : 'Unable to delete'),
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAll = async () => {
    if (clearing || items.length === 0) return;
    setClearing(true);
    try {
      await clearAllNotifications();
      setNotifications([]);
      setHandledRequesterIds(new Set());
      onUnreadCountChange?.(0);
      Toast.show({ type: 'success', text1: t('notif.allDone') });
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: String(err instanceof Error ? err.message : 'Unable to clear notifications'),
      });
    } finally {
      setClearing(false);
    }
  };

  const markItemRead = async (item: DropdownItem) => {
    if (item.isRead) return;
    const ids = item.groupIds?.length
      ? item.groupIds
      : (item.notificationId ? [item.notificationId] : []);
    if (ids.length === 0) return;
    await Promise.all(ids.map(id => markAsRead(id).catch(() => false)));
    setNotifications(prev =>
      prev.map(n => (ids.includes(n.id) ? { ...n, isRead: true } : n)),
    );
    await refreshUnread();
  };

  const handlePress = async (item: DropdownItem) => {
    await markItemRead(item);

    if (item.type === 'chat' && item.conversationId && onOpenChat) {
      onClose();
      onOpenChat(item.conversationId, item.who, item.avatarUrl);
      return;
    }

    if (isActivityType(item.type) && item.postId && onOpenPost) {
      onClose();
      onOpenPost(item.postId);
    }
  };

  const handleAccept = async (item: DropdownItem) => {
    if (!item.requesterId) return;
    try {
      await acceptFriend(item.requesterId);
      setFriendRequests(prev => prev.filter(r => r.userId !== item.requesterId));
      await dismissFriendRequestNotifications(item.requesterId);
      if (item.notificationId) {
        await deleteNotification(item.notificationId).catch(() => false);
      }
      DeviceEventEmitter.emit('friend:accepted', { userId: item.requesterId });
      DeviceEventEmitter.emit('friends:refetch');
      Toast.show({ type: 'success', text1: `${item.who} ${t('friends.nowFriend')}` });
    } catch (err) {
      Toast.show({ type: 'error', text1: String(err instanceof Error ? err.message : 'Unable to accept') });
    }
  };

  const handleReject = async (item: DropdownItem) => {
    if (!item.requesterId) return;
    try {
      await rejectFriend(item.requesterId);
      setFriendRequests(prev => prev.filter(r => r.userId !== item.requesterId));
      await dismissFriendRequestNotifications(item.requesterId);
      if (item.notificationId) {
        await deleteNotification(item.notificationId).catch(() => false);
      }
      Toast.show({ type: 'info', text1: `${t('friends.dismissed')} ${item.who}` });
    } catch (err) {
      Toast.show({ type: 'error', text1: String(err instanceof Error ? err.message : 'Unable to reject') });
    }
  };

  if (!visible) return null;

  return (
    <>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.panel, { top: topOffset }]}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>{t('notif.title')}</Text>
          {items.length > 0 && (
            <TouchableOpacity
              onPress={handleClearAll}
              disabled={clearing}
              activeOpacity={0.8}
              style={styles.clearAllBtn}
            >
              <Text style={styles.clearAllText}>
                {clearing ? '...' : t('common.clear')}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={Colors.primary} />
          </View>
        ) : items.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="notifications-off-outline" size={22} color={Colors.textMuted} />
            <Text style={styles.emptyText}>{t('notif.allCaughtUp')}</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.list}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {items.map(item => {
              const isTappable = (item.type === 'chat' && !!item.conversationId)
                || (isActivityType(item.type) && !!item.postId);
              const showBody = item.body && (
                item.type === 'like'
                || item.type === 'comment'
                || item.type === 'chat'
                || item.type === 'info'
              );

              return (
                <View key={item.id} style={styles.row}>
                  <TouchableOpacity
                    style={styles.rowMain}
                    activeOpacity={isTappable ? 0.85 : 1}
                    onPress={() => { if (isTappable) handlePress(item); }}
                    disabled={!isTappable}
                  >
                    <Image
                      source={{ uri: item.avatarUrl || FALLBACK_AVATAR }}
                      style={styles.avatar}
                    />
                    <View style={styles.rowCopy}>
                      {showBody ? (
                        <Text style={styles.rowText} numberOfLines={2}>{item.body}</Text>
                      ) : (
                        <Text style={styles.rowText} numberOfLines={2}>
                          <Text style={styles.rowWho}>{item.who}</Text>
                          {' '}
                          <Text style={styles.rowSub}>{t(item.textKey as Parameters<typeof t>[0])}</Text>
                        </Text>
                      )}
                      <Text style={styles.rowTime}>{item.time}</Text>
                      {item.type === 'request' && (
                        <View style={styles.requestActions}>
                          <TouchableOpacity onPress={() => handleAccept(item)} style={styles.acceptBtn}>
                            <Text style={styles.acceptText}>{t('common.accept')}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleReject(item)} style={styles.rejectBtn}>
                            <Text style={styles.rejectText}>{t('common.reject')}</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>

                  <View style={styles.rowTrailing}>
                    {!item.isRead && <View style={styles.unreadDot} />}
                    <TouchableOpacity
                      onPress={() => handleDelete(item)}
                      disabled={deletingId === item.id}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={styles.deleteBtn}
                    >
                      <Ionicons
                        name="close"
                        size={14}
                        color={deletingId === item.id ? Colors.textMuted : '#94A3B8'}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 40,
    backgroundColor: 'transparent',
  },
  panel: {
    position: 'absolute',
    right: 20,
    width: 320,
    maxWidth: '92%',
    maxHeight: 380,
    backgroundColor: Colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EBE8F5',
    zIndex: 50,
    overflow: 'hidden',
    ...Shadows.float,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1EFF8',
  },
  panelTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textDark,
  },
  clearAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: Colors.primaryTint,
  },
  clearAllText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primary,
  },
  loadingWrap: {
    paddingVertical: 28,
    alignItems: 'center',
  },
  emptyWrap: {
    paddingVertical: 28,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  list: {
    maxHeight: 320,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F6F4FB',
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    gap: 10,
    paddingRight: 8,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primarySoft,
  },
  rowCopy: {
    flex: 1,
  },
  rowText: {
    fontSize: 13,
    color: Colors.textDark,
    lineHeight: 18,
  },
  rowWho: {
    fontWeight: '800',
  },
  rowSub: {
    color: Colors.textMid,
    fontWeight: '500',
  },
  rowTime: {
    marginTop: 3,
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  acceptBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  acceptText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: '800',
  },
  rejectBtn: {
    backgroundColor: '#F3F1F8',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  rejectText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  rowTrailing: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
    paddingTop: 2,
    minWidth: 28,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  deleteBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
