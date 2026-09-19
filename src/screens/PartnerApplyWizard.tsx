import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView,
  DeviceEventEmitter,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import { Colors, Gradients, Shadows } from '../constants/colors';
import { useI18n } from '../i18n';
import { getStoredAuthSession } from '../services/authApi';
import { getUserProfile } from '../services/userApi';
import {
  BUSINESS_CATEGORIES,
  BUSINESS_VIBES,
  PARTNER_YEARLY_PRICE,
  getApplicationForUser,
  submitApplication,
  type BusinessApplication,
  type BusinessCategory,
  type BusinessVibe,
} from '../utils/businessStorage';

type Step = 0 | 1 | 2;

function formatVnd(amount: number, lang: string): string {
  return new Intl.NumberFormat(lang === 'vi' ? 'vi-VN' : 'en-US').format(amount) + (lang === 'vi' ? 'đ' : ' VND');
}

interface PartnerApplyWizardProps {
  onSubmitted: () => void;
}

export default function PartnerApplyWizard({ onSubmitted }: PartnerApplyWizardProps) {
  const { t, lang } = useI18n();
  const [step, setStep] = useState<Step>(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [existing, setExisting] = useState<BusinessApplication | null>(null);
  const [userId, setUserId] = useState('');
  const [applicantEmail, setApplicantEmail] = useState('');
  const [applicantName, setApplicantName] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [category, setCategory] = useState<BusinessCategory>('cafe');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [vibe, setVibe] = useState<BusinessVibe>('chill');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const session = await getStoredAuthSession();
        if (!session?.userId) {
          setLoading(false);
          return;
        }
        setUserId(session.userId);
        setApplicantEmail(session.email || '');
        setApplicantName(session.username || '');
        try {
          const profile = await getUserProfile();
          setPhone(profile.phoneNumber || '');
          setApplicantName(profile.displayName || profile.username || session.username);
          setApplicantEmail(profile.email || session.email);
        } catch {
          // demo session has no profile
        }
        const app = await getApplicationForUser(session.userId);
        setExisting(app);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const goForm = () => {
    if (!userId) {
      Toast.show({ type: 'error', text1: t('premium.partnerNeedLogin') });
      return;
    }
    if (!phone.trim()) {
      Toast.show({ type: 'error', text1: t('premium.partnerNeedPhone') });
      return;
    }
    if (!acceptedTerms) {
      Toast.show({ type: 'error', text1: t('premium.partnerNeedTerms') });
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep(1);
  };

  const goConfirm = () => {
    if (!businessName.trim() || !displayName.trim()) {
      Toast.show({ type: 'error', text1: t('premium.partnerNeedName') });
      return;
    }
    if (!address.trim()) {
      Toast.show({ type: 'error', text1: t('premium.partnerNeedAddress') });
      return;
    }
    if (!phone.trim()) {
      Toast.show({ type: 'error', text1: t('premium.partnerNeedPhone') });
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!confirmed) {
      Toast.show({ type: 'error', text1: t('premium.partnerNeedConfirm') });
      return;
    }
    try {
      setSubmitting(true);
      await submitApplication({
        applicantUserId: userId,
        applicantEmail,
        applicantName,
        businessName: businessName.trim(),
        displayName: displayName.trim(),
        category,
        address: address.trim(),
        phone: phone.trim(),
        vibe,
        notes: notes.trim(),
      });
      DeviceEventEmitter.emit('partner:updated');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: t('premium.partnerSent'), text2: t('premium.partnerSentDesc') });
      onSubmitted();
    } catch (error) {
      const code = error instanceof Error ? error.message : '';
      Toast.show({
        type: 'error',
        text1: code === 'APPLICATION_EXISTS' ? t('premium.partnerExists') : code,
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <ActivityIndicator color={Colors.primary} style={{ marginVertical: 32 }} />;
  }

  if (existing && existing.status !== 'rejected') {
    return (
      <View style={styles.statusCard}>
        <Ionicons
          name={existing.status === 'approved' ? 'checkmark-circle' : 'time-outline'}
          size={28}
          color={Colors.primary}
        />
        <Text style={styles.statusTitle}>
          {existing.status === 'approved' ? t('premium.partnerApproved') : t('premium.partnerPending')}
        </Text>
        {existing.status === 'approved' && existing.issuedUsername ? (
          <Text style={styles.statusMeta}>
            {existing.issuedUsername} · {existing.issuedPassword}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View>
      {existing?.status === 'rejected' ? (
        <View style={styles.rejectBanner}>
          <Text style={styles.rejectTitle}>{t('premium.partnerRejected')}</Text>
          {existing.rejectReason ? <Text style={styles.rejectReason}>{existing.rejectReason}</Text> : null}
        </View>
      ) : null}

      <View style={styles.steps}>
        {[t('premium.partnerStepGate'), t('premium.partnerStepForm'), t('premium.partnerStepConfirm')].map((label, i) => (
          <View key={label} style={[styles.stepChip, step === i && styles.stepChipActive]}>
            <Text style={[styles.stepChipText, step === i && styles.stepChipTextActive]}>{label}</Text>
          </View>
        ))}
      </View>

      {step === 0 && (
        <>
          <View style={styles.warnCard}>
            <Ionicons name="information-circle-outline" size={18} color={Colors.primary} />
            <Text style={styles.warnText}>{t('premium.partnerWarn')}</Text>
          </View>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder={t('premium.partnerPhone')}
            placeholderTextColor={Colors.textMuted}
            style={styles.input}
            keyboardType="phone-pad"
          />
          <TouchableOpacity
            style={styles.checkRow}
            onPress={() => setAcceptedTerms(v => !v)}
            activeOpacity={0.85}
          >
            <Ionicons
              name={acceptedTerms ? 'checkbox' : 'square-outline'}
              size={20}
              color={Colors.primary}
            />
            <Text style={styles.checkText}>{t('premium.partnerTerms')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={goForm} activeOpacity={0.88} style={styles.cta}>
            <LinearGradient colors={Gradients.primary} style={styles.ctaGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Text style={styles.ctaText}>{t('premium.partnerNext')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </>
      )}

      {step === 1 && (
        <>
          <TextInput
            value={businessName}
            onChangeText={setBusinessName}
            placeholder={t('premium.partnerBusinessName')}
            placeholderTextColor={Colors.textMuted}
            style={styles.input}
          />
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            placeholder={t('premium.partnerDisplayName')}
            placeholderTextColor={Colors.textMuted}
            style={styles.input}
          />
          <Text style={styles.fieldLabel}>{t('premium.partnerCategory')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {BUSINESS_CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat}
                onPress={() => setCategory(cat)}
                style={[styles.chip, category === cat && styles.chipActive]}
              >
                <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>
                  {t(`premium.cat.${cat}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TextInput
            value={address}
            onChangeText={setAddress}
            placeholder={t('premium.partnerAddress')}
            placeholderTextColor={Colors.textMuted}
            style={styles.input}
          />
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder={t('premium.partnerPhone')}
            placeholderTextColor={Colors.textMuted}
            style={styles.input}
            keyboardType="phone-pad"
          />
          <Text style={styles.fieldLabel}>{t('premium.partnerVibe')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {BUSINESS_VIBES.map(item => (
              <TouchableOpacity
                key={item.id}
                onPress={() => setVibe(item.id)}
                style={[styles.chip, vibe === item.id && styles.chipActive]}
              >
                <Text style={[styles.chipText, vibe === item.id && styles.chipTextActive]}>
                  {item.emoji} {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder={t('premium.partnerNotes')}
            placeholderTextColor={Colors.textMuted}
            style={[styles.input, styles.notes]}
            multiline
          />
          <View style={styles.rowBtns}>
            <TouchableOpacity onPress={() => setStep(0)} style={styles.backBtn}>
              <Text style={styles.backText}>{t('premium.partnerBack')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={goConfirm} activeOpacity={0.88} style={[styles.cta, { flex: 1 }]}>
              <LinearGradient colors={Gradients.primary} style={styles.ctaGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={styles.ctaText}>{t('premium.partnerNext')}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </>
      )}

      {step === 2 && (
        <>
          <Text style={styles.fieldLabel}>{t('premium.partnerSummary')}</Text>
          <View style={styles.summary}>
            <SummaryRow label={t('premium.partnerBusinessName')} value={businessName} />
            <SummaryRow label={t('premium.partnerDisplayName')} value={displayName} />
            <SummaryRow label={t('premium.partnerCategory')} value={t(`premium.cat.${category}`)} />
            <SummaryRow label={t('premium.partnerAddress')} value={address} />
            <SummaryRow label={t('premium.partnerPhone')} value={phone} />
            <SummaryRow label={t('premium.partnerVibe')} value={vibe} />
            <SummaryRow label={t('premium.partnerPrice')} value={formatVnd(PARTNER_YEARLY_PRICE, lang)} />
          </View>
          <Text style={styles.priceHint}>{t('premium.partnerPriceHint')}</Text>
          <TouchableOpacity
            style={styles.checkRow}
            onPress={() => setConfirmed(v => !v)}
            activeOpacity={0.85}
          >
            <Ionicons name={confirmed ? 'checkbox' : 'square-outline'} size={20} color={Colors.primary} />
            <Text style={styles.checkText}>{t('premium.partnerConfirmCheck')}</Text>
          </TouchableOpacity>
          <View style={styles.rowBtns}>
            <TouchableOpacity onPress={() => setStep(1)} style={styles.backBtn}>
              <Text style={styles.backText}>{t('premium.partnerBack')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.88}
              style={[styles.cta, { flex: 1 }]}
            >
              <LinearGradient colors={Gradients.primary} style={styles.ctaGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                {submitting ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.ctaText}>{t('premium.partnerSubmit')}</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  steps: { flexDirection: 'row', gap: 6, marginBottom: 16 },
  stepChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: Colors.white,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primarySoft,
  },
  stepChipActive: { backgroundColor: Colors.primaryTint, borderColor: Colors.primary },
  stepChipText: { fontSize: 10, fontWeight: '700', color: Colors.textMuted },
  stepChipTextActive: { color: Colors.primary },
  warnCard: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.primarySoft,
    ...Shadows.soft,
  },
  warnText: { flex: 1, fontSize: 12, color: Colors.textMid, lineHeight: 18 },
  input: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.primarySoft,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.textDark,
    marginBottom: 10,
  },
  notes: { minHeight: 72, textAlignVertical: 'top' },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
    marginLeft: 4,
  },
  chipRow: { gap: 8, paddingBottom: 12 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.primarySoft,
  },
  chipActive: { backgroundColor: Colors.primaryTint, borderColor: Colors.primary },
  chipText: { fontSize: 12, fontWeight: '700', color: Colors.textMid },
  chipTextActive: { color: Colors.primary },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  checkText: { flex: 1, fontSize: 13, color: Colors.textDark, lineHeight: 18 },
  cta: { borderRadius: 16, overflow: 'hidden', ...Shadows.glow, marginBottom: 8 },
  ctaGrad: { paddingVertical: 14, alignItems: 'center' },
  ctaText: { color: Colors.white, fontWeight: '800', fontSize: 14 },
  rowBtns: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backBtn: { paddingVertical: 14, paddingHorizontal: 12 },
  backText: { fontSize: 13, fontWeight: '700', color: Colors.textMid },
  summary: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 12,
    marginBottom: 8,
    ...Shadows.soft,
  },
  summaryRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.primaryTint },
  summaryLabel: { fontSize: 11, color: Colors.textMuted, fontWeight: '700' },
  summaryValue: { fontSize: 13, color: Colors.textDark, fontWeight: '700', marginTop: 2 },
  priceHint: { fontSize: 11, color: Colors.textMuted, marginBottom: 12, textAlign: 'center' },
  statusCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    ...Shadows.soft,
  },
  statusTitle: { fontSize: 14, fontWeight: '800', color: Colors.textDark, textAlign: 'center' },
  statusMeta: { fontSize: 13, color: Colors.primary, fontWeight: '700' },
  rejectBanner: {
    backgroundColor: '#FFF1F2',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  rejectTitle: { fontSize: 13, fontWeight: '800', color: '#E11D48' },
  rejectReason: { fontSize: 12, color: Colors.textMid, marginTop: 4 },
});
