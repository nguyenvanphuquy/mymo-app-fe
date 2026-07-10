import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Gradients, Shadows } from '../constants/colors';
import { useI18n } from '../i18n';
import SparkleField from '../components/SparkleField';
import DateOfBirthPicker from '../components/DateOfBirthPicker';
import MymoLogo from '../components/MymoLogo';
import Toast from 'react-native-toast-message';
import { loginUser, registerUser, saveAuthSession } from '../services/authApi';
import { formatDateOnlyDisplay } from '../utils/dateOnly';

interface AuthScreenProps {
  onContinue: () => void;
}

export default function AuthScreen({ onContinue }: AuthScreenProps) {
  const { t, lang, setLang } = useI18n();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [showPw, setShowPw] = useState(false);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [gender, setGender] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isGenderOpen, setIsGenderOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const genderOptions = [
    { value: 'Male', label: t('auth.genderOptionMale') },
    { value: 'Female', label: t('auth.genderOptionFemale') },
    { value: 'Other', label: t('auth.genderOptionOther') },
  ];

  const dateOfBirthDisplay = dateOfBirth
    ? formatDateOnlyDisplay(dateOfBirth, lang)
    : t('auth.dateOfBirth');

  const handleAuth = async () => {
    if (mode === 'register') {
      if (!username || !displayName || !email || !pw || !confirmPw || !gender || !phone || !dateOfBirth) {
        Toast.show({ type: 'error', text1: lang === 'vi' ? 'Vui lòng điền đầy đủ thông tin' : 'Please fill in all fields' });
        return;
      }
      if (pw !== confirmPw) {
        Toast.show({ type: 'error', text1: lang === 'vi' ? 'Mật khẩu nhập lại không khớp' : 'Passwords do not match' });
        return;
      }
    } else {
      if (!email || !pw) {
        Toast.show({ type: 'error', text1: lang === 'vi' ? 'Vui lòng nhập email và mật khẩu' : 'Please enter email and password' });
        return;
      }
    }

    try {
      setIsSubmitting(true);
      if (mode === 'register') {
        const auth = await registerUser({
          username: username.trim(),
          email: email.trim(),
          password: pw,
          displayName: displayName.trim(),
          gender: gender.trim(),
          phoneNumber: phone.trim(),
          dateOfBirth: dateOfBirth.trim(),
        });
        await saveAuthSession(auth);
        Toast.show({ type: 'success', text1: lang === 'vi' ? 'Đăng ký thành công' : 'Registration successful' });
        onContinue();
        return;
      }

      const auth = await loginUser({ email: email.trim(), password: pw });
      await saveAuthSession(auth);
      Toast.show({ type: 'success', text1: lang === 'vi' ? 'Đăng nhập thành công' : 'Login successful' });
      onContinue();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error';
      Toast.show({ type: 'error', text1: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSocialPress = (provider: 'Google' | 'Apple' | 'Facebook') => {
    Toast.show({
      type: 'info',
      text1: t('auth.socialUnavailable').replace('{provider}', provider),
      text2: t('auth.socialUnavailableDesc'),
    });
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

          {/* Blob decorations */}
          <View style={styles.blob1} />
          <View style={styles.blob2} />

          {/* Top bar */}
          <View style={styles.topBar}>
            <MymoLogo width={135} />
            <TouchableOpacity
              onPress={() => setLang(lang === 'vi' ? 'en' : 'vi')}
              style={styles.langBtn}
            >
              <Ionicons name="globe-outline" size={14} color={Colors.primary} />
              <Text style={styles.langText}>{lang === 'vi' ? 'VI' : 'EN'}</Text>
            </TouchableOpacity>
          </View>

          {/* Hero text */}
          <View style={styles.hero}>
            <Text style={styles.heroTitle}>{t('auth.heroTitle')}</Text>
            <Text style={styles.heroSub}>{t('auth.heroSub')}</Text>
          </View>
        </LinearGradient>

        {/* Form card */}
        <View style={styles.card}>
          {/* Mode tabs */}
          <View style={styles.tabs}>
            {(['login', 'register'] as const).map(m => (
              <TouchableOpacity
                key={m}
                onPress={() => setMode(m)}
                style={[styles.tab, mode === m && styles.tabActive]}
                activeOpacity={0.85}
              >
                {mode === m ? (
                  <LinearGradient colors={Gradients.primary} style={styles.tabGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    <Text style={styles.tabActiveText}>{m === 'login' ? t('auth.login') : t('auth.signup')}</Text>
                  </LinearGradient>
                ) : (
                  <Text style={styles.tabText}>{m === 'login' ? t('auth.login') : t('auth.signup')}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Inputs */}
          <View style={styles.inputs}>
            {mode === 'register' && (
              <>
                <View style={styles.inputRow}>
                  <Ionicons name="at-outline" size={16} color={Colors.primary} />
                  <TextInput
                    value={username}
                    onChangeText={setUsername}
                    placeholder={t('auth.username')}
                    placeholderTextColor={Colors.textMuted}
                    style={styles.input}
                    autoCapitalize="none"
                  />
                </View>
                <View style={styles.inputRow}>
                  <Ionicons name="person-outline" size={16} color={Colors.primary} />
                  <TextInput
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder={t('auth.displayName')}
                    placeholderTextColor={Colors.textMuted}
                    style={styles.input}
                    autoCapitalize="words"
                  />
                </View>
              </>
            )}

            <View style={styles.inputRow}>
              <Ionicons name="mail-outline" size={16} color={Colors.primary} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder={t('auth.email')}
                placeholderTextColor={Colors.textMuted}
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputRow}>
              <View style={styles.pwDot} />
              <TextInput
                value={pw}
                onChangeText={setPw}
                placeholder={t('auth.password')}
                placeholderTextColor={Colors.textMuted}
                secureTextEntry={!showPw}
                style={styles.input}
              />
              <TouchableOpacity onPress={() => setShowPw(v => !v)}>
                <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={16} color={Colors.primary} />
              </TouchableOpacity>
            </View>

            {mode === 'register' && (
              <>
                <View style={styles.inputRow}>
                  <View style={styles.pwDot} />
                  <TextInput
                    value={confirmPw}
                    onChangeText={setConfirmPw}
                    placeholder={t('auth.confirmPassword')}
                    placeholderTextColor={Colors.textMuted}
                    secureTextEntry={!showPw}
                    style={styles.input}
                  />
                </View>
                <View style={styles.genderWrapper}>
                  <TouchableOpacity
                    onPress={() => setIsGenderOpen(v => !v)}
                    style={styles.inputRow}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="male-female-outline" size={16} color={Colors.primary} />
                    <Text style={[styles.input, !gender && styles.placeholderText]}>
                      {gender
                        ? genderOptions.find(option => option.value === gender)?.label
                        : (lang === 'vi' ? 'Giới tính' : 'Gender')}
                    </Text>
                    <Ionicons
                      name={isGenderOpen ? 'chevron-up-outline' : 'chevron-down-outline'}
                      size={16}
                      color={Colors.primary}
                    />
                  </TouchableOpacity>
                  {isGenderOpen && (
                    <View style={styles.genderDropdown}>
                      {genderOptions.map(option => (
                        <TouchableOpacity
                          key={option.value}
                          style={[
                            styles.genderDropdownOption,
                            gender === option.value && styles.genderDropdownOptionActive,
                          ]}
                          activeOpacity={0.8}
                          onPress={() => {
                            setGender(option.value);
                            setIsGenderOpen(false);
                          }}
                        >
                          <Text
                            style={[
                              styles.genderDropdownOptionText,
                              gender === option.value && styles.genderDropdownOptionTextActive,
                            ]}
                          >
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
                <View style={styles.inputRow}>
                  <Ionicons name="call-outline" size={16} color={Colors.primary} />
                  <TextInput
                    value={phone}
                    onChangeText={setPhone}
                    placeholder={t('auth.phoneNumber')}
                    placeholderTextColor={Colors.textMuted}
                    style={styles.input}
                    keyboardType="phone-pad"
                  />
                </View>
                <TouchableOpacity onPress={() => setIsDatePickerOpen(true)} style={styles.inputRow} activeOpacity={0.85}>
                  <Ionicons name="calendar-outline" size={16} color={Colors.primary} />
                  <Text style={[styles.input, !dateOfBirth && styles.placeholderText]}>{dateOfBirthDisplay}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          <DateOfBirthPicker
            visible={isDatePickerOpen}
            value={dateOfBirth}
            onClose={() => setIsDatePickerOpen(false)}
            onConfirm={setDateOfBirth}
          />

          {/* Main CTA */}
          <TouchableOpacity onPress={handleAuth} activeOpacity={0.88} style={styles.cta} disabled={isSubmitting}>
            <LinearGradient colors={Gradients.primary} style={styles.ctaGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              {isSubmitting ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.ctaText}>{mode === 'login' ? t('auth.login') : t('auth.signup')}</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.divLine} />
            <Text style={styles.divText}>{t('auth.continueWith')}</Text>
            <View style={styles.divLine} />
          </View>

          {/* Social — not wired to auth yet; must not bypass login */}
          <View style={styles.social}>
            <SocialBtn
              icon="logo-google"
              label="Google"
              color="#DB4437"
              onPress={() => handleSocialPress('Google')}
            />
            <SocialBtn
              icon="logo-apple"
              label="Apple"
              color="#000"
              onPress={() => handleSocialPress('Apple')}
            />
            <SocialBtn
              icon="logo-facebook"
              label="Facebook"
              color="#1877F2"
              onPress={() => handleSocialPress('Facebook')}
            />
          </View>

          <Text style={styles.terms}>
            {t('auth.terms')}{' '}
            <Text style={styles.termsLink}>{t('auth.termsWord')}</Text>
            {' '}{t('auth.and')}{' '}
            <Text style={styles.termsLink}>{t('auth.privacyWord')}</Text>.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function SocialBtn({
  onPress,
  icon,
  color,
}: {
  onPress: () => void;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  color: string;
}) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.socialBtn, styles.socialBtnLocked]} activeOpacity={0.85}>
      <Ionicons name={icon} size={20} color={color} />
    </TouchableOpacity>
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
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 40,
    minHeight: 360,
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
    marginBottom: 48,
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
  hero: {
    marginTop: 12,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: Colors.textDark,
    lineHeight: 42,
    letterSpacing: -1,
  },
  heroSub: {
    fontSize: 14,
    color: Colors.textMid,
    marginTop: 12,
    lineHeight: 20,
    maxWidth: 280,
    opacity: 0.85,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.97)',
    marginHorizontal: 24,
    marginTop: -24,
    borderRadius: 28,
    padding: 20,
    marginBottom: 24,
    ...Shadows.float,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 20,
    padding: 4,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: Colors.primarySoft,
  },
  tab: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  tabActive: {},
  tabGrad: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabActiveText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.white,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMid,
    textAlign: 'center',
    paddingVertical: 10,
  },
  inputs: {
    gap: 10,
    marginBottom: 14,
  },
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
  genderWrapper: {
    position: 'relative',
    zIndex: 10,
  },
  genderDropdown: {
    marginTop: 6,
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.primarySoft,
    overflow: 'hidden',
    ...Shadows.soft,
  },
  genderDropdownOption: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderColor: '#F1E8FF',
  },
  genderDropdownOptionActive: {
    backgroundColor: 'rgba(124, 91, 255, 0.08)',
  },
  genderDropdownOptionText: {
    fontSize: 13,
    color: Colors.textDark,
  },
  genderDropdownOptionTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  placeholderText: {
    color: Colors.textMuted,
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
    marginBottom: 16,
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
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  divLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.primarySoft,
  },
  divText: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  social: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  socialBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primarySoft,
    ...Shadows.soft,
  },
  socialBtnLocked: {
    opacity: 0.55,
  },
  terms: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
  },
  termsLink: {
    fontWeight: '700',
    color: Colors.textMid,
  },
});