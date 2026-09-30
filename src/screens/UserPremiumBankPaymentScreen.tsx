import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Image, TextInput, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../constants/colors';
import { useI18n } from '../i18n';
import {
  acknowledgePremiumBankTransfer,
  getPremiumBankTransferInstructions,
  getPremiumOrder,
  premiumOrderNeedsPayment,
  premiumPlanNameKey,
  type PremiumBankTransferInstructions,
  type UserPremiumOrder,
} from '../services/userPremiumApi';

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

export default function UserPremiumBankPaymentScreen({
  order,
  onBack,
  onPaid,
}: {
  order: UserPremiumOrder;
  onBack: () => void;
  onPaid: (updated: UserPremiumOrder) => void;
}) {
  const { t, lang } = useI18n();
  const insets = useSafeAreaInsets();
  const [instructions, setInstructions] = useState<PremiumBankTransferInstructions | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [payerRef, setPayerRef] = useState('');
  const [ackBusy, setAckBusy] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingPay = premiumOrderNeedsPayment(order.paymentStatus);

  const loadInstructions = useCallback(async () => {
    setLoadError(null);
    setLoading(true);
    try {
      setInstructions(await getPremiumBankTransferInstructions(order.orderId));
    } catch (err) {
      setInstructions(null);
      setLoadError(err instanceof Error ? err.message : t('premium.bankPay.loadError'));
    } finally {
      setLoading(false);
    }
  }, [order.orderId, t]);

  useEffect(() => { loadInstructions(); }, [loadInstructions]);

  const stopPoll = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const checkPaymentOnce = useCallback(async () => {
    const fresh = await getPremiumOrder(order.orderId);
    if (!premiumOrderNeedsPayment(fresh.paymentStatus)) {
      stopPoll();
      Toast.show({ type: 'success', text1: t('premium.welcome'), text2: t('premium.welcomeDesc') });
      onPaid(fresh);
      return true;
    }
    return false;
  }, [order.orderId, onPaid, t]);

  const startPoll = useCallback(() => {
    stopPoll();
    void checkPaymentOnce();
    pollRef.current = setInterval(() => {
      void checkPaymentOnce();
    }, 5000);
  }, [checkPaymentOnce]);

  useEffect(() => {
    if (pendingPay) startPoll();
    return stopPoll;
  }, [pendingPay, startPoll]);

  const copy = async (text: string) => {
    await Clipboard.setStringAsync(text);
    Toast.show({ type: 'info', text1: t('biz.bankPay.copied') });
  };

  const onSubmitSupportRef = async () => {
    setAckBusy(true);
    try {
      await acknowledgePremiumBankTransfer(order.orderId, payerRef);
      Toast.show({ type: 'success', text1: t('biz.bankPay.supportSent') });
    } catch (err) {
      Toast.show({ type: 'error', text1: err instanceof Error ? err.message : t('biz.bankPay.ackError') });
    } finally {
      setAckBusy(false);
    }
  };

  const amount = instructions?.amountVnd ?? order.amountVnd;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.85}>
          <Ionicons name="arrow-back" size={20} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('premium.bankPay.title')}</Text>
        <View style={styles.backBtn} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
        <Text style={styles.pkg}>{t(premiumPlanNameKey(order.planId))}</Text>
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
              <Image source={{ uri: instructions.vietQrImageUrl }} style={styles.qr} resizeMode="contain" />
            ) : null}

            <View style={styles.card}>
              <CopyRow label={t('biz.bankPay.bank')} value={instructions.bankName} onCopy={() => copy(instructions.bankName)} copyLabel={t('biz.bankPay.copy')} />
              <CopyRow label={t('biz.bankPay.accountNumber')} value={instructions.accountNumber} onCopy={() => copy(instructions.accountNumber)} copyLabel={t('biz.bankPay.copy')} />
              <CopyRow label={t('biz.bankPay.accountName')} value={instructions.accountName} onCopy={() => copy(instructions.accountName)} copyLabel={t('biz.bankPay.copy')} />
              <CopyRow label={t('biz.bankPay.amount')} value={formatVnd(instructions.amountVnd, lang)} onCopy={() => copy(String(Math.round(instructions.amountVnd)))} copyLabel={t('biz.bankPay.copy')} />
              <CopyRow label={t('biz.bankPay.transferContent')} value={instructions.transferReferenceCode} onCopy={() => copy(instructions.transferReferenceCode)} copyLabel={t('biz.bankPay.copy')} />
            </View>

            <Text style={styles.warn}>{t('biz.bankPay.contentWarning')}</Text>

            {pendingPay ? (
              <View style={styles.waitBox}>
                <ActivityIndicator color={Colors.primary} />
                <Text style={styles.waitText}>{t('biz.bankPay.autoFlowTitle')}</Text>
                <Text style={styles.waitSub}>
                  {instructions.autoConfirmEnabled ? t('biz.bankPay.autoFlowSub') : t('biz.bankPay.autoFlowSubNoWebhook')}
                </Text>
                <TouchableOpacity style={styles.refreshBtn} onPress={() => { void checkPaymentOnce(); }} activeOpacity={0.85}>
                  <Text style={styles.refreshBtnText}>{t('biz.bankPay.checkNow')}</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <TouchableOpacity onPress={() => setShowSupport(v => !v)} style={styles.supportToggle}>
              <Text style={styles.supportToggleText}>
                {showSupport ? t('biz.bankPay.hideSupport') : t('biz.bankPay.showSupport')}
              </Text>
            </TouchableOpacity>

            {showSupport ? (
              <>
                <Text style={styles.section}>{t('biz.bankPay.optionalRef')}</Text>
                <Text style={styles.optionalHint}>{t('biz.bankPay.optionalRefHint')}</Text>
                <TextInput
                  style={styles.input}
                  value={payerRef}
                  onChangeText={setPayerRef}
                  placeholder={t('biz.bankPay.optionalRefPh')}
                  placeholderTextColor={Colors.textMuted}
                />
                <TouchableOpacity
                  style={[styles.secondaryBtn, ackBusy && styles.primaryBtnDisabled]}
                  onPress={onSubmitSupportRef}
                  disabled={ackBusy || !payerRef.trim()}
                >
                  <Text style={styles.secondaryBtnText}>{t('biz.bankPay.sendSupportRef')}</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAFAFC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.soft,
  },
  headerTitle: { fontSize: 16, fontWeight: '900', color: Colors.textDark },
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
  primaryBtnDisabled: { opacity: 0.7 },
  waitBox: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: Colors.primaryTint,
    borderRadius: 14,
    gap: 8,
  },
  waitText: { fontSize: 14, fontWeight: '800', color: Colors.textDark, textAlign: 'center' },
  waitSub: { fontSize: 12, color: Colors.textMuted, textAlign: 'center', lineHeight: 18 },
  refreshBtn: { marginTop: 8, paddingVertical: 8, paddingHorizontal: 16 },
  refreshBtnText: { fontSize: 13, fontWeight: '800', color: Colors.primary },
  supportToggle: { marginTop: 16, alignItems: 'center' },
  supportToggleText: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textDecorationLine: 'underline' },
  optionalHint: { fontSize: 11, color: Colors.textMuted, marginBottom: 8, lineHeight: 16 },
  secondaryBtn: {
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
    marginBottom: 8,
  },
  secondaryBtnText: { color: Colors.primary, fontWeight: '800', fontSize: 14 },
  errorBox: { backgroundColor: '#FEE2E2', padding: 14, borderRadius: 12, marginBottom: 12 },
  errorText: { fontSize: 12, color: '#B91C1C' },
  retry: { marginTop: 8, fontWeight: '700', color: Colors.primary },
});
