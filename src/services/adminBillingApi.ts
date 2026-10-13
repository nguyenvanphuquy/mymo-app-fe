import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/apiConfig';

export type AdminPaymentStatus = 'Pending' | 'Success' | 'Failed' | 'Refunded';
export type AdminProductSegment = 'B2C' | 'B2B';

export type AdminProductPackage = {
  productPackageId: string;
  segment: AdminProductSegment;
  code: string;
  displayName: string | null;
  priceVnd: number;
  durationDays: number | null;
  billingUnit: 'campaign' | 'day' | null;
  isActive: boolean;
  sortOrder: number;
};

export type AdminPackageCatalog = {
  packages: AdminProductPackage[];
};

export type UpdateAdminProductPackagePayload = {
  priceVnd: number;
  durationDays?: number | null;
  displayName?: string | null;
  isActive: boolean;
};

export type CreateAdminProductPackagePayload = {
  segment: AdminProductSegment;
  code: string;
  displayName?: string | null;
  priceVnd: number;
  durationDays?: number | null;
  billingUnit?: 'campaign' | 'day' | null;
  isActive: boolean;
  sortOrder: number;
};

export type AdminPaymentKind = 'premium' | 'campaign';

export type AdminPaymentItem = {
  kind: AdminPaymentKind;
  id: string;
  productId: string;
  amountVnd: number;
  paymentStatus: AdminPaymentStatus;
  transferReferenceCode: string;
  payerDeclaredReference: string | null;
  bankTransactionId: string | null;
  paymentSubmittedAt: string | null;
  paidAt: string | null;
  createdAt: string;
  payerUserId: string;
  payerEmail: string | null;
  payerDisplayName: string | null;
  businessId: string | null;
  businessName: string | null;
  placeId: string | null;
  placeName: string | null;
  campaignStartDate: string | null;
  campaignEndDate: string | null;
};

/** Parses admin price input (supports 39000, 39.000, 1.500.000). */
export function parseAdminVndInput(raw: string): number {
  const s = raw.trim().replace(/\s/g, '');
  if (!s) return NaN;
  if (/^\d{1,3}(\.\d{3})+($|,?\d*)$/.test(s) || /^\d+(\.\d{3})+$/.test(s)) {
    const [whole, frac] = s.split(',');
    const base = Number(whole.replace(/\./g, ''));
    if (!Number.isFinite(base)) return NaN;
    if (frac != null && frac !== '') return base + Number(`0.${frac}`);
    return base;
  }
  const normalized = s.replace(/\./g, '').replace(/,/g, '');
  return Number(normalized);
}

export function isValidProductPackageId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim());
}

