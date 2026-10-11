import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Colors, Shadows } from '../constants/colors';
import { APP_MAX_WIDTH } from '../constants/layout';
import { useI18n } from '../i18n';
import {
  getMyBusinessRegistration,
  registerBusiness,
  type BusinessRegistrationDto,
} from '../services/businessRegistrationApi';
import AddressMapPicker, { type AddressPick } from '../components/AddressMapPicker';

export default function RegisterBusinessScreen({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existing, setExisting] = useState<BusinessRegistrationDto | null>(null);
  const [businessName, setBusinessName] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [place, setPlace] = useState<AddressPick | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const reg = await getMyBusinessRegistration();
      setExisting(reg);
      if (reg) {
        setBusinessName(reg.name);
        setDescription(reg.description ?? '');
        setPhone(reg.phone ?? '');
        if (reg.address && reg.latitude != null && reg.longitude != null) {
          setPlace({ address: reg.address, latitude: reg.latitude, longitude: reg.longitude });
        } else {
          setPlace(null);
        }
      }
    } catch (e) {
      Toast.show({ type: 'error', text1: e instanceof Error ? e.message : 'Load failed' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!businessName.trim() || !place) {
      Toast.show({ type: 'error', text1: t('biz.register.required') });
      return;
    }
    if (existing?.status === 'Pending') {
      Toast.show({ type: 'info', text1: t('biz.register.alreadyPending') });
      return;
    }
    if (existing?.status === 'Approved') {
      Toast.show({ type: 'info', text1: t('biz.register.alreadyApproved') });
      return;
    }
    try {
      setSaving(true);
      const reg = await registerBusiness({
        businessName: businessName.trim(),
        description: description.trim() || undefined,
        phone: phone.trim() || undefined,
        address: place.address.trim(),
        latitude: place.latitude,
        longitude: place.longitude,
      });
      setExisting(reg);
      Toast.show({ type: 'success', text1: t('biz.register.submitted') });
    } catch (e) {
      Toast.show({ type: 'error', text1: e instanceof Error ? e.message : 'Submit failed' });
    } finally {
      setSaving(false);
    }
  };

  const showForm = !existing || existing.status === 'Rejected';

  return (
    <View style={styles.host}>
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} hitSlop={12}>
          <Ionicons name="close" size={26} color={Colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{t('biz.register.title')}</Text>
        <View style={{ width: 26 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(32, insets.bottom + 24) }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {existing?.status === 'Pending' && (
            <View style={styles.pendingCard}>
              <Ionicons name="time-outline" size={28} color={Colors.primary} />
              <Text style={styles.pendingTitle}>{t('biz.register.pendingTitle')}</Text>
              <Text style={styles.pendingDesc}>{t('biz.register.pendingDesc')}</Text>
              <Text style={styles.meta}>{existing.name}</Text>
            </View>
          )}

          {existing?.status === 'Rejected' && (
            <View style={styles.rejectedCard}>
              <Text style={styles.rejectedTitle}>{t('biz.register.rejectedTitle')}</Text>
              {existing.rejectReason ? (
                <Text style={styles.rejectedReason}>{existing.rejectReason}</Text>
              ) : null}
              <Text style={styles.pendingDesc}>{t('biz.register.resubmitHint')}</Text>
            </View>
          )}

          {showForm && (
            <>
              <Field label={t('biz.register.businessName')} value={businessName} onChangeText={setBusinessName} />
              <Field label={t('biz.register.description')} value={description} onChangeText={setDescription} multiline />
              <Field label={t('biz.register.phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
              <AddressMapPicker value={place} onChange={setPlace} />
              <TouchableOpacity style={styles.btn} onPress={submit} disabled={saving} activeOpacity={0.88}>
                {saving ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.btnText}>{t('biz.register.submit')}</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      )}
    </View>
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
  keyboardType?: 'default' | 'phone-pad';
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

const styles = StyleSheet.create({
  host: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  root: {
    flex: 1,
    width: '100%',
    maxWidth: APP_MAX_WIDTH,
    minHeight: 0,
    backgroundColor: Colors.primaryTint,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: '#EBE8F5',
      },
      default: {},
    }),
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 12,
  },
  title: { flex: 1, fontSize: 17, fontWeight: '800', color: Colors.textDark, textAlign: 'center' },
  scrollView: { flex: 1, width: '100%', minHeight: 0 },
  scroll: { padding: 20 },
  field: { marginBottom: 14, width: '100%' },
  label: { fontSize: 13, fontWeight: '700', color: Colors.textMid, marginBottom: 6 },
  input: {
    width: '100%',
    maxWidth: '100%',
    backgroundColor: Colors.white, borderRadius: 14, padding: 14, fontSize: 15,
    color: Colors.textDark, ...Shadows.soft,
  },
  inputMulti: { minHeight: 88, textAlignVertical: 'top' },
  btn: {
    marginTop: 8, backgroundColor: Colors.primary, borderRadius: 16, padding: 16, alignItems: 'center',
  },
  btnText: { color: Colors.white, fontWeight: '800', fontSize: 16 },
  pendingCard: {
    backgroundColor: Colors.white, borderRadius: 20, padding: 20, alignItems: 'center', marginBottom: 20, ...Shadows.soft,
  },
  pendingTitle: { fontSize: 18, fontWeight: '800', color: Colors.textDark, marginTop: 8 },
  pendingDesc: { fontSize: 13, color: Colors.textMid, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  meta: { fontSize: 14, fontWeight: '700', color: Colors.primary, marginTop: 12 },
  rejectedCard: {
    backgroundColor: '#FFF5F5', borderRadius: 16, padding: 16, marginBottom: 16,
  },
  rejectedTitle: { fontWeight: '800', color: '#B91C1C' },
  rejectedReason: { marginTop: 6, color: Colors.textMid, fontSize: 13 },
});
