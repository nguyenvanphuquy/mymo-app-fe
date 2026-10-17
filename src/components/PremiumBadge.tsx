import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';
import { useI18n } from '../i18n';

export default function PremiumBadge({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  return (
    <View style={styles.badge}>
      <Text style={styles.gem}>💎</Text>
      {compact ? null : <Text style={styles.label}>{t('style.badge')}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F8E9FF',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  gem: {
    fontSize: 11,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primary,
  },
});