function unwrapApi<T>(data: Record<string, unknown>): { ok: boolean; message: string; payload: T | null } {
  const success = Boolean(data.success ?? data.Success);
  const message = String(data.message ?? data.Message ?? '');
  const payload = (data.data ?? data.Data ?? null) as T | null;
  return { ok: success, message, payload };
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

function numberFrom(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string' && raw.trim() !== '' && Number.isFinite(Number(raw))) return Number(raw);
  return 0;
}

function normalizePaymentStatus(raw: unknown): AdminPaymentStatus {
  const s = String(raw ?? 'Pending');
  if (s === 'Success' || s === 'Failed' || s === 'Refunded' || s === 'Pending') return s;
  return 'Pending';
}

function normalizeKind(raw: unknown): AdminPaymentKind {
  return String(raw).toLowerCase() === 'campaign' ? 'campaign' : 'premium';
}

function normalizeSegment(raw: unknown): AdminProductSegment {
  return String(raw).toUpperCase() === 'B2B' ? 'B2B' : 'B2C';
}

function normalizeProductPackage(raw: Record<string, unknown>): AdminProductPackage {
  const unitRaw = raw.billingUnit ?? raw.BillingUnit;
  const unit = unitRaw != null ? String(unitRaw) : null;
  return {
    productPackageId: String(raw.productPackageId ?? raw.ProductPackageId ?? ''),
    segment: normalizeSegment(raw.segment ?? raw.Segment),
    code: String(raw.code ?? raw.Code ?? ''),
    displayName: (raw.displayName ?? raw.DisplayName ?? null) as string | null,
    priceVnd: numberFrom(raw.priceVnd ?? raw.PriceVnd),
    durationDays: raw.durationDays != null || raw.DurationDays != null
      ? numberFrom(raw.durationDays ?? raw.DurationDays)
      : null,
    billingUnit: unit === 'day' ? 'day' : unit === 'campaign' ? 'campaign' : null,
    isActive: Boolean(raw.isActive ?? raw.IsActive ?? true),
    sortOrder: numberFrom(raw.sortOrder ?? raw.SortOrder),
  };
}

function normalizePayment(raw: Record<string, unknown>): AdminPaymentItem {
  return {
    kind: normalizeKind(raw.kind ?? raw.Kind),
    id: String(raw.id ?? raw.Id ?? ''),
    productId: String(raw.productId ?? raw.ProductId ?? ''),
    amountVnd: numberFrom(raw.amountVnd ?? raw.AmountVnd),
    paymentStatus: normalizePaymentStatus(raw.paymentStatus ?? raw.PaymentStatus),
    transferReferenceCode: String(raw.transferReferenceCode ?? raw.TransferReferenceCode ?? ''),
    payerDeclaredReference: (raw.payerDeclaredReference ?? raw.PayerDeclaredReference ?? null) as string | null,
    bankTransactionId: (raw.bankTransactionId ?? raw.BankTransactionId ?? null) as string | null,
    paymentSubmittedAt: (raw.paymentSubmittedAt ?? raw.PaymentSubmittedAt ?? null) as string | null,
    paidAt: (raw.paidAt ?? raw.PaidAt ?? null) as string | null,
    createdAt: String(raw.createdAt ?? raw.CreatedAt ?? ''),
    payerUserId: String(raw.payerUserId ?? raw.PayerUserId ?? ''),
    payerEmail: (raw.payerEmail ?? raw.PayerEmail ?? null) as string | null,
    payerDisplayName: (raw.payerDisplayName ?? raw.PayerDisplayName ?? null) as string | null,
    businessId: raw.businessId != null || raw.BusinessId != null
      ? String(raw.businessId ?? raw.BusinessId)
      : null,
    businessName: (raw.businessName ?? raw.BusinessName ?? null) as string | null,
    placeId: raw.placeId != null || raw.PlaceId != null
      ? String(raw.placeId ?? raw.PlaceId)
      : null,
    placeName: (raw.placeName ?? raw.PlaceName ?? null) as string | null,
    campaignStartDate: (raw.campaignStartDate ?? raw.CampaignStartDate ?? null) as string | null,
    campaignEndDate: (raw.campaignEndDate ?? raw.CampaignEndDate ?? null) as string | null,
  };
}

export async function fetchAdminPackageCatalog(): Promise<AdminPackageCatalog> {
  const response = await fetch(`${API_URL}/admin/billing/packages`, {
    method: 'GET',
    headers: await authHeaders(),
  });
  const rawText = await response.text();
  const data = rawText ? JSON.parse(rawText) : {};
  if (!response.ok) throw new Error(data.message ?? 'Failed to load packages');
  const payload = (data.data ?? {}) as Record<string, unknown>;
  const packagesRaw = (payload.packages ?? payload.Packages ?? []) as Record<string, unknown>[];
  if (packagesRaw.length > 0) {
    return { packages: packagesRaw.map(normalizeProductPackage) };
  }
  const premiumRaw = (payload.premiumPlans ?? payload.PremiumPlans ?? []) as Record<string, unknown>[];
  const vibeRaw = (payload.vibeMapPackages ?? payload.VibeMapPackages ?? []) as Record<string, unknown>[];
  const legacy: AdminProductPackage[] = [
    ...premiumRaw.map(p => ({
      productPackageId: String(p.productPackageId ?? p.ProductPackageId ?? ''),
      segment: 'B2C' as const,
      code: String(p.planId ?? p.PlanId ?? ''),
      displayName: (p.displayName ?? p.DisplayName ?? null) as string | null,
      priceVnd: numberFrom(p.priceVnd ?? p.PriceVnd),
      durationDays: numberFrom(p.durationDays ?? p.DurationDays),
      billingUnit: null,
      isActive: Boolean(p.isActive ?? p.IsActive ?? true),
      sortOrder: 0,
    })),
    ...vibeRaw.map(p => ({
      productPackageId: String(p.productPackageId ?? p.ProductPackageId ?? ''),
      segment: 'B2B' as const,
      code: String(p.packageId ?? p.PackageId ?? ''),
      displayName: (p.displayName ?? p.DisplayName ?? null) as string | null,
      priceVnd: numberFrom(p.basePriceVnd ?? p.BasePriceVnd),
      durationDays: null,
      billingUnit: (String(p.billingUnit ?? p.BillingUnit ?? 'campaign') === 'day' ? 'day' : 'campaign') as 'day' | 'campaign',
      isActive: Boolean(p.isActive ?? p.IsActive ?? true),
      sortOrder: 0,
    })),
  ];
  return { packages: legacy };
}

export async function createAdminProductPackage(
  payload: CreateAdminProductPackagePayload,
): Promise<AdminProductPackage> {
  const response = await fetch(`${API_URL}/admin/billing/packages`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({
      segment: payload.segment,
      code: payload.code.trim(),
      displayName: payload.displayName ?? null,
      priceVnd: payload.priceVnd,
      durationDays: payload.durationDays ?? null,
      billingUnit: payload.billingUnit ?? null,
      isActive: payload.isActive,
      sortOrder: payload.sortOrder,
    }),
  });
  const rawText = await response.text();
  const data = (rawText ? JSON.parse(rawText) : {}) as Record<string, unknown>;
  const { ok, message, payload: created } = unwrapApi<Record<string, unknown>>(data);
  if (!response.ok || !ok || !created) throw new Error(message || 'Failed to create package');
  return normalizeProductPackage(created);
}

