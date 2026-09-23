/** Legacy export — use `components/b2b/B2bPricingSection` for new UI. */
import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import B2bPricingSection from './b2b/B2bPricingSection';
import type { B2bPackageId } from '../constants/b2bPromotionPackages';
import { useI18n } from '../i18n';

export default function B2bVibemapPromotionCard({
  compact: _compact,
  footer,
}: {
  selectedId?: B2bPackageId | null;
  onSelect?: (id: B2bPackageId) => void;
  compact?: boolean;
  footer?: React.ReactNode;
}) {
  const { t } = useI18n();
  const [selected, setSelected] = useState<B2bPackageId>('featured_venue');
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{t('biz.ads.heroTitle')}</Text>
      <Text style={styles.sub}>{t('biz.ads.heroSub')}</Text>
      <B2bPricingSection selectedId={selected} onSelect={setSelected} />
      {footer}
    </View>
  );
}

export function B2bSubscribeButton() {
  return null;
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  title: { fontSize: 18, fontWeight: '900', color: '#2A1758', textAlign: 'center' },
  sub: { fontSize: 13, color: '#9C8EC0', textAlign: 'center', marginBottom: 8 },
});
