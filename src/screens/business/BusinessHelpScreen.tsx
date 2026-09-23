import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BusinessScreenHeader from '../../components/business/BusinessScreenHeader';
import { Colors, Shadows } from '../../constants/colors';
import { useI18n } from '../../i18n';

const FAQ_KEYS = ['biz.help.faq1', 'biz.help.faq2', 'biz.help.faq3', 'biz.help.faq4'] as const;

export default function BusinessHelpScreen({ onBack }: { onBack: () => void }) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <BusinessScreenHeader title={t('biz.help.title')} onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
        <View style={styles.contact}>
          <Ionicons name="mail-outline" size={22} color={Colors.primary} />
          <View>
            <Text style={styles.contactTitle}>{t('biz.help.contact')}</Text>
            <Text style={styles.contactVal}>partner@mymo.app</Text>
          </View>
        </View>
        <Text style={styles.section}>{t('biz.help.faqTitle')}</Text>
        {FAQ_KEYS.map(key => (
          <View key={key} style={styles.faq}>
            <Text style={styles.faqText}>{t(key)}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAFAFC' },
  contact: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EEEAF5',
    marginBottom: 20,
    ...Shadows.soft,
  },
  contactTitle: { fontSize: 11, fontWeight: '800', color: Colors.textMuted, textTransform: 'uppercase' },
  contactVal: { fontSize: 15, fontWeight: '700', color: Colors.textDark, marginTop: 4 },
  section: { fontSize: 12, fontWeight: '800', color: Colors.textMuted, marginBottom: 10, textTransform: 'uppercase' },
  faq: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#EEEAF5',
  },
  faqText: { fontSize: 13, color: Colors.textMid, lineHeight: 20 },
});
