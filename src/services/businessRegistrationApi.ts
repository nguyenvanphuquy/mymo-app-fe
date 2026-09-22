import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/apiConfig';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface BusinessRegistrationDto {
  businessId: string;
  name: string;
  description?: string | null;
  phone?: string | null;
  address?: string | null;
  status: string;
  rejectReason?: string | null;
  createdAt: string;
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

function normalize(raw: Record<string, unknown>): BusinessRegistrationDto {
  return {
    businessId: String(raw.businessId ?? raw.BusinessId ?? ''),
    name: String(raw.name ?? raw.Name ?? ''),
    description: (raw.description ?? raw.Description ?? null) as string | null,
    phone: (raw.phone ?? raw.Phone ?? null) as string | null,
    address: (raw.address ?? raw.Address ?? null) as string | null,
    status: String(raw.status ?? raw.Status ?? ''),
    rejectReason: (raw.rejectReason ?? raw.RejectReason ?? null) as string | null,
    createdAt: String(raw.createdAt ?? raw.CreatedAt ?? ''),
  };
}

export async function registerBusiness(payload: {
  businessName: string;
  description?: string;
  phone?: string;
  address: string;
}): Promise<BusinessRegistrationDto> {
  const response = await fetch(`${API_URL}/business/register`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  });
  const rawText = await response.text();
  const data = rawText ? JSON.parse(rawText) : {};
  if (!response.ok || data.success === false) {
    throw new Error(data.message ?? `Register failed (${response.status})`);
  }
  return normalize(data.data ?? {});
}

export async function getMyBusinessRegistration(): Promise<BusinessRegistrationDto | null> {
  const response = await fetch(`${API_URL}/business/registration`, {
    method: 'GET',
    headers: await authHeaders(),
  });
  if (response.status === 404) return null;
  const rawText = await response.text();
  const data = rawText ? JSON.parse(rawText) : {};
  if (!response.ok) {
    throw new Error(data.message ?? `Load registration failed (${response.status})`);
  }
  return normalize(data.data ?? {});
}