export async function deleteAdminProductPackage(productPackageId: string): Promise<void> {
  if (!isValidProductPackageId(productPackageId)) {
    throw new Error('Invalid package id');
  }
  const response = await fetch(`${API_URL}/admin/billing/packages/${encodeURIComponent(productPackageId)}`, {
    method: 'DELETE',
    headers: await authHeaders(),
  });
  const rawText = await response.text();
  const data = rawText ? JSON.parse(rawText) : {};
  if (!response.ok || data.success === false) {
    throw new Error(data.message ?? 'Failed to delete package');
  }
}

export async function updateAdminProductPackage(
  productPackageId: string,
  payload: UpdateAdminProductPackagePayload,
): Promise<AdminProductPackage> {
  if (!isValidProductPackageId(productPackageId)) {
    throw new Error('Invalid package id — reload the admin page and sign in via backend.');
  }
  const response = await fetch(`${API_URL}/admin/billing/packages/${encodeURIComponent(productPackageId)}`, {
    method: 'PUT',
    headers: await authHeaders(),
    body: JSON.stringify({
      priceVnd: payload.priceVnd,
      durationDays: payload.durationDays ?? null,
      displayName: payload.displayName ?? null,
      isActive: payload.isActive,
    }),
  });
  const rawText = await response.text();
  const data = (rawText ? JSON.parse(rawText) : {}) as Record<string, unknown>;
  const { ok, message, payload: updated } = unwrapApi<Record<string, unknown>>(data);
  if (!response.ok || !ok) {
    throw new Error(message || 'Failed to update package');
  }
  if (!updated) {
    throw new Error(message || 'Empty response from server');
  }
  return normalizeProductPackage(updated);
}

export async function listAdminPayments(status?: AdminPaymentStatus): Promise<AdminPaymentItem[]> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  const response = await fetch(`${API_URL}/admin/billing/payments${qs}`, {
    method: 'GET',
    headers: await authHeaders(),
  });
  const rawText = await response.text();
  const data = rawText ? JSON.parse(rawText) : {};
  if (!response.ok) throw new Error(data.message ?? 'Failed to load payments');
  const list = (data.data ?? []) as Record<string, unknown>[];
  return list.map(normalizePayment);
}

export async function confirmAdminPremiumPayment(orderId: string): Promise<void> {
  const response = await fetch(`${API_URL}/admin/billing/premium-orders/${orderId}/confirm`, {
    method: 'PUT',
    headers: await authHeaders(),
  });
  const rawText = await response.text();
  const data = rawText ? JSON.parse(rawText) : {};
  if (!response.ok || data.success === false) {
    throw new Error(data.message ?? 'Confirm payment failed');
  }
}

export async function confirmAdminCampaignPayment(campaignId: string): Promise<void> {
  const response = await fetch(`${API_URL}/admin/billing/campaigns/${campaignId}/confirm`, {
    method: 'PUT',
    headers: await authHeaders(),
  });
  const rawText = await response.text();
  const data = rawText ? JSON.parse(rawText) : {};
  if (!response.ok || data.success === false) {
    throw new Error(data.message ?? 'Confirm payment failed');
  }
}
