import React from 'react';

import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { Colors, Shadows } from '../../constants/colors';

import { useI18n } from '../../i18n';

import type { AdminServerOverview } from '../../services/adminSettingsApi';



type Props = {

  overview: AdminServerOverview | null;

  loading: boolean;

  error: string | null;

};



export default function AdminSettingsPanel({ overview, loading, error }: Props) {

  const { t } = useI18n();



  if (loading) {

    return (

      <View style={styles.center}>

        <ActivityIndicator color={Colors.primary} />

      </View>

    );

  }



  if (error || !overview) {

    return (

      <View style={styles.emptyCard}>

        <Ionicons name="cloud-offline-outline" size={28} color={Colors.textMuted} />

        <Text style={styles.emptyTitle}>{error ?? t('admin.settingsLoadError')}</Text>

      </View>

    );

  }



  const settings = overview.bankTransfer;



  return (

    <View style={styles.wrap}>

      <View style={styles.hero}>

        <Ionicons name="settings-outline" size={22} color={Colors.primary} />

        <View style={{ flex: 1 }}>

          <Text style={styles.heroTitle}>{t('admin.settingsTitle')}</Text>

          <Text style={styles.heroSub}>{t('admin.settingsReadOnlyHint')}</Text>

        </View>

      </View>



      <View style={styles.card}>

        <Text style={styles.cardTitle}>{t('admin.settingsBankSection')}</Text>

        <Row label={t('admin.settingsBankName')} value={settings.bankName || '—'} />

        <Row label="BIN" value={settings.bankBin || '—'} />

        <Row label={t('admin.settingsAccount')} value={settings.accountNumberMasked} />

        <Row label={t('admin.settingsAccountName')} value={settings.accountName || '—'} />

      </View>



      <View style={styles.card}>

        <Text style={styles.cardTitle}>{t('admin.settingsOpsSection')}</Text>

        <ToggleRow

          label={t('admin.settingsSepay')}

          on={settings.sepayConfigured}

          onLabel={t('admin.settingsConfigured')}

          offLabel={t('admin.settingsNotConfigured')}

        />

        <ToggleRow

          label={t('admin.settingsManualConfirm')}

          on={settings.allowManualConfirm}

          onLabel={t('admin.settingsOn')}

          offLabel={t('admin.settingsOff')}

        />

      </View>



      <View style={styles.card}>

        <Text style={styles.cardTitle}>{t('admin.settingsJwtSection')}</Text>

        <Row label={t('admin.settingsJwtIssuer')} value={overview.jwt.issuer || '—'} />

        <Row label={t('admin.settingsJwtAudience')} value={overview.jwt.audience || '—'} />

        <Row

          label={t('admin.settingsJwtAccessTtl')}

          value={String(overview.jwt.accessTokenExpirationMinutes)}

        />

        <Row

          label={t('admin.settingsJwtRefreshTtl')}

          value={String(overview.jwt.refreshTokenExpirationDays)}

        />

      </View>



      <View style={styles.card}>

        <Text style={styles.cardTitle}>{t('admin.settingsIntegrationsSection')}</Text>

        <ToggleRow

          label="Cloudinary"

          on={overview.integrations.cloudinaryConfigured}

          onLabel={t('admin.settingsConfigured')}

          offLabel={t('admin.settingsNotConfigured')}

        />

        <ToggleRow

          label="Gemini"

          on={overview.integrations.geminiConfigured}

          onLabel={t('admin.settingsConfigured')}

          offLabel={t('admin.settingsNotConfigured')}

        />

        <ToggleRow

          label={t('admin.settingsWeather')}

          on={overview.integrations.weatherConfigured}

          onLabel={t('admin.settingsConfigured')}

          offLabel={t('admin.settingsNotConfigured')}

        />

        <Text style={styles.foot}>{t('admin.settingsFootnote')}</Text>

      </View>

    </View>

  );

}



function Row({ label, value }: { label: string; value: string }) {

  return (

    <View style={styles.row}>

      <Text style={styles.rowLabel}>{label}</Text>

      <Text style={styles.rowValue}>{value}</Text>

    </View>

  );

}



function ToggleRow({

  label,

  on,

  onLabel,

  offLabel,

}: {

  label: string;

  on: boolean;

  onLabel: string;

  offLabel: string;

}) {

  return (

    <View style={styles.row}>

      <Text style={styles.rowLabel}>{label}</Text>

      <View style={[styles.pill, on ? styles.pillOn : styles.pillOff]}>

        <Text style={[styles.pillText, on ? styles.pillTextOn : styles.pillTextOff]}>

          {on ? onLabel : offLabel}

        </Text>

      </View>

    </View>

  );

}



const styles = StyleSheet.create({

  wrap: { gap: 12, marginBottom: 16 },

  center: { padding: 32, alignItems: 'center' },

  emptyCard: {

    alignItems: 'center',

    padding: 28,

    backgroundColor: Colors.white,

    borderRadius: 14,

    gap: 8,

  },

  emptyTitle: { fontSize: 13, fontWeight: '700', color: Colors.textMuted, textAlign: 'center' },

  hero: {

    flexDirection: 'row',

    alignItems: 'center',

    gap: 12,

    backgroundColor: Colors.white,

    borderRadius: 14,

    padding: 14,

    borderWidth: 1,

    borderColor: Colors.primarySoft,

    ...Shadows.soft,

  },

  heroTitle: { fontSize: 15, fontWeight: '900', color: Colors.textDark },

  heroSub: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },

  card: {

    backgroundColor: Colors.white,

    borderRadius: 14,

    padding: 14,

    borderWidth: 1,

    borderColor: '#E0E7FF',

    gap: 10,

    ...Shadows.soft,

  },

  cardTitle: { fontSize: 13, fontWeight: '800', color: Colors.textDark, marginBottom: 4 },

  row: {

    flexDirection: 'row',

    justifyContent: 'space-between',

    alignItems: 'center',

    gap: 12,

  },

  rowLabel: { fontSize: 12, fontWeight: '600', color: Colors.textMuted, flex: 1 },

  rowValue: { fontSize: 12, fontWeight: '800', color: Colors.textDark, flex: 1, textAlign: 'right' },

  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },

  pillOn: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },

  pillOff: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },

  pillText: { fontSize: 10, fontWeight: '800' },

  pillTextOn: { color: '#047857' },

  pillTextOff: { color: '#B91C1C' },

  foot: { fontSize: 10, color: Colors.textMuted, lineHeight: 15, marginTop: 4 },

});

