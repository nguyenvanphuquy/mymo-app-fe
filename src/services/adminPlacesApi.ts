import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/apiConfig';
import {
  loginUser,
  saveAuthSession,
  clearAuthSession,
  getStoredAuthSession,
  syncPortalFlagsForRole,
} from './authApi';

import { ADMIN_PORTAL_KEY } from './authApi';
export const ADMIN_ROLE = 'Admin';

export interface AdminPlaceItem {
  placeId: string;
  name: string;
  address?: string | null;
  status: string;
  businessId: string;
  businessName: string;
  ownerId: string;
  categoryName?: string | null;
  createdAt: string;
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
  return data as ApiResponse<T>;
}

function normalizeItem(raw: Record<string, unknown>): AdminPlaceItem {
  return {
    placeId: String(raw.placeId ?? raw.PlaceId ?? ''),
    name: String(raw.name ?? raw.Name ?? ''),
    address: (raw.address ?? raw.Address ?? null) as string | null,
    status: String(raw.status ?? raw.Status ?? ''),
    businessId: String(raw.businessId ?? raw.BusinessId ?? ''),
    businessName: String(raw.businessName ?? raw.BusinessName ?? ''),
    ownerId: String(raw.ownerId ?? raw.OwnerId ?? ''),
    categoryName: (raw.categoryName ?? raw.CategoryName ?? null) as string | null,
    createdAt: String(raw.createdAt ?? raw.CreatedAt ?? ''),
  };
}

/** Backend JWT login for Admin role (uses same Auth API as users). */
export async function loginAdminWithBackend(email: string, password: string): Promise<void> {
  const auth = await loginUser({ email, password });
  const role = auth.role ?? (auth as Record<string, unknown>).Role;
  if (role !== ADMIN_ROLE) {
    await clearAuthSession();
    throw new Error('NOT_ADMIN');
  }
  await saveAuthSession({ ...auth, role: String(role) });
  await syncPortalFlagsForRole({ ...auth, role: String(role) });
}

export async function isBackendAdminSession(): Promise<boolean> {
  const portal = await AsyncStorage.getItem(ADMIN_PORTAL_KEY);
  const auth = await getStoredAuthSession();
  return portal === '1' && auth?.role === ADMIN_ROLE;
}

export async function clearBackendAdminPortal(): Promise<void> {
  await AsyncStorage.removeItem(ADMIN_PORTAL_KEY);
}

export async function listPendingPlaces(): Promise<AdminPlaceItem[]> {
  const res = await requestJson<Record<string, unknown>[]>('/admin/places/pending', 'GET');
  return (res.data ?? []).map(normalizeItem);
}

export async function approvePlace(placeId: string): Promise<void> {
  await requestJson(`/admin/places/${placeId}/approve`, 'PUT');
}

export async function rejectPlace(placeId: string): Promise<void> {
  await requestJson(`/admin/places/${placeId}/reject`, 'PUT');
}

export async function suspendPlace(placeId: string): Promise<void> {
  await requestJson(`/admin/places/${placeId}/suspend`, 'PUT');
}
