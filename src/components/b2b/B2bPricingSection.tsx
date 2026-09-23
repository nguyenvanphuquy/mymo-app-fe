import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Gradients, Shadows } from '../../constants/colors';
import { useI18n } from '../../i18n';
import {
  B2B_VIBEMAP_PACKAGES,
  type B2bPackageId,
} from '../../constants/b2bPromotionPackages';

function formatPrice(amount: number, lang: string): string {
  return new Intl.NumberFormat(lang === 'vi' ? 'vi-VN' : 'en-US').format(amount);
}

export default function B2bPricingSection({
  selectedId,
  onSelect,
  horizontal,
}: {
  selectedId: B2bPackageId;
  onSelect: (id: B2bPackageId) => void;
  horizontal?: boolean;
}) {
  const { t, lang } = useI18n();
  const suffix = lang === 'vi' ? 'đ' : ' VND';

  return (
    <View style={[styles.wrap, horizontal && styles.wrapHorizontal]}>
      {B2B_VIBEMAP_PACKAGES.map(pkg => {
        const selected = selectedId === pkg.id;
        const unitLabel =
          pkg.billingUnit === 'day' ? t('biz.ads.perDay') : t('biz.ads.perCampaign');
        return (
          <TouchableOpacity
            key={pkg.id}
            activeOpacity={0.92}
            onPress={() => onSelect(pkg.id)}
            style={[
              styles.card,
              horizontal && styles.cardHorizontal,
              selected && styles.cardSelected,
              pkg.popular && styles.cardPopular,
            ]}
          >
            {pkg.popular ? (
              <LinearGradient colors={Gradients.primary} style={styles.popularBadge}>
                <Text style={styles.popularText}>{t('biz.ads.mostPopular')}</Text>
              </LinearGradient>
            ) : null}
            <Text style={[styles.pkgName, styles.pkgNameWithRadio]}>{t(pkg.nameKey)}</Text>
            <View style={styles.priceRow}>
              <Text style={styles.price}>{formatPrice(pkg.priceVnd, lang)}{suffix}</Text>
              <Text style={styles.unit}> / {unitLabel}</Text>
            </View>
            <View style={styles.features}>
              {pkg.featureKeys.map(key => (
                <View key={key} style={styles.featRow}>
                  <Ionicons name="checkmark-circle" size={15} color={Colors.primary} />
                  <Text style={styles.featText}>{t(key)}</Text>
                </View>
              ))}
            </View>
            <View style={[styles.radio, selected && styles.radioOn]}>
              {selected ? <Ionicons name="checkmark" size={14} color={Colors.white} /> : null}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  wrapHorizontal: Platform.OS === 'web' ? { flexDirection: 'row', flexWrap: 'wrap' } as const : {},
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#EEEAF5',
    ...Shadows.soft,
    position: 'relative',
  },
  cardHorizontal: Platform.select({
    web: { flex: 1, minWidth: 240, maxWidth: '100%' as const },
    default: {},
  }),
  cardSelected: { borderColor: Colors.primary, backgroundColor: '#FDFCFF' },
  cardPopular: { paddingTop: 28 },
  popularBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  popularText: { color: Colors.white, fontSize: 10, fontWeight: '900', letterSpacing: 0.3 },
  pkgName: { fontSize: 18, fontWeight: '900', color: Colors.textDark, marginBottom: 8 },
  pkgNameWithRadio: { paddingLeft: 28 },
  priceRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', marginBottom: 14 },
  price: { fontSize: 22, fontWeight: '900', color: Colors.primary },
  unit: { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
  features: { gap: 8 },
  featRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  featText: { flex: 1, fontSize: 13, color: Colors.textMid, lineHeight: 18 },
  radio: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
});
