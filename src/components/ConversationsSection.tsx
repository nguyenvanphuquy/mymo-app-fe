import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Image, ScrollView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DeviceEventEmitter } from 'react-native';
import { Colors } from '../constants/colors';
import { useI18n } from '../i18n';
import { getConversations, type ConversationSummary } from '../services/chatApi';

export interface OpenChatParams {
  conversationId?: string;
  userId?: string;
  title: string;
  avatarUrl?: string | null;
}

interface ConversationsSectionProps {
  onOpenChat: (params: OpenChatParams) => void;
}

const FALLBACK_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&h=120&fit=crop';

function formatTime(iso?: string | null, nowLabel = 'now'): string {
  if (!iso) return '';
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 60_000) return nowLabel;
  if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)}m`;
  if (diffMs < 86_400_000) return `${Math.floor(diffMs / 3_600_000)}h`;
  return date.toLocaleDateString();
}

export default function ConversationsSection({ onOpenChat }: ConversationsSectionProps) {
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

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="small" color={Colors.primary} />
      </View>
    );
  }

  if (conversations.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{t('chat.recent')}</Text>
        <Ionicons name="chatbubbles-outline" size={16} color={Colors.primary} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {conversations.map(conv => (
          <TouchableOpacity
            key={conv.conversationId}
            style={styles.chip}
            activeOpacity={0.8}
            onPress={() => onOpenChat({
              conversationId: conv.conversationId,
              title: conv.conversationName,
              avatarUrl: conv.conversationAvatar,
            })}
          >
            <View style={styles.avatarWrap}>
              <Image
                source={{ uri: conv.conversationAvatar || FALLBACK_AVATAR }}
                style={styles.avatar}
              />
              {conv.unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.name} numberOfLines={1}>{conv.conversationName}</Text>
            {conv.lastMessage ? (
              <Text style={styles.preview} numberOfLines={1}>{conv.lastMessage}</Text>
            ) : null}
            {conv.lastMessageTime ? (
              <Text style={styles.time}>{formatTime(conv.lastMessageTime, t('common.now'))}</Text>
            ) : null}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EEF8',
    marginBottom: 8,
  },
  loadingWrap: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textDark,
  },
  scrollContent: {
    paddingHorizontal: 12,
    gap: 10,
  },
  chip: {
    width: 88,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: 6,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: Colors.white,
    backgroundColor: Colors.primaryTint,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  badgeText: {
    color: Colors.white,
    fontSize: 9,
    fontWeight: '800',
  },
  name: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textDark,
    textAlign: 'center',
  },
  preview: {
    fontSize: 9,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },
  time: {
    fontSize: 8,
    color: Colors.textMuted,
    marginTop: 1,
  },
});
