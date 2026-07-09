import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet, Animated,
  Platform, DeviceEventEmitter, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Gradients, Shadows } from '../constants/colors';
import { useAppContentWidth } from '../constants/layout';
import { useI18n } from '../i18n';
import type { Friend } from '../constants/data';
import { removeFriend, blockFriend } from '../services/friendsApi';
import Toast from 'react-native-toast-message';

interface FriendSheetProps {
  friend: Friend;
  onClose: () => void;
  onMessage: (f: Friend) => void;
}

export default function FriendSheet({ friend, onClose, onMessage }: FriendSheetProps) {
  const { t } = useI18n();
  const appWidth = useAppContentWidth();
  const slideAnim = useRef(new Animated.Value(400)).current;
  const [busy, setBusy] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'remove' | 'block' | null>(null);

  const useNativeDriver = Platform.OS !== 'web';

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver,
      tension: 65,
      friction: 11,
    }).start();
  }, [slideAnim, useNativeDriver]);

  const close = () => {
    Animated.timing(slideAnim, {
      toValue: 400,
      duration: 250,
      useNativeDriver,
    }).start(onClose);
  };

  const statusColor = friend.status === 'active'
    ? '#10B981'
    : friend.status === 'moving'
    ? '#FBBF24'
    : Colors.primaryLight;

  const statusBg = friend.status === 'active'
    ? '#D1FAE5'
    : friend.status === 'moving'
    ? '#FEF3C7'
    : Colors.primarySoft;

  const confirmRemove = () => setConfirmAction('remove');

  const confirmBlock = () => setConfirmAction('block');

  const runConfirmedAction = async () => {
    if (!confirmAction) return;
    setBusy(true);
    try {
      if (confirmAction === 'remove') {
        await removeFriend(friend.id);
        Toast.show({ type: 'success', text1: `${t('friends.removed')} ${friend.name}` });
      } else {
        await blockFriend(friend.id);
        Toast.show({ type: 'info', text1: `${t('friends.blocked')} ${friend.name}` });
      }
      DeviceEventEmitter.emit('friends:refetch');
      close();
    } catch (err) {
      Toast.show({ type: 'error', text1: String(err instanceof Error ? err.message : 'Unable to complete action') });
    } finally {
      setBusy(false);
      setConfirmAction(null);
    }
  };

  return (
    <Modal transparent animationType="fade" statusBarTranslucent onRequestClose={close}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={close} />
      <View style={styles.sheetOuter}>
        <Animated.View
          style={[
            styles.sheet,
            { width: appWidth, transform: [{ translateY: slideAnim }] },
          ]}
        >
        <View style={styles.handle} />

        <View style={styles.header}>
          <View style={[styles.avatar, { backgroundColor: friend.color, ...Shadows.glow }]}>
            <Text style={styles.avatarEmoji}>{friend.emoji}</Text>
            {friend.status === 'active' && <View style={styles.dot} />}
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.name}>{friend.name}</Text>
            <View style={styles.placeRow}>
              <Ionicons name="location-outline" size={12} color={Colors.textMuted} />
              <Text style={styles.place}>{friend.place} · {friend.distance}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {t(`friend.status.${friend.status}`)}
            </Text>
          </View>
        </View>

        <View style={styles.stats}>
          <StatBox label={t('friend.battery')} value={`${friend.battery}%`} />
          <StatBox label={t('friend.speed')} value={friend.status === 'moving' ? '12 km/h' : '0'} />
          <StatBox label={t('friend.seen')} value={t('friend.seenVal')} />
        </View>

        {/* Battery bar */}
        <View style={styles.batteryWrap}>
          <View style={styles.batteryTrack}>
            <LinearGradient
              colors={Gradients.primary}
              style={[styles.batteryFill, { width: `${friend.battery}%` }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() => onMessage(friend)}
            style={styles.btnMsg}
            activeOpacity={0.85}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={16} color={Colors.primary} />
            <Text style={styles.btnMsgText}>{t('friend.message')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              Toast.show({ type: 'success', text1: `${t('friend.directionsTo')} ${friend.place}` });
              close();
            }}
            activeOpacity={0.85}
            style={styles.btnDir}
          >
            <LinearGradient colors={Gradients.primary} style={styles.btnDirGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Ionicons name="navigate" size={16} color={Colors.white} />
              <Text style={styles.btnDirText}>{t('friend.direction')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.dangerActions}>
          {confirmAction ? (
            <View style={styles.confirmBanner}>
              <Text style={styles.confirmBannerText}>
                {confirmAction === 'remove'
                  ? `${t('friends.removeConfirm')} ${friend.name}?`
                  : `${t('friends.blockConfirm')} ${friend.name}?`}
              </Text>
              <View style={styles.confirmBannerActions}>
                <TouchableOpacity
                  onPress={() => setConfirmAction(null)}
                  disabled={busy}
                  style={styles.confirmCancelBtn}
                  activeOpacity={0.8}
                >
                  <Text style={styles.confirmCancelText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={runConfirmedAction}
                  disabled={busy}
                  style={styles.confirmOkBtn}
                  activeOpacity={0.8}
                >
                  {busy ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                  ) : (
                    <Text style={styles.confirmOkText}>
                      {confirmAction === 'remove' ? t('friends.removeFriend') : t('friends.blockUser')}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.dangerBtnRow}>
              <TouchableOpacity
                onPress={confirmRemove}
                disabled={busy}
                style={styles.dangerBtn}
                activeOpacity={0.85}
              >
                <Ionicons name="person-remove-outline" size={16} color="#EF4444" />
                <Text style={styles.dangerText}>{t('friends.removeFriend')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmBlock}
                disabled={busy}
                style={styles.dangerBtn}
                activeOpacity={0.85}
              >
                <Ionicons name="ban-outline" size={16} color="#EF4444" />
                <Text style={styles.dangerText}>{t('friends.blockUser')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheetOuter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 40,
    ...Shadows.float,
  },
  handle: {
    width: 48,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.primarySoft,
    alignSelf: 'center',
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.white,
  },
  avatarEmoji: {
    fontSize: 28,
  },
  dot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  headerInfo: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textDark,
  },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  place: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  stats: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.primaryTint,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textDark,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 2,
  },
  batteryWrap: {
    marginBottom: 20,
  },
  batteryTrack: {
    height: 6,
    backgroundColor: Colors.primarySoft,
    borderRadius: 3,
    overflow: 'hidden',
  },
  batteryFill: {
    height: '100%',
    borderRadius: 3,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  btnMsg: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primaryTint,
    borderRadius: 16,
    paddingVertical: 13,
  },
  btnMsgText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  btnDir: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    ...Shadows.glow,
  },
  btnDirGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
  },
  btnDirText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 13,
  },
  dangerActions: {
    marginTop: 14,
  },
  dangerBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dangerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  confirmBanner: {
    width: '100%',
    backgroundColor: '#FFF5F5',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 14,
    gap: 12,
  },
  confirmBannerText: {
    fontSize: 13,
    color: Colors.textDark,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },
  confirmBannerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  confirmCancelBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: Colors.white,
  },
  confirmCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  confirmOkBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    minHeight: 42,
  },
  confirmOkText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.white,
  },
  dangerText: {
    color: '#EF4444',
    fontWeight: '700',
    fontSize: 12,
  },
});
