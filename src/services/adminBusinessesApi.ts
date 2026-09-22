import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/apiConfig';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface AdminBusinessItem {
  businessId: string;
  name: string;
  description?: string | null;
  phone?: string | null;
  address?: string | null;
  status: string;
  ownerId: string;
  ownerEmail: string;
  ownerDisplayName?: string | null;
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

function normalizeItem(raw: Record<string, unknown>): AdminBusinessItem {
  return {
    businessId: String(raw.businessId ?? raw.BusinessId ?? ''),
    name: String(raw.name ?? raw.Name ?? ''),
    description: (raw.description ?? raw.Description ?? null) as string | null,
    phone: (raw.phone ?? raw.Phone ?? null) as string | null,
    address: (raw.address ?? raw.Address ?? null) as string | null,
    status: String(raw.status ?? raw.Status ?? ''),
    ownerId: String(raw.ownerId ?? raw.OwnerId ?? ''),
    ownerEmail: String(raw.ownerEmail ?? raw.OwnerEmail ?? ''),
    ownerDisplayName: (raw.ownerDisplayName ?? raw.OwnerDisplayName ?? null) as string | null,
    createdAt: String(raw.createdAt ?? raw.CreatedAt ?? ''),
  };
}

export async function listPendingBusinesses(): Promise<AdminBusinessItem[]> {
  const response = await fetch(`${API_URL}/admin/businesses/pending`, {
    method: 'GET',
    headers: await authHeaders(),
  });
  const rawText = await response.text();
  const data = rawText ? JSON.parse(rawText) : {};
  if (!response.ok) throw new Error(data.message ?? 'Failed to load pending businesses');
  const list = (data.data ?? []) as Record<string, unknown>[];
  return list.map(normalizeItem);
}

export async function approveBusiness(businessId: string): Promise<void> {
  const response = await fetch(`${API_URL}/admin/businesses/${businessId}/approve`, {
    method: 'PUT',
    headers: await authHeaders(),
  });
  const rawText = await response.text();
  const data = rawText ? JSON.parse(rawText) : {};
  if (!response.ok || data.success === false) {
    throw new Error(data.message ?? 'Approve failed');
  }
}

export async function rejectBusiness(businessId: string, reason: string): Promise<void> {
  const response = await fetch(`${API_URL}/admin/businesses/${businessId}/reject`, {
    method: 'PUT',
    headers: await authHeaders(),
    body: JSON.stringify({ reason }),
  });
  const rawText = await response.text();
  const data = rawText ? JSON.parse(rawText) : {};
  if (!response.ok || data.success === false) {
    throw new Error(data.message ?? 'Reject failed');
  }
}
