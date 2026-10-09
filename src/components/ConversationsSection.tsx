import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator,
} from 'react-native';
import { DeviceEventEmitter } from 'react-native';
import { Colors } from '../constants/colors';
import { useI18n } from '../i18n';
import { getConversations, type ConversationSummary } from '../services/chatApi';
import { avatarUri } from '../constants/defaultAvatar';
import { openUserProfile } from '../utils/openUserProfile';

export interface OpenChatParams {
  conversationId?: string;
  userId?: string;
  title: string;
  avatarUrl?: string | null;
}

interface ConversationsSectionProps {
  query: string;
  onlineUserIds: ReadonlySet<string>;
  onOpenChat: (params: OpenChatParams) => void;
  onManage?: (conversation: ConversationSummary) => void;
}

function formatTime(iso?: string | null, nowLabel = 'now'): string {
  if (!iso) return '';
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  if (Number.isNaN(diffMs)) return '';
  if (diffMs < 60_000) return nowLabel;
  if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)}m`;
  if (diffMs < 86_400_000) return `${Math.floor(diffMs / 3_600_000)}h`;
  return date.toLocaleDateString();
}

export default function ConversationsSection({
  query,
  onlineUserIds,
  onOpenChat,
  onManage,
}: ConversationsSectionProps) {
  const { t } = useI18n();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const items = await getConversations();
      setConversations(items);
    } catch {
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const sub = DeviceEventEmitter.addListener('chat:refresh', load);
    return () => sub.remove();
  }, [load]);

  const needle = query.trim().toLowerCase();
  const visible = needle
    ? conversations.filter(conv =>
      conv.conversationName.toLowerCase().includes(needle)
      || (conv.lastMessage || '').toLowerCase().includes(needle))
    : conversations;

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="small" color={Colors.primary} />
      </View>
    );
  }

  if (visible.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>{needle ? t('friends.noChatMatch') : t('friends.noChats')}</Text>
        {needle ? null : <Text style={styles.emptyDesc}>{t('friends.noChatsDesc')}</Text>}
      </View>
    );
  }

  return (
    <View>
      {visible.map(conv => {
        const online = !!conv.otherUserId && onlineUserIds.has(conv.otherUserId);
        return (
          <View key={conv.conversationId} style={styles.row}>
            <TouchableOpacity
              style={styles.avatarWrap}
              activeOpacity={0.8}
              onPress={() => openUserProfile({
                userId: conv.otherUserId,
                displayName: conv.conversationName,
                avatarUrl: conv.conversationAvatar,
              })}
            >
              <Image source={{ uri: avatarUri(conv.conversationAvatar) }} style={styles.avatar} />
              <View style={[styles.dot, online ? styles.dotOn : styles.dotOff]} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.main}
              activeOpacity={0.75}
              onPress={() => onOpenChat({
                conversationId: conv.conversationId,
                userId: conv.otherUserId || undefined,
                title: conv.conversationName,
                avatarUrl: conv.conversationAvatar,
              })}
              onLongPress={() => onManage?.(conv)}
            >
              <View style={styles.topLine}>
                <Text style={styles.name} numberOfLines={1}>{conv.conversationName}</Text>
                {conv.lastMessageTime ? (
                  <Text style={styles.time}>{formatTime(conv.lastMessageTime, t('common.now'))}</Text>
                ) : null}
              </View>
              <View style={styles.bottomLine}>
                <Text style={[styles.preview, conv.unreadCount > 0 && styles.previewUnread]} numberOfLines={1}>
                  {conv.lastMessage || t('chat.empty')}
                </Text>
                {conv.unreadCount > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{conv.unreadCount > 9 ? '9+' : conv.unreadCount}</Text>
                  </View>
                ) : (
                  <Text style={styles.status}>{online ? t('chat.online') : t('friends.offline')}</Text>
                )}
              </View>
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  loadingWrap: {
    paddingVertical: 28,
    alignItems: 'center',
  },
  empty: {
    paddingHorizontal: 28,
    paddingVertical: 36,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textDark,
    textAlign: 'center',
  },
  emptyDesc: {
    marginTop: 6,
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: Colors.primaryTint,
  },
  dot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.5,
    borderColor: Colors.white,
  },
  dotOn: {
    backgroundColor: Colors.activeGreen,
  },
  dotOff: {
    backgroundColor: '#C9C1DC',
  },
  main: {
    flex: 1,
    minWidth: 0,
  },
  topLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textDark,
  },
  time: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  bottomLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 3,
  },
  preview: {
    flex: 1,
    fontSize: 13,
    color: Colors.textMuted,
  },
  previewUnread: {
    color: Colors.textDark,
    fontWeight: '700',
  },
  status: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '800',
  },
});
