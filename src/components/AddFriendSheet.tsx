import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet, Animated,
  ScrollView, TextInput, KeyboardAvoidingView, Platform, DeviceEventEmitter,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Colors, Gradients, Shadows } from '../constants/colors';
import { useI18n } from '../i18n';
import SparkleField from './SparkleField';
import Toast from 'react-native-toast-message';
import { requestFriend } from '../services/friendsApi';
import { getStoredAuthSession } from '../services/authApi';

interface AddFriendSheetProps {
  onClose: () => void;
}

export default function AddFriendSheet({ onClose }: AddFriendSheetProps) {
  const { t } = useI18n();
  const [link, setLink] = React.useState('');
  const [myLink, setMyLink] = useState('mymo.app/u/you.mymo');
  const slideAnim = useRef(new Animated.Value(400)).current;

  const useNativeDriver = Platform.OS !== 'web';

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver,
      tension: 65,
      friction: 11,
    }).start();

    (async () => {
      const session = await getStoredAuthSession();
      if (!session) return;
      const profileId = session.userId || session.username || 'you.mymo';
      setMyLink(`mymo.app/u/${profileId}`);
    })();
  }, [slideAnim, useNativeDriver]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const close = () => {
    Animated.timing(slideAnim, {
      toValue: 400,
      duration: 250,
      useNativeDriver,
    }).start(onClose);
  };

  const submit = async () => {
    const v = link.trim();
    let userId: string | null = null;

    if (!v) {
      Toast.show({ type: 'error', text1: t('addFriend.invalid') });
      return;
    }

    if (v.includes('mymo.app')) {
      userId = v.split('/').pop() || null;
    } else {
      userId = v;
    }

    if (!userId) {
      Toast.show({ type: 'error', text1: t('addFriend.invalid') });
      return;
    }

    if (userId === 'you.mymo') {
      const session = await getStoredAuthSession();
      userId = session?.userId || userId;
    }

    setIsSubmitting(true);
    try {
      await requestFriend(userId);
      DeviceEventEmitter.emit('friend:requested', { userId });
      Toast.show({ type: 'success', text1: t('addFriend.sent'), text2: t('addFriend.sentDesc') });
      setLink('');
      close();
    } catch (error) {
      Toast.show({ type: 'error', text1: String(error instanceof Error ? error.message : 'Unable to send request') });
    } finally {
      setIsSubmitting(false);
    }
  };

  const copy = async () => {
    await Clipboard.setStringAsync(`https://${myLink}`);
    Toast.show({ type: 'success', text1: t('addFriend.copied') });
  };

  return (
    <Modal transparent animationType="fade" statusBarTranslucent onRequestClose={close}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={close} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[
          styles.wrapper,
          Platform.OS === 'web' ? { pointerEvents: 'box-none' as const } : undefined,
        ]}
        pointerEvents={Platform.OS === 'web' ? undefined : 'box-none'}
      >
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <SparkleField count={10} />
          <View style={styles.handle} />
          <TouchableOpacity onPress={close} style={styles.sheetCloseBtn} accessibilityLabel="Close">
            <Ionicons name="close" size={18} color={Colors.textMuted} />
          </TouchableOpacity>

          <LinearGradient colors={Gradients.primary} style={styles.iconWrap} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Ionicons name="person-add" size={28} color={Colors.white} />
          </LinearGradient>

          <Text style={styles.title}>{t('addFriend.title')}</Text>
          <Text style={styles.subtitle}>{t('addFriend.subtitle')}</Text>

          <Text style={styles.label}>{t('addFriend.linkLabel')}</Text>
          <View style={styles.inputRow}>
            <Ionicons name="globe-outline" size={16} color={Colors.primary} style={{ marginRight: 8 }} />
            <TextInput
              value={link}
              onChangeText={setLink}
              placeholder={t('addFriend.linkPlaceholder')}
              placeholderTextColor={Colors.textMuted}
              style={styles.input}
              autoCapitalize="none"
              keyboardType="url"
              returnKeyType="send"
              onSubmitEditing={submit}
            />
            {link.length > 0 && (
              <TouchableOpacity onPress={() => setLink('')}>
                <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity onPress={submit} activeOpacity={0.85} style={styles.sendBtn} disabled={isSubmitting}>
            <LinearGradient colors={Gradients.primary} style={styles.sendGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Text style={styles.sendText}>{isSubmitting ? t('common.sending') : t('addFriend.send')}</Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t('auth.and')}</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.myLinkBox}>
            <Text style={styles.myLinkLabel}>{t('addFriend.myLink')}</Text>
            <View style={styles.myLinkRow}>
              <Text style={styles.myLinkText} numberOfLines={1}>{myLink}</Text>
              <TouchableOpacity onPress={copy} style={styles.copyBtn}>
                <Text style={styles.copyText}>{t('addFriend.copy')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  wrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 40,
    alignItems: 'center',
    overflow: 'hidden',
    ...Shadows.float,
  },
  handle: {
    width: 48,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.primarySoft,
    marginBottom: 20,
  },
  sheetCloseBtn: {
    position: 'absolute',
    right: 18,
    top: 18,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    ...Shadows.glow,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.primary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  label: {
    alignSelf: 'flex-start',
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: Colors.primaryTint,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.primarySoft,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    fontSize: 13,
    color: Colors.textDark,
  },
  sendBtn: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    ...Shadows.glow,
  },
  sendGrad: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  sendText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 16,
    gap: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(78,58,135,0.15)',
  },
  dividerText: {
    fontSize: 11,
    color: 'rgba(78,58,135,0.6)',
    fontWeight: '600',
  },
  myLinkBox: {
    width: '100%',
    backgroundColor: Colors.primaryTint,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.primarySoft,
  },
  myLinkLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  myLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  myLinkText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textDark,
  },
  copyBtn: {
    backgroundColor: Colors.white,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    ...Shadows.soft,
  },
  copyText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
});
