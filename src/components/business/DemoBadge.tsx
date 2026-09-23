import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../i18n';

export default function DemoBadge({ compact }: { compact?: boolean }) {
  const { t } = useI18n();
  return (
    <View style={[styles.pill, compact && styles.pillCompact]}>
      <Ionicons name="flask-outline" size={compact ? 10 : 12} color="#92400E" />
      <Text style={[styles.text, compact && styles.textCompact]}>{t('biz.ads.demoBadge')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  pillCompact: { paddingHorizontal: 6, paddingVertical: 2 },
  text: { fontSize: 10, fontWeight: '800', color: '#92400E' },
  textCompact: { fontSize: 9 },
});
