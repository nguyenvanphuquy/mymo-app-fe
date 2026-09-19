import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Gradients, Shadows } from '../../constants/colors';
import { useI18n } from '../../i18n';
import {
  getBusinessAccount,
  type BusinessAccount,
  type BusinessSession,
} from '../../utils/businessStorage';

export default function BusinessBrandScreen({
  session,
  onLogout,
}: {
  session: BusinessSession;
  onLogout: () => void;
}) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [account, setAccount] = useState<BusinessAccount | null>(null);

  useEffect(() => {
    getBusinessAccount(session.accountId).then(setAccount);
  }, [session.accountId]);

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
      <Text style={styles.company}>{session.businessName}</Text>
      {account?.verified ? (
        <View style={styles.verified}>
          <Ionicons name="checkmark-circle" size={14} color={Colors.activeGreen} />
          <Text style={styles.verifiedText}>{t('biz.brand.verified')}</Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <Row icon="call-outline" text={account?.phone || '—'} />
        <Row icon="mail-outline" text={account?.email || '—'} />
        <Row icon="location-outline" text={account?.address || '—'} />
        <Row icon="pricetag-outline" text={account?.category || '—'} />
      </View>

      <Text style={styles.hint}>{t('biz.brand.hint')}</Text>
      <TouchableOpacity onPress={onLogout} style={styles.logout} activeOpacity={0.85}>
        <Text style={styles.logoutText}>{t('biz.brand.logout')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Row({ icon, text }: { icon: React.ComponentProps<typeof Ionicons>['name']; text: string }) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={16} color={Colors.primary} />
      <Text style={styles.rowText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.primaryTint },
  cover: {
    height: 120, borderRadius: 24, marginBottom: 36, alignItems: 'center', justifyContent: 'flex-end',
  },
  logo: {
    width: 72, height: 72, borderRadius: 24, backgroundColor: Colors.white,
    alignItems: 'center', justifyContent: 'center', marginBottom: -24, ...Shadows.float,
  },
  name: { marginTop: 32, fontSize: 24, fontWeight: '900', color: Colors.textDark, textAlign: 'center' },
  company: { fontSize: 13, color: Colors.textMid, textAlign: 'center', marginTop: 4 },
  verified: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 8,
  },
  verifiedText: { fontSize: 12, fontWeight: '800', color: Colors.activeGreen },
  card: { backgroundColor: Colors.white, borderRadius: 22, padding: 16, marginTop: 20, ...Shadows.soft },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  rowText: { fontSize: 14, color: Colors.textDark, fontWeight: '600', flex: 1 },
  hint: { fontSize: 12, color: Colors.textMuted, textAlign: 'center', marginTop: 16 },
  logout: {
    marginTop: 16, borderRadius: 16, borderWidth: 1.5, borderColor: '#FFE3E8', paddingVertical: 14, alignItems: 'center',
  },
  logoutText: { color: '#E11D48', fontWeight: '800' },
});
