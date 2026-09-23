import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Gradients, Shadows } from '../../constants/colors';
import { useI18n } from '../../i18n';
import { setBusinessOnboardingDone } from '../../utils/businessOnboardingStorage';

const STEPS = [
  { icon: 'location' as const, titleKey: 'biz.onboard.s1Title', bodyKey: 'biz.onboard.s1Body' },
  { icon: 'calendar' as const, titleKey: 'biz.onboard.s2Title', bodyKey: 'biz.onboard.s2Body' },
  { icon: 'megaphone' as const, titleKey: 'biz.onboard.s3Title', bodyKey: 'biz.onboard.s3Body' },
];

export default function BusinessOnboardingScreen({ onDone }: { onDone: () => void }) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const s = STEPS[step];

  const finish = async () => {
    await setBusinessOnboardingDone();
    onDone();
  };

  const next = () => {
    if (step >= STEPS.length - 1) void finish();
    else setStep(step + 1);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}>
      <LinearGradient colors={['#FAFAFC', '#F0EAFF']} style={StyleSheet.absoluteFill} />
      <View style={styles.dots}>
        {STEPS.map((_, i) => (
          <View key={i} style={[styles.dot, i === step && styles.dotOn]} />
        ))}
      </View>
      <LinearGradient colors={Gradients.primary} style={styles.iconWrap}>
        <Ionicons name={s.icon} size={40} color={Colors.white} />
      </LinearGradient>
      <Text style={styles.title}>{t(s.titleKey)}</Text>
      <Text style={styles.body}>{t(s.bodyKey)}</Text>
      <TouchableOpacity onPress={next} style={styles.cta} activeOpacity={0.9}>
        <LinearGradient colors={Gradients.primary} style={styles.ctaGrad}>
          <Text style={styles.ctaText}>
            {step < STEPS.length - 1 ? t('biz.onboard.next') : t('biz.onboard.start')}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
      <TouchableOpacity onPress={finish}>
        <Text style={styles.skip}>{t('biz.onboard.skip')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', paddingHorizontal: 28, maxWidth: 500, width, alignSelf: 'center' },
  dots: { flexDirection: 'row', gap: 8, marginBottom: 32 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primarySoft },
  dotOn: { width: 24, backgroundColor: Colors.primary },
  iconWrap: {
    width: 96, height: 96, borderRadius: 28, alignItems: 'center', justifyContent: 'center', ...Shadows.glow,
  },
  title: { fontSize: 24, fontWeight: '900', color: Colors.textDark, textAlign: 'center', marginTop: 28 },
  body: { fontSize: 15, color: Colors.textMuted, textAlign: 'center', marginTop: 12, lineHeight: 22 },
  cta: { marginTop: 'auto' as const, width: '100%', borderRadius: 18, overflow: 'hidden' },
  ctaGrad: { paddingVertical: 16, alignItems: 'center' },
  ctaText: { color: Colors.white, fontWeight: '900', fontSize: 16 },
  skip: { marginTop: 16, color: Colors.textMuted, fontWeight: '700' },
});
