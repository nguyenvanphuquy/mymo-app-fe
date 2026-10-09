/**
 * FriendsScreen.tsx
 * Messenger-style friends list with search, requests, and chat shortcuts.
 */
import React, { useState, useEffect } from 'react';
import { DeviceEventEmitter } from 'react-native';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Image, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { useI18n } from '../i18n';
import type { Friend } from '../constants/data';
import { avatarUri } from '../constants/defaultAvatar';
import {
  getFriends,
  getFriendSuggestions,
  getFriendRequests,
  getSentRequests,
  requestFriend,
  acceptFriend,
  rejectFriend,
  cancelFriendRequest,
  removeFriend,
  blockFriend,
  getOnlineFriends,
  type FriendSummary,
  type PendingFriendRequest,
  type SentFriendRequest,
} from '../services/friendsApi';
import { getUserProfile } from '../services/userApi';
import FriendMomentsSection from '../components/FriendMomentsSection';
import FriendRequestsSection from '../components/FriendRequestsSection';
import SentRequestsSection from '../components/SentRequestsSection';
import FriendSuggestionsSection from '../components/FriendSuggestionsSection';
import BlockedUsersSheet from '../components/BlockedUsersSheet';
import FriendActionsSheet from '../components/FriendActionsSheet';
import ConversationsSection, { type OpenChatParams } from '../components/ConversationsSection';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { FriendProfileParams } from '../screens/FriendProfileScreen';

// ─── Interfaces ──────────────────────────────────────────────────────────────
interface FriendsScreenProps {
  onFriendTap: (f: Friend) => void;
  onOpenChat: (params: OpenChatParams) => void;
  onViewProfile: (params: FriendProfileParams) => void;
  onAdd: () => void;
}

type FriendView = Friend & { avatar: string; lastMsg: string; lastTime: string };
type FriendsTab = 'chats' | 'people';

