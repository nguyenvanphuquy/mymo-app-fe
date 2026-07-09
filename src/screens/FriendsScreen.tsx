/**
 * FriendsScreen.tsx
 * Messenger-style friends list with search, requests, and chat shortcuts.
 */
import React, { useState, useEffect } from 'react';
import { DeviceEventEmitter } from 'react-native';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, Image, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { useI18n } from '../i18n';
import type { Friend } from '../constants/data';
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
  searchFriends,
  type FriendSummary,
  type PendingFriendRequest,
  type SentFriendRequest,
} from '../services/friendsApi';
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

// ─── Interfaces ──────────────────────────────────────────────────────────────
interface FriendsScreenProps {
  onFriendTap: (f: Friend) => void;
  onOpenChat: (params: OpenChatParams) => void;
  onAdd: () => void;
}

type FriendView = Friend & { avatar: string; lastMsg: string; lastTime: string };

export default function FriendsScreen({ onFriendTap, onOpenChat, onAdd }: FriendsScreenProps) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [friends, setFriends] = useState<FriendSummary[]>([]);
  const [suggestions, setSuggestions] = useState<FriendSummary[]>([]);
  const [friendRequests, setFriendRequests] = useState<PendingFriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<SentFriendRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [blockedOpen, setBlockedOpen] = useState(false);
  const [actionFriend, setActionFriend] = useState<FriendView | null>(null);
  const [searchResults, setSearchResults] = useState<FriendView[] | null>(null);

  const mapFriendSummary = (item: FriendSummary): FriendView => {
    const name = item.displayName || item.username;
    const status = item.mutualFriendsCount && item.mutualFriendsCount > 0 ? 'active' : 'idle';
    const hash = item.userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const x = 20 + (hash % 60);
    const y = 20 + ((hash >> 3) % 60);
    const avatar = item.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop';

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
  const filteredFriends = friendsWithStatus.filter(f =>
    f.name.toLowerCase().includes(query.toLowerCase())
  );
  const displayFriends = searchResults ?? filteredFriends;

  useEffect(() => {
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await searchFriends(query.trim());
        setSearchResults(res.map(mapFriendSummary));
      } catch {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const fetchFriendData = async () => {
    setIsLoading(true);
    try {
      const [friendsRes, suggestionsRes, requestsRes, sentRes] = await Promise.all([
        getFriends(),
        getFriendSuggestions(),
        getFriendRequests(),
        getSentRequests(),
      ]);
      setFriends(friendsRes);
      setSuggestions(suggestionsRes);
      setFriendRequests(requestsRes);
      setSentRequests(sentRes);
    } catch (error) {
      Toast.show({ type: 'error', text1: String(error instanceof Error ? error.message : 'Unable to load friends') });
    } finally {
      setIsLoading(false);
    }
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
          source={{ uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop' }}
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

      {/* ── Search Bar ── */}
      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('friends.search')}
          placeholderTextColor={Colors.textMuted}
          style={styles.searchInput}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Main List ── */}
      <FlatList
        data={displayFriends}
        keyExtractor={f => f.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={() => (
          <View>
            <ConversationsSection onOpenChat={onOpenChat} />
            <FriendRequestsSection
              requests={friendRequests}
              onAccept={handleAcceptRequest}
              onReject={handleRejectRequest}
            />
            <SentRequestsSection
              requests={sentRequests}
              onCancel={handleCancelSent}
            />
            <FriendSuggestionsSection
              suggestions={suggestions}
              onAdd={handleAddSuggestion}
            />
            <FriendMomentsSection friendNames={friendLookup} />
          </View>
        )}
        renderItem={({ item: f }) => (
          <View style={styles.chatItem}>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onOpenChat({ userId: f.id, title: f.name, avatarUrl: f.avatar });
              }}
              onLongPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                showFriendActions(f);
              }}
              style={styles.chatItemMain}
              activeOpacity={0.7}
            >
              <View style={styles.chatAvatarWrap}>
                <Image source={{ uri: f.avatar }} style={styles.chatAvatar} />
                {f.status === 'active' && <View style={styles.chatActiveDot} />}
              </View>

              <View style={styles.chatInfo}>
                <Text style={styles.chatName}>{f.name}</Text>
                <Text style={styles.chatMsg} numberOfLines={1}>
                  {f.lastMsg} · {f.lastTime}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => showFriendActions(f)}
              style={styles.chatMoreBtn}
              activeOpacity={0.7}
              accessibilityLabel={t('friends.manageFriend')}
            >
              <Ionicons name="ellipsis-vertical" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}
      />

      <BlockedUsersSheet
        visible={blockedOpen}
        onClose={() => setBlockedOpen(false)}
        onChanged={fetchFriendData}
      />

      <FriendActionsSheet
        visible={!!actionFriend}
        friendName={actionFriend?.name || ''}
        onClose={() => setActionFriend(null)}
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
    backgroundColor: Colors.white,
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
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0F0F0',
    marginHorizontal: 16,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.textDark,
  },
  listContent: {
    paddingBottom: 120,
  },

  // ── Chat items list ──
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  chatItemMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
  },
  chatMoreBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
    ...Platform.select({
      web: { cursor: 'pointer' as const },
      default: {},
    }),
  },
  chatAvatarWrap: {
    position: 'relative',
  },
  chatAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#EEE',
  },
  chatActiveDot: {
    position: 'absolute',
    bottom: 3,
    right: 3,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: '#10B981',
    borderWidth: 2.5,
    borderColor: Colors.white,
  },
  chatInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  chatName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textDark,
  },
  chatMsg: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 3,
  },
});
