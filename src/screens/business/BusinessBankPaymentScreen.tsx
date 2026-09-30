import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Image, TextInput, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import BusinessScreenHeader from '../../components/business/BusinessScreenHeader';
import { Colors, Shadows } from '../../constants/colors';
import { useI18n } from '../../i18n';
import {
  acknowledgeCampaignBankTransfer,
  campaignNeedsPayment,
  campaignPackageNameKey,
  getCampaignBankTransferInstructions,
  getCampaignPaymentStatus,
  type BusinessAdCampaign,
  type CampaignBankTransferInstructions,
} from '../../services/businessAdCampaignApi';

function formatVnd(n: number, lang: string) {
  return new Intl.NumberFormat(lang === 'vi' ? 'vi-VN' : 'en-US').format(n) + (lang === 'vi' ? 'đ' : ' VND');
}

function CopyRow({
  label,
  value,
  onCopy,
  copyLabel,
}: {
  label: string;
  value: string;
  onCopy: () => void;
  copyLabel: string;
}) {
  return (
    <View style={styles.copyRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.copyLabel}>{label}</Text>
        <Text style={styles.copyValue} selectable>{value}</Text>
      </View>
      <TouchableOpacity style={styles.copyBtn} onPress={onCopy} activeOpacity={0.85}>
        <Ionicons name="copy-outline" size={16} color={Colors.primary} />
        <Text style={styles.copyBtnText}>{copyLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function BusinessBankPaymentScreen({
  campaign,
  onBack,
  onPaid,
}: {
  campaign: BusinessAdCampaign;
  onBack: () => void;
  onPaid: (updated: BusinessAdCampaign) => void;
}) {
  const { t, lang } = useI18n();
  const insets = useSafeAreaInsets();
  const [instructions, setInstructions] = useState<CampaignBankTransferInstructions | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [payerRef, setPayerRef] = useState('');
  const [ackBusy, setAckBusy] = useState(false);
  const [waitingConfirm, setWaitingConfirm] = useState(Boolean(campaign.paymentSubmittedAt));
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadInstructions = useCallback(async () => {
    setLoadError(null);
    setLoading(true);
    try {
      setInstructions(await getCampaignBankTransferInstructions(campaign.campaignId));
    } catch (err) {
      setInstructions(null);
      setLoadError(err instanceof Error ? err.message : t('biz.bankPay.loadError'));
    } finally {
      setLoading(false);
    }
  }, [campaign.campaignId, t]);

  useEffect(() => { loadInstructions(); }, [loadInstructions]);

  const stopPoll = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const startPoll = useCallback(() => {
    stopPoll();
    pollRef.current = setInterval(async () => {
      try {
        const fresh = await getCampaignPaymentStatus(campaign.campaignId);
        if (fresh && !campaignNeedsPayment(fresh.paymentStatus)) {
          stopPoll();
          setWaitingConfirm(false);
          Toast.show({ type: 'success', text1: t('biz.billing.paySuccess'), text2: t('biz.billing.paySuccessSub') });
          onPaid(fresh);
        }
      } catch {
        /* ignore transient poll errors */
      }
    }, 5000);
  }, [campaign.campaignId, onPaid, t]);

  useEffect(() => {
    if (waitingConfirm && campaignNeedsPayment(campaign.paymentStatus)) startPoll();
    return stopPoll;
  }, [waitingConfirm, campaign.paymentStatus, startPoll]);

  const copy = async (text: string) => {
    await Clipboard.setStringAsync(text);
    Toast.show({ type: 'info', text1: t('biz.bankPay.copied') });
  };

  const onAck = async () => {
    setAckBusy(true);
    try {
      const updated = await acknowledgeCampaignBankTransfer(campaign.campaignId, payerRef);
      setWaitingConfirm(true);
      Toast.show({ type: 'success', text1: t('biz.bankPay.ackSuccess'), text2: t('biz.bankPay.ackSuccessSub') });
      if (!campaignNeedsPayment(updated.paymentStatus)) onPaid(updated);
    } catch (err) {
      Toast.show({ type: 'error', text1: err instanceof Error ? err.message : t('biz.bankPay.ackError') });
    } finally {
      setAckBusy(false);
    }
  };

  const amount = instructions?.amountVnd ?? campaign.amountVnd;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <BusinessScreenHeader title={t('biz.bankPay.title')} onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
        <Text style={styles.pkg}>{t(campaignPackageNameKey(campaign))}</Text>
        <Text style={styles.amount}>{formatVnd(amount, lang)}</Text>

        {loading ? <ActivityIndicator color={Colors.primary} style={{ marginVertical: 24 }} /> : null}
        {loadError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{loadError}</Text>
            <TouchableOpacity onPress={loadInstructions}>
              <Text style={styles.retry}>{t('common.retry')}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {instructions ? (
          <>
            <Text style={styles.section}>{t('biz.bankPay.qrSection')}</Text>
            {instructions.vietQrImageUrl ? (
              <Image
                source={{ uri: instructions.vietQrImageUrl }}
                style={styles.qr}
                resizeMode="contain"
              />
            ) : null}

            <View style={styles.card}>
              <CopyRow
                label={t('biz.bankPay.bank')}
                value={instructions.bankName}
                onCopy={() => copy(instructions.bankName)}
                copyLabel={t('biz.bankPay.copy')}
              />
              <CopyRow
                label={t('biz.bankPay.accountNumber')}
                value={instructions.accountNumber}
                onCopy={() => copy(instructions.accountNumber)}
                copyLabel={t('biz.bankPay.copy')}
              />
              <CopyRow
                label={t('biz.bankPay.accountName')}
                value={instructions.accountName}
                onCopy={() => copy(instructions.accountName)}
                copyLabel={t('biz.bankPay.copy')}
              />
              <CopyRow
                label={t('biz.bankPay.amount')}
                value={formatVnd(instructions.amountVnd, lang)}
                onCopy={() => copy(String(Math.round(instructions.amountVnd)))}
                copyLabel={t('biz.bankPay.copy')}
              />
              <CopyRow
                label={t('biz.bankPay.transferContent')}
                value={instructions.transferReferenceCode}
                onCopy={() => copy(instructions.transferReferenceCode)}
                copyLabel={t('biz.bankPay.copy')}
              />
            </View>

            <Text style={styles.warn}>{t('biz.bankPay.contentWarning')}</Text>

            <Text style={styles.section}>{t('biz.bankPay.optionalRef')}</Text>
            <TextInput
              style={styles.input}
              value={payerRef}
              onChangeText={setPayerRef}
              placeholder={t('biz.bankPay.optionalRefPh')}
              placeholderTextColor={Colors.textMuted}
            />

            {waitingConfirm ? (
              <View style={styles.waitBox}>
                <ActivityIndicator color={Colors.primary} />
                <Text style={styles.waitText}>{t('biz.bankPay.waiting')}</Text>
                {instructions.autoConfirmEnabled ? (
                  <Text style={styles.waitSub}>{t('biz.bankPay.waitingAuto')}</Text>
                ) : (
                  <Text style={styles.waitSub}>{t('biz.bankPay.waitingManual')}</Text>
                )}
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.primaryBtn, ackBusy && styles.primaryBtnDisabled]}
                onPress={onAck}
                disabled={ackBusy}
                activeOpacity={0.9}
              >
                {ackBusy ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.primaryBtnText}>{t('biz.bankPay.ackBtn')}</Text>
                )}
              </TouchableOpacity>
            )}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAFAFC' },
  pkg: { fontSize: 16, fontWeight: '900', color: Colors.textDark },
  amount: { fontSize: 28, fontWeight: '900', color: Colors.primary, marginTop: 6, marginBottom: 16 },
  section: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
    marginTop: 8,
  },
  qr: {
    width: '100%',
    maxWidth: 280,
    height: 280,
    alignSelf: 'center',
    borderRadius: 16,
    backgroundColor: Colors.white,
    marginBottom: 16,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EEEAF5',
    gap: 12,
    ...Shadows.soft,
  },
  copyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  copyLabel: { fontSize: 10, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase' },
  copyValue: { fontSize: 14, fontWeight: '800', color: Colors.textDark, marginTop: 2 },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.primaryTint,
  },
  copyBtnText: { fontSize: 11, fontWeight: '800', color: Colors.primary },
  warn: { fontSize: 12, color: '#B45309', marginTop: 12, lineHeight: 18 },
  input: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EBE8F5',
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'web' ? 10 : 12,
    fontSize: 14,
    color: Colors.textDark,
    marginBottom: 16,
  },
  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnDisabled: { opacity: 0.7 },
  primaryBtnText: { color: Colors.white, fontWeight: '900', fontSize: 15 },
  waitBox: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: Colors.primaryTint,
    borderRadius: 14,
    gap: 8,
  },
  waitText: { fontSize: 14, fontWeight: '800', color: Colors.textDark, textAlign: 'center' },
  waitSub: { fontSize: 12, color: Colors.textMuted, textAlign: 'center', lineHeight: 18 },
  errorBox: { backgroundColor: '#FEE2E2', padding: 14, borderRadius: 12, marginBottom: 12 },
  errorText: { fontSize: 12, color: '#B91C1C' },
  retry: { marginTop: 8, fontWeight: '700', color: Colors.primary },
});