export default function FriendsScreen({ onFriendTap, onOpenChat, onViewProfile, onAdd }: FriendsScreenProps) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<FriendsTab>('chats');
  const [query, setQuery] = useState('');
  const [friends, setFriends] = useState<FriendSummary[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [suggestions, setSuggestions] = useState<FriendSummary[]>([]);
  const [friendRequests, setFriendRequests] = useState<PendingFriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<SentFriendRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [blockedOpen, setBlockedOpen] = useState(false);
  const [actionFriend, setActionFriend] = useState<FriendView | null>(null);
  const [currentUser, setCurrentUser] = useState<{
    userId: string;
    name: string;
    avatar?: string | null;
  } | null>(null);

  const mapFriendSummary = (item: FriendSummary): FriendView => {
    const name = item.displayName || item.username;
    const status = item.mutualFriendsCount && item.mutualFriendsCount > 0 ? 'active' : 'idle';
    const hash = item.userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const x = 20 + (hash % 60);
    const y = 20 + ((hash >> 3) % 60);
    const avatar = avatarUri(item.avatarUrl);

    return {
      id: item.userId,
      name,
      emoji: '👋',
      color: '#7CC4FF',
      place: item.mutualFriendsCount ? `${item.mutualFriendsCount} mutual` : 'Friend',
      distance: item.requestedAt ? 'Requested' : 'Online',
      status: status as 'active' | 'idle' | 'moving',
      battery: 100,
      x,
      y,
      avatar,
      lastMsg: item.requestedAt ? 'Request pending' : 'Say hello',
      lastTime: item.requestedAt ? new Date(item.requestedAt).toLocaleDateString() : 'Now',
    };
  };

  const friendsWithStatus = friends.map(mapFriendSummary);
  const friendLookup = React.useMemo(() => {
    const map: Record<string, { name: string; avatar?: string | null }> = {};
    friendsWithStatus.forEach(f => {
      map[f.id] = { name: f.name, avatar: f.avatar };
    });
    return map;
  }, [friendsWithStatus]);

  const fetchFriendData = async () => {
    setIsLoading(true);
    const load = async <T,>(work: Promise<T>, fallback: T): Promise<T> => {
      try {
        return await work;
      } catch {
        return fallback;
      }
    };
    const [friendsRes, suggestionsRes, requestsRes, sentRes, profileRes, onlineRes] = await Promise.all([
      load(getFriends(), [] as FriendSummary[]),
      load(getFriendSuggestions(), [] as FriendSummary[]),
      load(getFriendRequests(), [] as PendingFriendRequest[]),
      load(getSentRequests(), [] as SentFriendRequest[]),
      load(getUserProfile(), null),
      load(getOnlineFriends(), [] as FriendSummary[]),
    ]);
    setFriends(friendsRes);
    const online = new Set<string>();
    friendsRes.forEach(friend => {
      if (friend.isOnline) online.add(friend.userId);
    });
    onlineRes.forEach(friend => online.add(friend.userId));
    setOnlineUserIds(online);
    setSuggestions(suggestionsRes);
    setFriendRequests(requestsRes);
    setSentRequests(sentRes);
    if (profileRes?.id) {
      setCurrentUser({
        userId: profileRes.id,
        name: profileRes.displayName || profileRes.username,
        avatar: profileRes.avatarUrl,
      });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchFriendData();
    const sub = DeviceEventEmitter.addListener('friend:accepted', () => {
      fetchFriendData();
    });
    const sub2 = DeviceEventEmitter.addListener('friends:refetch', () => {
      fetchFriendData();
    });
    const sub3 = DeviceEventEmitter.addListener('friend:requested', () => {
      fetchFriendData();
    });
    return () => {
      sub.remove();
      sub2.remove();
      sub3.remove();
    };
  }, []);

  const handleAcceptRequest = async (request: PendingFriendRequest) => {
    try {
      await acceptFriend(request.userId);
      setFriendRequests(prev => prev.filter(r => r.userId !== request.userId));
      DeviceEventEmitter.emit('friend:accepted', { userId: request.userId });
      DeviceEventEmitter.emit('friends:refetch');
      await fetchFriendData();
      Toast.show({ type: 'success', text1: `${request.displayName} ${t('friends.nowFriend')}` });
    } catch (error) {
      Toast.show({ type: 'error', text1: String(error instanceof Error ? error.message : 'Unable to accept') });
    }
  };

  const handleRejectRequest = async (request: PendingFriendRequest) => {
    try {
      await rejectFriend(request.userId);
      setFriendRequests(prev => prev.filter(r => r.userId !== request.userId));
      Toast.show({ type: 'info', text1: `${t('friends.dismissed')} ${request.displayName}` });
    } catch (error) {
      Toast.show({ type: 'error', text1: String(error instanceof Error ? error.message : 'Unable to reject') });
    }
  };

  const handleCancelSent = async (request: SentFriendRequest) => {
    try {
      await cancelFriendRequest(request.userId);
      setSentRequests(prev => prev.filter(r => r.userId !== request.userId));
      Toast.show({ type: 'info', text1: `${t('friends.cancelRequest')} ${request.displayName}` });
    } catch (error) {
      Toast.show({ type: 'error', text1: String(error instanceof Error ? error.message : 'Unable to cancel') });
    }
  };

  const handleAddSuggestion = async (user: FriendSummary) => {
    try {
      await requestFriend(user.userId);
      setSuggestions(prev => prev.filter(s => s.userId !== user.userId));
      DeviceEventEmitter.emit('friend:requested', { userId: user.userId });
      await fetchFriendData();
      Toast.show({ type: 'success', text1: `${t('addFriend.sent')} ${user.displayName}` });
    } catch (error) {
      Toast.show({ type: 'error', text1: String(error instanceof Error ? error.message : 'Unable to send request') });
    }
  };

  const showFriendActions = (friend: FriendView) => {
    setActionFriend(friend);
  };

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: Math.max(12, insets.top) }]}>
        {/* User avatar on the left */}
        <Image
          source={{ uri: avatarUri(currentUser?.avatar) }}
          style={styles.headerAvatar}
        />
        <Text style={styles.headerTitle}>{t('friends.title')}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => setBlockedOpen(true)} style={styles.headerBtn} activeOpacity={0.8}>
            <Ionicons name="ban-outline" size={20} color={Colors.textDark} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onAdd} style={styles.headerBtn} activeOpacity={0.8}>
            <Ionicons name="person-add-outline" size={20} color={Colors.textDark} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabs}>
        {(['chats', 'people'] as FriendsTab[]).map(id => {
          const active = tab === id;
          const label = id === 'chats' ? t('friends.tabChats') : t('friends.tabPeople');
          return (
            <TouchableOpacity
              key={id}
              onPress={() => setTab(id)}
              style={[styles.tab, active && styles.tabActive]}
              activeOpacity={0.85}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {tab === 'chats' ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent} keyboardShouldPersistTaps="handled">
          <View style={styles.searchRow}>
            <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('friends.chatSearch')}
              placeholderTextColor={Colors.textMuted}
              style={styles.searchInput}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
          <ConversationsSection
            query={query}
            onlineUserIds={onlineUserIds}
            onOpenChat={onOpenChat}
            onManage={conversation => {
              if (!conversation.otherUserId) return;
              const known = friendsWithStatus.find(friend => friend.id === conversation.otherUserId);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              showFriendActions(known || {
                id: conversation.otherUserId,
                name: conversation.conversationName,
                emoji: '👋',
                color: '#7CC4FF',
                place: 'Friend',
                distance: 'Online',
                status: onlineUserIds.has(conversation.otherUserId) ? 'active' : 'idle',
                battery: 100,
                x: 0,
                y: 0,
                avatar: avatarUri(conversation.conversationAvatar),
                lastMsg: conversation.lastMessage || '',
                lastTime: '',
              });
            }}
          />
        </ScrollView>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
          <FriendMomentsSection
            friendNames={friendLookup}
            currentUser={currentUser}
            emptyLabel={t('friends.noMoments')}
          />
          <FriendRequestsSection
            requests={friendRequests}
            onAccept={handleAcceptRequest}
            onReject={handleRejectRequest}
            emptyLabel={t('friends.noRequests')}
          />
          <SentRequestsSection
            requests={sentRequests}
            onCancel={handleCancelSent}
          />
          <FriendSuggestionsSection
            suggestions={suggestions}
            onAdd={handleAddSuggestion}
            emptyLabel={t('friends.noSuggestions')}
          />
        </ScrollView>
      )}

      <BlockedUsersSheet
        visible={blockedOpen}
        onClose={() => setBlockedOpen(false)}
        onChanged={fetchFriendData}
      />

      <FriendActionsSheet
        visible={!!actionFriend}
        friendName={actionFriend?.name || ''}
        onClose={() => setActionFriend(null)}
        onViewProfile={() => {
          if (!actionFriend) return;
          onViewProfile({
            userId: actionFriend.id,
            displayName: actionFriend.name,
            avatarUrl: actionFriend.avatar,
          });
          setActionFriend(null);
        }}
        onRemove={async () => {
          if (!actionFriend) return;
          await removeFriend(actionFriend.id);
          DeviceEventEmitter.emit('friends:refetch');
          await fetchFriendData();
          Toast.show({ type: 'success', text1: `${t('friends.removed')} ${actionFriend.name}` });
        }}
        onBlock={async () => {
          if (!actionFriend) return;
          await blockFriend(actionFriend.id);
          DeviceEventEmitter.emit('friends:refetch');
          await fetchFriendData();
          Toast.show({ type: 'info', text1: `${t('friends.blocked')} ${actionFriend.name}` });
        }}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    ...Platform.select({
      web: {
        maxWidth: 500,
        width: '100%',
        marginHorizontal: 'auto',
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: '#F2F2F2',
      },
      default: {},
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EEE',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textDark,
    flex: 1,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: Colors.primarySoft,
    borderRadius: 16,
    padding: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 12,
  },
  tabActive: {
    backgroundColor: Colors.white,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textMid,
  },
  tabTextActive: {
    color: Colors.primaryDark,
    fontWeight: '800',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.textDark,
  },
  listContent: {
    paddingBottom: 120,
  },
});
