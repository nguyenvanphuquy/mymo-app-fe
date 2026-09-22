import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Gradients, Shadows } from '../../constants/colors';
import { useI18n } from '../../i18n';
import { getMyBusinesses, type BusinessDto, type BusinessSession } from '../../services/businessApi';

export default function BusinessBrandScreen({
  session,
  onLogout,
}: {
  session: BusinessSession;
  onLogout: () => void;
}) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [business, setBusiness] = useState<BusinessDto | null>(null);

  useEffect(() => {
    getMyBusinesses().then(list => setBusiness(list[0] ?? null));
  }, []);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 120, paddingHorizontal: 20 }}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient colors={Gradients.primary} style={styles.cover}>
        <View style={styles.logo}>
          <Ionicons name="storefront" size={28} color={Colors.primary} />
        </View>
      </LinearGradient>
      <Text style={styles.name}>{session.displayName}</Text>
      <Text style={styles.company}>{business?.name ?? session.email}</Text>
      {business?.verified ? (
        <View style={styles.verified}>
          <Ionicons name="checkmark-circle" size={14} color={Colors.activeGreen} />
          <Text style={styles.verifiedText}>{t('biz.brand.verified')}</Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <Row icon="call-outline" text={business?.phone || '—'} />
        <Row icon="mail-outline" text={business?.email || session.email} />
        <Row icon="globe-outline" text={business?.website || '—'} />
      </View>

      <Text style={styles.hint}>{t('biz.brand.hint')}</Text>
      <TouchableOpacity onPress={onLogout} style={styles.logout} activeOpacity={0.85}>
        <Text style={styles.logoutText}>{t('biz.brand.logout')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Row({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={18} color={Colors.primary} />
      <Text style={styles.rowText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.primaryTint },
  cover: { height: 120, borderRadius: 24, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: -24 },
  logo: {
    width: 72, height: 72, borderRadius: 20, backgroundColor: Colors.white,
    alignItems: 'center', justifyContent: 'center', marginBottom: -36, ...Shadows.soft,
  },
  name: { fontSize: 22, fontWeight: '900', color: Colors.textDark, marginTop: 44, textAlign: 'center' },
  company: { fontSize: 13, color: Colors.textMid, textAlign: 'center', marginTop: 4 },
  verified: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 8 },
  verifiedText: { fontSize: 12, fontWeight: '700', color: Colors.activeGreen },
  card: { backgroundColor: Colors.white, borderRadius: 20, padding: 16, marginTop: 20, gap: 12, ...Shadows.soft },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowText: { fontSize: 14, color: Colors.textDark, flex: 1 },
  hint: { fontSize: 12, color: Colors.textMuted, textAlign: 'center', marginTop: 20, lineHeight: 18 },
  logout: { marginTop: 24, padding: 14, borderRadius: 16, backgroundColor: Colors.primarySoft, alignItems: 'center' },
  logoutText: { fontWeight: '800', color: Colors.primary },
});
