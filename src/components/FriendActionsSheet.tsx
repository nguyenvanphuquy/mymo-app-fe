import React, { useState } from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet,
  ActivityIndicator, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../constants/colors';
import { useAppContentWidth } from '../constants/layout';
import { useI18n } from '../i18n';

type ConfirmAction = 'remove' | 'block' | null;

interface FriendActionsSheetProps {
  visible: boolean;
  friendName: string;
  onClose: () => void;
  onViewProfile: () => void;
  onRemove: () => Promise<void>;
  onBlock: () => Promise<void>;
}

export default function FriendActionsSheet({
  visible,
  friendName,
  onClose,
  onViewProfile,
  onRemove,
  onBlock,
}: FriendActionsSheetProps) {
  const { t } = useI18n();
  const appWidth = useAppContentWidth();
  const [confirm, setConfirm] = useState<ConfirmAction>(null);
  const [busy, setBusy] = useState(false);

  const handleClose = () => {
    if (busy) return;
    setConfirm(null);
    onClose();
  };

  const runAction = async (action: 'remove' | 'block') => {
    setBusy(true);
    try {
      if (action === 'remove') await onRemove();
      else await onBlock();
      setConfirm(null);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const confirmTitle = confirm === 'remove'
    ? t('friends.removeFriend')
    : t('friends.blockUser');

  const confirmMessage = confirm === 'remove'
    ? `${t('friends.removeConfirm')} ${friendName}?`
    : `${t('friends.blockConfirm')} ${friendName}?`;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />
      <View style={styles.sheetOuter}>
        <View style={[styles.sheet, { width: appWidth }]}>
          <View style={styles.handle} />

          {confirm ? (
            <View style={styles.confirmWrap}>
              <Text style={styles.confirmTitle}>{confirmTitle}</Text>
              <Text style={styles.confirmMsg}>{confirmMessage}</Text>
              <View style={styles.confirmActions}>
                <TouchableOpacity
                  onPress={() => setConfirm(null)}
                  disabled={busy}
                  style={styles.cancelBtn}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => runAction(confirm)}
                  disabled={busy}
                  style={styles.destructiveBtn}
                  activeOpacity={0.8}
                >
                  {busy ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                  ) : (
                    <Text style={styles.destructiveText}>{confirmTitle}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <Text style={styles.title}>{friendName}</Text>
              <Text style={styles.subtitle}>{t('friends.manageFriend')}</Text>

              <TouchableOpacity
                onPress={onViewProfile}
                style={styles.actionRowPrimary}
                activeOpacity={0.8}
              >
                <Ionicons name="person-outline" size={20} color={Colors.primary} />
                <Text style={styles.actionPrimary}>{t('friends.viewProfile')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setConfirm('remove')}
                style={styles.actionRow}
                activeOpacity={0.8}
              >
                <Ionicons name="person-remove-outline" size={20} color="#EF4444" />
                <Text style={styles.actionDanger}>{t('friends.removeFriend')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setConfirm('block')}
                style={styles.actionRow}
                activeOpacity={0.8}
              >
                <Ionicons name="ban-outline" size={20} color="#EF4444" />
                <Text style={styles.actionDanger}>{t('friends.blockUser')}</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleClose} style={styles.cancelRow} activeOpacity={0.8}>
                <Text style={styles.cancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
            </>
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
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'web' ? 24 : 36,
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
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textDark,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 8,
  },
  actionRowPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: Colors.primaryTint,
    borderWidth: 1,
    borderColor: '#E8E0FF',
    marginBottom: 8,
  },
  actionPrimary: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
  },
  actionDanger: {
    fontSize: 15,
    fontWeight: '700',
    color: '#EF4444',
  },
  cancelRow: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 4,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  confirmWrap: {
    paddingBottom: 8,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textDark,
    textAlign: 'center',
  },
  confirmMsg: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
    lineHeight: 20,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: Colors.primaryTint,
  },
  destructiveBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#EF4444',
    minHeight: 46,
  },
  destructiveText: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.white,
  },
});
