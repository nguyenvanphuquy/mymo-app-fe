import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/apiConfig';

export type AdminServerOverview = {
  bankTransfer: AdminBankSettings;
  jwt: {
    issuer: string;
    audience: string;
    accessTokenExpirationMinutes: number;
    refreshTokenExpirationDays: number;
  };
  integrations: {
    cloudinaryConfigured: boolean;
    geminiConfigured: boolean;
    weatherConfigured: boolean;
  };
};

export type AdminBankSettings = {
  bankName: string;
  bankBin: string;
  accountNumberMasked: string;
  accountName: string;
  sepayConfigured: boolean;
  allowManualConfirm: boolean;
};

async function authHeaders(): Promise<Record<string, string>> {
  const token = await AsyncStorage.getItem('mymo.accessToken');
  const headers: Record<string, string> = { Accept: '*/*' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export async function fetchAdminServerOverview(): Promise<AdminServerOverview> {
  const response = await fetch(`${API_URL}/admin/settings/overview`, {
    method: 'GET',
    headers: await authHeaders(),
  });
  const rawText = await response.text();
  const data = rawText ? JSON.parse(rawText) : {};
  if (!response.ok) throw new Error(data.message ?? data.Message ?? 'Failed to load settings');

  const p = (data.data ?? data.Data ?? {}) as Record<string, unknown>;
  const bank = (p.bankTransfer ?? p.BankTransfer ?? {}) as Record<string, unknown>;
  const jwt = (p.jwt ?? p.Jwt ?? {}) as Record<string, unknown>;
  const integrations = (p.integrations ?? p.Integrations ?? {}) as Record<string, unknown>;

  return {
    bankTransfer: normalizeBank(bank),
    jwt: {
      issuer: String(jwt.issuer ?? jwt.Issuer ?? ''),
      audience: String(jwt.audience ?? jwt.Audience ?? ''),
      accessTokenExpirationMinutes: Number(jwt.accessTokenExpirationMinutes ?? jwt.AccessTokenExpirationMinutes ?? 0),
      refreshTokenExpirationDays: Number(jwt.refreshTokenExpirationDays ?? jwt.RefreshTokenExpirationDays ?? 0),
    },
    integrations: {
      cloudinaryConfigured: Boolean(integrations.cloudinaryConfigured ?? integrations.CloudinaryConfigured),
      geminiConfigured: Boolean(integrations.geminiConfigured ?? integrations.GeminiConfigured),
      weatherConfigured: Boolean(integrations.weatherConfigured ?? integrations.WeatherConfigured),
    },
  };
}

function normalizeBank(p: Record<string, unknown>): AdminBankSettings {
  return {
    bankName: String(p.bankName ?? p.BankName ?? ''),
    bankBin: String(p.bankBin ?? p.BankBin ?? ''),
    accountNumberMasked: String(p.accountNumberMasked ?? p.AccountNumberMasked ?? ''),
    accountName: String(p.accountName ?? p.AccountName ?? ''),
    sepayConfigured: Boolean(p.sepayConfigured ?? p.SepayConfigured ?? false),
    allowManualConfirm: Boolean(p.allowManualConfirm ?? p.AllowManualConfirm ?? false),
  };
}

export async function fetchAdminBankSettings(): Promise<AdminBankSettings> {
  const response = await fetch(`${API_URL}/admin/settings/bank-transfer`, {
    method: 'GET',
    headers: await authHeaders(),
  });
  const rawText = await response.text();
  const data = rawText ? JSON.parse(rawText) : {};
  if (!response.ok) throw new Error(data.message ?? data.Message ?? 'Failed to load settings');

  const p = (data.data ?? data.Data ?? {}) as Record<string, unknown>;
  return normalizeBank(p);
}
