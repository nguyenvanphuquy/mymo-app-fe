import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../../constants/colors';
import { useI18n } from '../../i18n';

const STEPS = [
  { key: 'biz.ads.funnel.views', icon: 'eye-outline' as const },
  { key: 'biz.ads.funnel.saves', icon: 'bookmark-outline' as const },
  { key: 'biz.ads.funnel.checkins', icon: 'footsteps-outline' as const },
  { key: 'biz.ads.funnel.visits', icon: 'storefront-outline' as const },
];

export default function B2bValueFunnel() {
  const { t } = useI18n();
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{t('biz.ads.funnelTitle')}</Text>
      <Text style={styles.sub}>{t('biz.ads.funnelSub')}</Text>
      <View style={styles.row}>
        {STEPS.map((step, i) => (
          <React.Fragment key={step.key}>
            <View style={styles.step}>
              <View style={styles.iconWrap}>
                <Ionicons name={step.icon} size={20} color={Colors.primary} />
              </View>
              <Text style={styles.stepLabel}>{t(step.key)}</Text>
            </View>
            {i < STEPS.length - 1 ? (
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} style={styles.arrow} />
            ) : null}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#EEEAF5',
    ...Shadows.soft,
  },
  title: { fontSize: 16, fontWeight: '900', color: Colors.textDark },
  sub: { fontSize: 13, color: Colors.textMuted, marginTop: 6, marginBottom: 16, lineHeight: 19 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 },
  step: { alignItems: 'center', flex: 1, minWidth: 64 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  stepLabel: { fontSize: 10, fontWeight: '800', color: Colors.textMid, textAlign: 'center' },
  arrow: { marginTop: -18, opacity: 0.5 },
});
