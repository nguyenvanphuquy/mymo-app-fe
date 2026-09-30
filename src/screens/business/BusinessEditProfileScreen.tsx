import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity, Switch, Image, ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import BusinessScreenHeader from '../../components/business/BusinessScreenHeader';
import { Colors, Shadows } from '../../constants/colors';
import { useI18n } from '../../i18n';
import {
  getMyBusinesses,
  updateBusiness,
  type BusinessSession,
} from '../../services/businessApi';
import { uploadMedia } from '../../services/mediaApi';
import { buildImageFormData, guessImageMeta } from '../../utils/imageFormData';
import { getBusinessNotifyPrefs, saveBusinessNotifyPrefs } from '../../utils/businessProfileLocal';

function isLocalImageUri(uri: string | null): boolean {
  if (!uri) return false;
  return uri.startsWith('file:') || uri.startsWith('content:') || uri.startsWith('blob:') || uri.startsWith('data:');
}

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
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState(session.displayName);
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState(session.email);
  const [website, setWebsite] = useState('');
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [serverLogoUrl, setServerLogoUrl] = useState<string | null>(null);
  const [notifyCampaign, setNotifyCampaign] = useState(true);
  const [notifyReviews, setNotifyReviews] = useState(true);
  const [notifyPlaceStatus, setNotifyPlaceStatus] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [bizList, notifyPrefs] = await Promise.all([
          getMyBusinesses(),
          getBusinessNotifyPrefs(),
        ]);
        if (cancelled) return;
        const biz = bizList[0];
        if (biz) {
          setBusinessId(biz.businessId);
          setDisplayName(biz.name || session.displayName);
          setDescription(biz.description ?? '');
          setPhone(biz.phone ?? '');
          setEmail(biz.email ?? session.email);
          setWebsite(biz.website ?? '');
          setServerLogoUrl(biz.logoUrl ?? null);
          setLogoUri(biz.logoUrl ?? null);
        }
        setNotifyCampaign(notifyPrefs.notifyCampaign);
        setNotifyReviews(notifyPrefs.notifyReviews);
        setNotifyPlaceStatus(notifyPrefs.notifyPlaceStatus);
      } catch (err) {
        if (!cancelled) {
          Toast.show({
            type: 'error',
            text1: err instanceof Error ? err.message : t('biz.profile.loadError'),
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [session.displayName, session.email, t]);

  const pickLogo = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (!res.canceled && res.assets[0]) setLogoUri(res.assets[0].uri);
  };

  const save = async () => {
    if (!businessId) {
      Toast.show({ type: 'error', text1: t('biz.profile.noBusiness') });
      return;
    }
    const name = displayName.trim();
    if (!name) {
      Toast.show({ type: 'error', text1: t('biz.profile.nameRequired') });
      return;
    }

    setSaving(true);
    try {
      let logoUrl = serverLogoUrl;
      if (logoUri && isLocalImageUri(logoUri)) {
        const meta = guessImageMeta(logoUri, 'logo.jpg');
        const fd = await buildImageFormData(logoUri, meta.fileName, meta.fileType);
        const uploaded = await uploadMedia(fd);
        logoUrl = uploaded.url ?? null;
        if (!logoUrl) throw new Error(t('biz.profile.logoUploadFailed'));
      } else if (logoUri && !isLocalImageUri(logoUri)) {
        logoUrl = logoUri;
      } else if (!logoUri) {
        logoUrl = null;
      }

      await updateBusiness(businessId, {
        name,
        description: description.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        website: website.trim() || null,
        logoUrl,
      });

      await saveBusinessNotifyPrefs({
        notifyCampaign,
        notifyReviews,
        notifyPlaceStatus,
      });

      Toast.show({ type: 'success', text1: t('biz.profile.savedServer') });
      onBack();
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: err instanceof Error ? err.message : t('biz.profile.saveError'),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <BusinessScreenHeader title={t('biz.profile.editTitle')} onBack={onBack} />
      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
          {!businessId ? (
            <Text style={styles.noBiz}>{t('biz.profile.noBusiness')}</Text>
          ) : null}
          <TouchableOpacity style={styles.logoBtn} onPress={pickLogo} disabled={!businessId}>
            {logoUri ? (
              <Image source={{ uri: logoUri }} style={styles.logo} />
            ) : (
              <Text style={styles.logoPlaceholder}>{t('biz.profile.pickLogo')}</Text>
            )}
          </TouchableOpacity>
          <Field label={t('biz.profile.displayName')} value={displayName} onChangeText={setDisplayName} />
          <Field label={t('biz.profile.about')} value={description} onChangeText={setDescription} multiline />
          <Field label={t('biz.register.phone')} value={phone} onChangeText={setPhone} />
          <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
          <Field label="Website" value={website} onChangeText={setWebsite} />
          <Text style={styles.section}>{t('biz.profile.notifyPrefs')}</Text>
          <Text style={styles.notifyHint}>{t('biz.profile.notifyLocalHint')}</Text>
          <Toggle label={t('biz.profile.notifyCampaign')} value={notifyCampaign} onValueChange={setNotifyCampaign} />
          <Toggle label={t('biz.profile.notifyReviews')} value={notifyReviews} onValueChange={setNotifyReviews} />
          <Toggle label={t('biz.profile.notifyPlace')} value={notifyPlaceStatus} onValueChange={setNotifyPlaceStatus} />
          <TouchableOpacity style={styles.save} onPress={save} disabled={saving || !businessId}>
            {saving ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.saveText}>{t('common.save')}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

function Field({
  label, value, onChangeText, multiline, keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  multiline?: boolean;
  keyboardType?: 'default' | 'email-address';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMulti]}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        keyboardType={keyboardType}
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
  noBiz: { fontSize: 13, color: '#E11D48', marginBottom: 12, fontWeight: '600' },
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
  section: { fontSize: 13, fontWeight: '800', color: Colors.textDark, marginTop: 8, marginBottom: 4 },
  notifyHint: { fontSize: 11, color: Colors.textMuted, marginBottom: 8 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  toggleLabel: { fontSize: 14, fontWeight: '600', color: Colors.textDark, flex: 1, paddingRight: 12 },
  save: {
    marginTop: 20,
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  saveText: { color: Colors.white, fontWeight: '900' },
});
