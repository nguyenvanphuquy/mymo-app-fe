import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity, Switch, Image, ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import BusinessScreenHeader from '../../components/business/BusinessScreenHeader';
import DemoBadge from '../../components/business/DemoBadge';
import { Colors, Shadows } from '../../constants/colors';
import { useI18n } from '../../i18n';
import type { BusinessSession } from '../../services/businessApi';
import { getLocalBusinessProfile, saveLocalBusinessProfile } from '../../utils/businessProfileLocal';

export default function BusinessEditProfileScreen({
  session,
  onBack,
}: {
  session: BusinessSession;
  onBack: () => void;
}) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState(session.displayName);
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [notifyCampaign, setNotifyCampaign] = useState(true);
  const [notifyReviews, setNotifyReviews] = useState(true);
  const [notifyPlaceStatus, setNotifyPlaceStatus] = useState(true);

  useEffect(() => {
    getLocalBusinessProfile().then(p => {
      setDisplayName(p.displayName || session.displayName);
      setDescription(p.description);
      setPhone(p.phone);
      setWebsite(p.website);
      setLogoUri(p.logoUri);
      setNotifyCampaign(p.notifyCampaign);
      setNotifyReviews(p.notifyReviews);
      setNotifyPlaceStatus(p.notifyPlaceStatus);
      setLoading(false);
    });
  }, [session.displayName]);

  const pickLogo = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85 });
    if (!res.canceled && res.assets[0]) setLogoUri(res.assets[0].uri);
  };

  const save = async () => {
    setSaving(true);
    try {
      await saveLocalBusinessProfile({
        displayName: displayName.trim(),
        description: description.trim(),
        phone: phone.trim(),
        website: website.trim(),
        logoUri,
        notifyCampaign,
        notifyReviews,
        notifyPlaceStatus,
      });
      Toast.show({ type: 'success', text1: t('biz.profile.savedLocal') });
      onBack();
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <BusinessScreenHeader title={t('biz.profile.editTitle')} onBack={onBack} />
      <View style={styles.demoRow}>
        <DemoBadge compact />
        <Text style={styles.demoHint}>{t('biz.profile.localOnly')}</Text>
      </View>
      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
          <TouchableOpacity style={styles.logoBtn} onPress={pickLogo}>
            {logoUri ? (
              <Image source={{ uri: logoUri }} style={styles.logo} />
            ) : (
              <Text style={styles.logoPlaceholder}>{t('biz.profile.pickLogo')}</Text>
            )}
          </TouchableOpacity>
          <Field label={t('biz.profile.displayName')} value={displayName} onChangeText={setDisplayName} />
          <Field label={t('biz.profile.about')} value={description} onChangeText={setDescription} multiline />
          <Field label={t('biz.register.phone')} value={phone} onChangeText={setPhone} />
          <Field label="Website" value={website} onChangeText={setWebsite} />
          <Text style={styles.section}>{t('biz.profile.notifyPrefs')}</Text>
          <Toggle label={t('biz.profile.notifyCampaign')} value={notifyCampaign} onValueChange={setNotifyCampaign} />
          <Toggle label={t('biz.profile.notifyReviews')} value={notifyReviews} onValueChange={setNotifyReviews} />
          <Toggle label={t('biz.profile.notifyPlace')} value={notifyPlaceStatus} onValueChange={setNotifyPlaceStatus} />
          <TouchableOpacity style={styles.save} onPress={save} disabled={saving}>
            <Text style={styles.saveText}>{saving ? '…' : t('common.save')}</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

function Field({
  label, value, onChangeText, multiline,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMulti]}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        placeholderTextColor={Colors.textMuted}
      />
    </View>
  );
}

function Toggle({ label, value, onValueChange }: { label: string; value: boolean; onValueChange: (v: boolean) => void }) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ true: Colors.primary }} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAFAFC' },
  demoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20 },
  demoHint: { fontSize: 11, color: Colors.textMuted },
  logoBtn: {
    alignSelf: 'center',
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: '#EEEAF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    overflow: 'hidden',
  },
  logo: { width: '100%', height: '100%' },
  logoPlaceholder: { fontSize: 11, fontWeight: '700', color: Colors.primary, textAlign: 'center', padding: 8 },
  field: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, marginBottom: 6 },
  input: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EEEAF5',
    color: Colors.textDark,
    ...Shadows.soft,
  },
  inputMulti: { minHeight: 88, textAlignVertical: 'top' },
  section: { fontSize: 13, fontWeight: '800', color: Colors.textDark, marginTop: 8, marginBottom: 8 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  toggleLabel: { fontSize: 14, fontWeight: '600', color: Colors.textDark, flex: 1, paddingRight: 12 },
  save: {
    marginTop: 20,
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveText: { color: Colors.white, fontWeight: '900' },
});
