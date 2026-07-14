import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { Colors, Gradients, Shadows } from '../constants/colors';
import { useI18n } from '../i18n';
import SparkleField from '../components/SparkleField';
import MymoLogo from '../components/MymoLogo';
import { loginAdmin } from '../services/adminApi';

interface AdminLoginScreenProps {
  onSuccess: () => void;
  onBack: () => void;
}

export default function AdminLoginScreen({ onSuccess, onBack }: AdminLoginScreenProps) {
  const { t, lang, setLang } = useI18n();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      Toast.show({ type: 'error', text1: t('admin.fillCredentials') });
      return;
    }
    try {
      setSubmitting(true);
      await loginAdmin(username, password);
      Toast.show({ type: 'success', text1: t('admin.loginSuccess') });
      onSuccess();
    } catch {
      Toast.show({ type: 'error', text1: t('admin.loginFailed') });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.kav}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <LinearGradient
          colors={['#F0EAFF', '#DDD0FF', '#BFA2FF']}
          style={styles.heroGrad}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <SparkleField count={Platform.OS === 'web' ? 6 : 10} />
          <View style={styles.blob1} />
          <View style={styles.blob2} />

          <View style={styles.topBar}>
            <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.85}>
              <Ionicons name="arrow-back" size={18} color={Colors.primary} />
              <Text style={styles.backText}>{t('admin.back')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setLang(lang === 'vi' ? 'en' : 'vi')}
              style={styles.langBtn}
            >
              <Ionicons name="globe-outline" size={14} color={Colors.primary} />
              <Text style={styles.langText}>{lang === 'vi' ? 'VI' : 'EN'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.logoWrap}>
            <MymoLogo width={120} />
          </View>

          <View style={styles.hero}>
            <View style={styles.badge}>
              <Ionicons name="shield-checkmark" size={14} color={Colors.primary} />
              <Text style={styles.badgeText}>{t('admin.badge')}</Text>
            </View>
            <Text style={styles.heroTitle}>{t('admin.loginTitle')}</Text>
            <Text style={styles.heroSub}>{t('admin.loginSub')}</Text>
          </View>
        </LinearGradient>

        <View style={styles.card}>
          <View style={styles.inputs}>
            <View style={styles.inputRow}>
              <Ionicons name="person-outline" size={16} color={Colors.primary} />
              <TextInput
                value={username}
                onChangeText={setUsername}
                placeholder={t('admin.username')}
                placeholderTextColor={Colors.textMuted}
                style={styles.input}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputRow}>
              <View style={styles.pwDot} />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder={t('admin.password')}
                placeholderTextColor={Colors.textMuted}
                secureTextEntry={!showPw}
                style={styles.input}
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity onPress={() => setShowPw(v => !v)}>
                <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={16} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleLogin}
            activeOpacity={0.88}
            style={styles.cta}
            disabled={submitting}
          >
            <LinearGradient
              colors={Gradients.primary}
              style={styles.ctaGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {submitting ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.ctaText}>{t('admin.loginCta')}</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.hintBox}>
            <Ionicons name="information-circle-outline" size={16} color={Colors.primary} />
            <Text style={styles.hintText}>{t('admin.loginHint')}</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  kav: {
    flex: 1,
    backgroundColor: Colors.primaryTint,
    ...Platform.select({
      web: {
        maxWidth: 500,
        width: '100%',
        marginHorizontal: 'auto',
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: '#EBE8F5',
        boxShadow: '0 8px 30px rgba(124, 91, 255, 0.06)',
      },
      default: {},
    }),
  },
  scroll: { flexGrow: 1 },
  heroGrad: {
    paddingTop: 56,
    paddingHorizontal: 24,
    paddingBottom: 36,
    minHeight: 300,
    overflow: 'hidden',
  },
  blob1: {
    position: 'absolute',
    top: -60,
    left: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  blob2: {
    position: 'absolute',
    top: 100,
    right: -50,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(156,124,255,0.3)',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    ...Shadows.soft,
  },
  backText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textDark,
  },
  langBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    ...Shadows.soft,
  },
  langText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textDark,
  },
  logoWrap: { marginBottom: 20 },
  hero: { marginTop: 4 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.75)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    marginBottom: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.3,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: Colors.textDark,
    lineHeight: 38,
    letterSpacing: -0.8,
  },
  heroSub: {
    fontSize: 14,
    color: Colors.textMid,
    marginTop: 10,
    lineHeight: 20,
    maxWidth: 300,
    opacity: 0.85,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.97)',
    marginHorizontal: 24,
    marginTop: -20,
    borderRadius: 28,
    padding: 20,
    marginBottom: 24,
    ...Shadows.float,
  },
  inputs: { gap: 10, marginBottom: 14 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.primarySoft,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: Colors.textDark,
  },
  pwDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  cta: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 14,
    ...Shadows.glow,
  },
  ctaGrad: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaText: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: 15,
  },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: Colors.primaryTint,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.primarySoft,
  },
  hintText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textMid,
    lineHeight: 17,
  },
});
