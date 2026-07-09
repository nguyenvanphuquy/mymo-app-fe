import React, { useRef, useEffect } from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet, Animated,
  Dimensions, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Gradients, Shadows } from '../constants/colors';
import { useI18n } from '../i18n';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface LocationPermSheetProps {
  onAllow: () => void;
  onDeny: () => void;
}

export function LocationPermSheet({ onAllow, onDeny }: LocationPermSheetProps) {
  const { t } = useI18n();
  const slideAnim = useRef(new Animated.Value(300)).current;

  const useNativeDriver = Platform.OS !== 'web';

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver,
      tension: 65,
      friction: 11,
    }).start();
  }, [slideAnim, useNativeDriver]);

  return (
    <Modal transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.handle} />
          <LinearGradient colors={Gradients.primary} style={styles.icon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Ionicons name="location" size={28} color={Colors.white} />
          </LinearGradient>
          <Text style={styles.title}>{t('loc.permTitle')}</Text>
          <Text style={styles.body}>{t('loc.permBody')}</Text>
          <TouchableOpacity onPress={onAllow} activeOpacity={0.85} style={styles.btnAllow}>
            <LinearGradient colors={Gradients.primary} style={styles.btnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Text style={styles.btnAllowText}>{t('loc.allowWhileUsing')}</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity onPress={onDeny} activeOpacity={0.85} style={styles.btnDeny}>
            <Text style={styles.btnDenyText}>{t('common.deny')}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

interface EnableLocationModalProps {
  onAllow: () => void;
  onCancel: () => void;
}

export function EnableLocationModal({ onAllow, onCancel }: EnableLocationModalProps) {
  const { t } = useI18n();
  return (
    <Modal transparent animationType="fade" statusBarTranslucent>
      <View style={styles.modalOverlay}>
        <View style={styles.modal}>
          <LinearGradient colors={Gradients.primary} style={styles.modalIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Ionicons name="location" size={24} color={Colors.white} />
          </LinearGradient>
          <Text style={styles.modalTitle}>{t('loc.postNeedTitle')}</Text>
          <Text style={styles.modalBody}>{t('loc.postNeedBody')}</Text>
          <View style={styles.modalBtns}>
            <TouchableOpacity onPress={onCancel} style={styles.modalBtnCancel}>
              <Text style={styles.modalBtnCancelText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onAllow} activeOpacity={0.85} style={styles.modalBtnAllow}>
              <LinearGradient colors={Gradients.primary} style={styles.modalBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={styles.btnAllowText}>{t('common.enable')}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 36,
    alignItems: 'center',
    ...Shadows.float,
  },
  handle: {
    width: 48,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.primarySoft,
    marginBottom: 20,
  },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    ...Shadows.glow,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textDark,
    textAlign: 'center',
    marginBottom: 8,
  },
  body: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    maxWidth: 300,
  },
  btnAllow: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 10,
    ...Shadows.glow,
  },
  btnGrad: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnAllowText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
  btnDeny: {
    width: '100%',
    paddingVertical: 14,
    backgroundColor: Colors.primaryTint,
    borderRadius: 16,
    alignItems: 'center',
  },
  btnDenyText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modal: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    ...Shadows.float,
  },
  modalIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    ...Shadows.glow,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textDark,
    textAlign: 'center',
    marginBottom: 8,
  },
  modalBody: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  modalBtns: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  modalBtnCancel: {
    flex: 1,
    paddingVertical: 13,
    backgroundColor: Colors.primaryTint,
    borderRadius: 14,
    alignItems: 'center',
  },
  modalBtnCancelText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  modalBtnAllow: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    ...Shadows.glow,
  },
  modalBtnGrad: {
    paddingVertical: 13,
    alignItems: 'center',
  },
});
