import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/apiConfig';
import type { PremiumPlanId } from '../utils/premiumStorage';

export type PremiumPaymentStatus = 'Pending' | 'Success' | 'Failed' | 'Refunded';

export interface UserPremiumOrder {
  orderId: string;
  planId: 'monthly' | 'yearly';
  amountVnd: number;
  paymentStatus: PremiumPaymentStatus;
  transferReferenceCode: string;
  paymentSubmittedAt: string | null;
  paidAt: string | null;
  validFrom: string | null;
  validUntil: string | null;
  createdAt: string;
}

export interface UserPremiumStatus {
  activePlanId: PremiumPlanId;
  validUntil: string | null;
  pendingOrderId: string | null;
}

export interface PremiumBankTransferInstructions {
  orderId: string;
  amountVnd: number;
  transferReferenceCode: string;
  bankName: string;
  bankBin: string;
  accountNumber: string;
  accountName: string;
  vietQrImageUrl: string;
  autoConfirmEnabled: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await AsyncStorage.getItem('mymo.accessToken');
  const headers: Record<string, string> = {
    Accept: '*/*',
    'Content-Type': 'application/json',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function requestJson<T>(path: string, method: string, body?: unknown): Promise<ApiResponse<T>> {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: await authHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  const rawText = await response.text();
  const data = rawText ? JSON.parse(rawText) : {};
  if (!response.ok) {
    throw new Error(data?.message ?? 'Request failed');
  }
  if (data.success === false) {
    throw new Error(data.message ?? 'Request failed');
  }
  return data as ApiResponse<T>;
}

function normalizePaymentStatus(raw: unknown): PremiumPaymentStatus {
  const s = typeof raw === 'string' ? raw.trim() : raw;
  if (s === 'Success' || s === 1) return 'Success';
  if (s === 'Failed' || s === 2) return 'Failed';
  if (s === 'Refunded' || s === 3) return 'Refunded';
  return 'Pending';
}

function normalizePlanId(raw: string): 'monthly' | 'yearly' {
  return raw === 'yearly' ? 'yearly' : 'monthly';
}

function normalizeOrder(raw: Record<string, unknown>): UserPremiumOrder {
  return {
    orderId: String(raw.orderId ?? raw.OrderId ?? ''),
    planId: normalizePlanId(String(raw.planId ?? raw.PlanId ?? 'monthly')),
    amountVnd: Number(raw.amountVnd ?? raw.AmountVnd ?? 0),
    paymentStatus: normalizePaymentStatus(raw.paymentStatus ?? raw.PaymentStatus),
    transferReferenceCode: String(raw.transferReferenceCode ?? raw.TransferReferenceCode ?? ''),
    paymentSubmittedAt: (raw.paymentSubmittedAt ?? raw.PaymentSubmittedAt ?? null) as string | null,
    paidAt: (raw.paidAt ?? raw.PaidAt ?? null) as string | null,
    validFrom: (raw.validFrom ?? raw.ValidFrom ?? null) as string | null,
    validUntil: (raw.validUntil ?? raw.ValidUntil ?? null) as string | null,
    createdAt: String(raw.createdAt ?? raw.CreatedAt ?? ''),
  };
}

export function premiumOrderNeedsPayment(status: PremiumPaymentStatus): boolean {
  return status !== 'Success' && status !== 'Refunded';
}

export async function getPremiumStatus(): Promise<UserPremiumStatus> {
  const res = await requestJson<Record<string, unknown>>('/users/premium/status', 'GET');
  const raw = res.data ?? {};
  const plan = String(raw.activePlanId ?? raw.ActivePlanId ?? 'free');
  const activePlanId: PremiumPlanId =
    plan === 'monthly' || plan === 'yearly' ? plan : 'free';
  return {
    activePlanId,
    validUntil: (raw.validUntil ?? raw.ValidUntil ?? null) as string | null,
    pendingOrderId: (raw.pendingOrderId ?? raw.PendingOrderId ?? null) as string | null,
  };
}

export async function createPremiumOrder(planId: 'monthly' | 'yearly'): Promise<UserPremiumOrder> {
  const res = await requestJson<Record<string, unknown>>('/users/premium/orders', 'POST', { planId });
  return normalizeOrder((res.data ?? {}) as Record<string, unknown>);
}

export async function getPremiumOrder(orderId: string): Promise<UserPremiumOrder> {
  const res = await requestJson<Record<string, unknown>>(`/users/premium/orders/${orderId}`, 'GET');
  return normalizeOrder((res.data ?? {}) as Record<string, unknown>);
}

function normalizeBankInstructions(raw: Record<string, unknown>): PremiumBankTransferInstructions {
  return {
    orderId: String(raw.orderId ?? raw.OrderId ?? ''),
    amountVnd: Number(raw.amountVnd ?? raw.AmountVnd ?? 0),
    transferReferenceCode: String(raw.transferReferenceCode ?? raw.TransferReferenceCode ?? ''),
    bankName: String(raw.bankName ?? raw.BankName ?? ''),
    bankBin: String(raw.bankBin ?? raw.BankBin ?? ''),
    accountNumber: String(raw.accountNumber ?? raw.AccountNumber ?? ''),
    accountName: String(raw.accountName ?? raw.AccountName ?? ''),
    vietQrImageUrl: String(raw.vietQrImageUrl ?? raw.VietQrImageUrl ?? ''),
    autoConfirmEnabled: Boolean(raw.autoConfirmEnabled ?? raw.AutoConfirmEnabled ?? false),
  };
}

export async function getPremiumBankTransferInstructions(orderId: string): Promise<PremiumBankTransferInstructions> {
  const res = await requestJson<Record<string, unknown>>(
    `/users/premium/orders/${orderId}/bank-transfer`,
    'GET',
  );
  return normalizeBankInstructions((res.data ?? {}) as Record<string, unknown>);
}

export async function acknowledgePremiumBankTransfer(
  orderId: string,
  payerDeclaredReference?: string,
): Promise<UserPremiumOrder> {
  const res = await requestJson<Record<string, unknown>>(
    `/users/premium/orders/${orderId}/bank-transfer/ack`,
    'POST',
    { payerDeclaredReference: payerDeclaredReference?.trim() || undefined },
  );
  return normalizeOrder((res.data ?? {}) as Record<string, unknown>);
}

export function premiumPlanNameKey(planId: 'monthly' | 'yearly'): string {
  return planId === 'monthly' ? 'premium.plan.monthly' : 'premium.plan.yearly';
}
