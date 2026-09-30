import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/apiConfig';
import type { B2bPackageId } from '../constants/b2bPromotionPackages';
import { getPackageById } from '../constants/b2bPromotionPackages';

export type CampaignPaymentStatus = 'Pending' | 'Success' | 'Failed' | 'Refunded';

export interface BusinessAdCampaign {
  campaignId: string;
  businessId: string;
  placeId: string;
  placeName: string;
  packageId: B2bPackageId;
  startDate: string;
  endDate: string;
  amountVnd: number;
  paymentStatus: CampaignPaymentStatus;
  transferReferenceCode: string;
  paymentSubmittedAt: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface CampaignBankTransferInstructions {
  campaignId: string;
  amountVnd: number;
  transferReferenceCode: string;
  bankName: string;
  bankBin: string;
  accountNumber: string;
  accountName: string;
  vietQrImageUrl: string;
  autoConfirmEnabled: boolean;
}

export interface ActiveVibeMapPackage {
  packageId: B2bPackageId | null;
  campaignId: string | null;
  startDate: string | null;
  endDate: string | null;
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

const VALID_PACKAGES = new Set<string>(['starter_spot', 'featured_venue', 'event_boost']);

function normalizePackageId(raw: string): B2bPackageId {
  if (VALID_PACKAGES.has(raw)) return raw as B2bPackageId;
  return 'starter_spot';
}

function normalizePaymentStatus(raw: unknown): CampaignPaymentStatus {
  const s = typeof raw === 'string' ? raw.trim() : raw;
  if (s === 'Success' || s === 1) return 'Success';
  if (s === 'Failed' || s === 2) return 'Failed';
  if (s === 'Refunded' || s === 3) return 'Refunded';
  if (s === 'Pending' || s === 0) return 'Pending';
  return 'Pending';
}

export function campaignNeedsPayment(status: CampaignPaymentStatus): boolean {
  return status !== 'Success' && status !== 'Refunded';
}

function normalizeCampaign(raw: Record<string, unknown>): BusinessAdCampaign {
  return {
    campaignId: String(raw.campaignId ?? raw.CampaignId ?? ''),
    businessId: String(raw.businessId ?? raw.BusinessId ?? ''),
    placeId: String(raw.placeId ?? raw.PlaceId ?? ''),
    placeName: String(raw.placeName ?? raw.PlaceName ?? ''),
    packageId: normalizePackageId(String(raw.packageId ?? raw.PackageId ?? '')),
    startDate: String(raw.startDate ?? raw.StartDate ?? ''),
    endDate: String(raw.endDate ?? raw.EndDate ?? ''),
    amountVnd: Number(raw.amountVnd ?? raw.AmountVnd ?? 0),
    paymentStatus: normalizePaymentStatus(raw.paymentStatus ?? raw.PaymentStatus),
    transferReferenceCode: String(raw.transferReferenceCode ?? raw.TransferReferenceCode ?? ''),
    paymentSubmittedAt: (raw.paymentSubmittedAt ?? raw.PaymentSubmittedAt ?? null) as string | null,
    paidAt: (raw.paidAt ?? raw.PaidAt ?? null) as string | null,
    createdAt: String(raw.createdAt ?? raw.CreatedAt ?? ''),
  };
}

export function campaignPackageNameKey(campaign: BusinessAdCampaign): string {
  return getPackageById(campaign.packageId).nameKey;
}

export function formatCampaignPeriod(startDate: string, endDate: string): string {
  const s = startDate.slice(0, 10);
  const e = endDate.slice(0, 10);
  return `${s} → ${e}`;
}

export type CampaignRunStatus = 'awaiting_payment' | 'scheduled' | 'active' | 'completed';

export function deriveCampaignRunStatus(campaign: BusinessAdCampaign): CampaignRunStatus {
  if (campaignNeedsPayment(campaign.paymentStatus)) return 'awaiting_payment';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(campaign.startDate.slice(0, 10));
  const end = new Date(campaign.endDate.slice(0, 10));
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 'scheduled';
  if (today < start) return 'scheduled';
  if (today > end) return 'completed';
  return 'active';
}

/** Chiến dịch đã thanh toán đang trong khoảng ngày; không trả về đơn chưa trả. */
export function pickCampaignForDashboard(campaigns: BusinessAdCampaign[]): BusinessAdCampaign | null {
  const paid = campaigns.filter(c => c.paymentStatus === 'Success');
  if (!paid.length) return null;
  const sorted = [...paid].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const inRange = sorted.find(c => {
    const start = new Date(c.startDate.slice(0, 10));
    const end = new Date(c.endDate.slice(0, 10));
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    return start <= today && end >= today;
  });
  return inRange ?? sorted[0]!;
}

export function resolveDashboardCampaign(
  campaigns: BusinessAdCampaign[],
  activePackage: ActiveVibeMapPackage | null,
): BusinessAdCampaign | null {
  if (activePackage?.campaignId) {
    const match = campaigns.find(c => c.campaignId === activePackage.campaignId);
    if (match && match.paymentStatus === 'Success') return match;
  }
  return pickCampaignForDashboard(campaigns);
}

export async function listMyCampaigns(): Promise<BusinessAdCampaign[]> {
  const res = await requestJson<Record<string, unknown>[]>('/business/campaigns', 'GET');
  return (res.data ?? []).map(item => normalizeCampaign(item as Record<string, unknown>));
}

export async function listBillingCampaigns(): Promise<BusinessAdCampaign[]> {
  const res = await requestJson<Record<string, unknown>[]>('/business/billing', 'GET');
  return (res.data ?? []).map(item => normalizeCampaign(item as Record<string, unknown>));
}

export async function getActiveVibeMapPackage(): Promise<ActiveVibeMapPackage> {
  const res = await requestJson<Record<string, unknown>>('/business/campaigns/active-package', 'GET');
  const raw = res.data ?? {};
  const pkg = raw.packageId ?? raw.PackageId;
  return {
    packageId: pkg ? normalizePackageId(String(pkg)) : null,
    campaignId: (raw.campaignId ?? raw.CampaignId ?? null) as string | null,
    startDate: (raw.startDate ?? raw.StartDate ?? null) as string | null,
    endDate: (raw.endDate ?? raw.EndDate ?? null) as string | null,
  };
}

export async function createAdCampaign(payload: {
  placeId: string;
  packageId: B2bPackageId;
  startDate: string;
  endDate: string;
}): Promise<BusinessAdCampaign> {
  const res = await requestJson<Record<string, unknown>>('/business/campaigns', 'POST', {
    placeId: payload.placeId,
    packageId: payload.packageId,
    startDate: `${payload.startDate}T00:00:00.000Z`,
    endDate: `${payload.endDate}T00:00:00.000Z`,
  });
  return normalizeCampaign((res.data ?? {}) as Record<string, unknown>);
}

export async function completeCampaignPayment(campaignId: string): Promise<BusinessAdCampaign> {
  const res = await requestJson<Record<string, unknown>>(
    `/business/campaigns/${campaignId}/complete-payment`,
    'PUT',
  );
  return normalizeCampaign((res.data ?? {}) as Record<string, unknown>);
}

function normalizeBankInstructions(raw: Record<string, unknown>): CampaignBankTransferInstructions {
  return {
    campaignId: String(raw.campaignId ?? raw.CampaignId ?? ''),
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

export async function getCampaignBankTransferInstructions(
  campaignId: string,
): Promise<CampaignBankTransferInstructions> {
  const res = await requestJson<Record<string, unknown>>(
    `/business/campaigns/${campaignId}/bank-transfer`,
    'GET',
  );
  return normalizeBankInstructions((res.data ?? {}) as Record<string, unknown>);
}

export async function acknowledgeCampaignBankTransfer(
  campaignId: string,
  payerDeclaredReference?: string,
): Promise<BusinessAdCampaign> {
  const res = await requestJson<Record<string, unknown>>(
    `/business/campaigns/${campaignId}/bank-transfer/ack`,
    'POST',
    { payerDeclaredReference: payerDeclaredReference?.trim() || undefined },
  );
  return normalizeCampaign((res.data ?? {}) as Record<string, unknown>);
}

export async function getCampaignPaymentStatus(campaignId: string): Promise<BusinessAdCampaign | null> {
  const list = await listBillingCampaigns();
  return list.find(c => c.campaignId === campaignId) ?? null;
}
