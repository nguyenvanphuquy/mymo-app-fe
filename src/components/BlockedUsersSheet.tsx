import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet, FlatList,
  ActivityIndicator, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../constants/colors';
import { useAppContentWidth } from '../constants/layout';
import { useI18n } from '../i18n';
import {
  getBlockedFriends,
  unblockFriend,
  type BlockedUser,
} from '../services/friendsApi';
import Toast from 'react-native-toast-message';

interface BlockedUsersSheetProps {
  visible: boolean;
  onClose: () => void;
  onChanged?: () => void;
}

export default function BlockedUsersSheet({ visible, onClose, onChanged }: BlockedUsersSheetProps) {
  const { t } = useI18n();
  const appWidth = useAppContentWidth();
  const [users, setUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBlocked = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getBlockedFriends();
      setUsers(res || []);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) loadBlocked();
  }, [visible, loadBlocked]);

  const handleUnblock = async (user: BlockedUser) => {
    try {
      await unblockFriend(user.userId);
      setUsers(prev => prev.filter(u => u.userId !== user.userId));
      onChanged?.();
      Toast.show({ type: 'success', text1: `${t('friends.unblocked')} ${user.displayName}` });
    } catch (err) {
      Toast.show({ type: 'error', text1: String(err instanceof Error ? err.message : 'Unable to unblock') });
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheetOuter}>
        <View style={[styles.sheet, { width: appWidth }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>{t('friends.blockedUsers')}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginVertical: 24 }} />
          ) : users.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="shield-checkmark-outline" size={28} color={Colors.primary} />
              <Text style={styles.emptyText}>{t('friends.noBlocked')}</Text>
            </View>
          ) : (
            <FlatList
              data={users}
              keyExtractor={item => item.userId}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => (
                <View style={styles.row}>
                  <View style={styles.avatar}>
                    <Ionicons name="person" size={18} color={Colors.primary} />
                  </View>
                  <View style={styles.info}>
                    <Text style={styles.name}>{item.displayName}</Text>
                    <Text style={styles.username}>@{item.username}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleUnblock(item)}
                    style={styles.unblockBtn}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.unblockText}>{t('friends.unblock')}</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheetOuter: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    paddingBottom: 24,
    ...Shadows.float,
    ...Platform.select({
      web: { maxWidth: 500 },
      default: {},
    }),
  },
  handle: {
    width: 48,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.primarySoft,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textDark,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FAFAFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F0EDF8',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryTint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textDark,
  },
  username: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  unblockBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: Colors.primaryTint,
    borderWidth: 1,
    borderColor: Colors.primarySoft,
  },
  unblockText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primary,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '600',
  },
});
