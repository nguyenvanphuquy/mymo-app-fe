import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/apiConfig';

export type BackendUserStatus = 'Active' | 'Inactive' | 'Banned';

export type BackendAdminUser = {
  userId: string;
  username: string;
  email: string;
  displayName: string | null;
  phoneNumber: string | null;
  roleName: string;
  status: BackendUserStatus;
  createdAt: string;
  lastActiveAt: string | null;
};

async function authHeaders(): Promise<Record<string, string>> {
  const token = await AsyncStorage.getItem('mymo.accessToken');
  const headers: Record<string, string> = {
    Accept: '*/*',
    'Content-Type': 'application/json',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function normalizeStatus(raw: unknown): BackendUserStatus {
  const s = String(raw ?? 'Active');
  if (s === 'Inactive' || s === 'Banned' || s === 'Active') return s;
  return 'Active';
}

function normalizeUser(raw: Record<string, unknown>): BackendAdminUser {
  return {
    userId: String(raw.userId ?? raw.UserId ?? ''),
    username: String(raw.username ?? raw.Username ?? ''),
    email: String(raw.email ?? raw.Email ?? ''),
    displayName: (raw.displayName ?? raw.DisplayName ?? null) as string | null,
    phoneNumber: (raw.phoneNumber ?? raw.PhoneNumber ?? null) as string | null,
    roleName: String(raw.roleName ?? raw.RoleName ?? 'User'),
    status: normalizeStatus(raw.status ?? raw.Status),
    createdAt: String(raw.createdAt ?? raw.CreatedAt ?? ''),
    lastActiveAt: (raw.lastActiveAt ?? raw.LastActiveAt ?? null) as string | null,
  };
}

export async function listBackendAdminUsers(options?: {
  keyword?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ totalCount: number; items: BackendAdminUser[] }> {
  const params = new URLSearchParams();
  if (options?.keyword?.trim()) params.set('keyword', options.keyword.trim());
  if (options?.page != null) params.set('page', String(options.page));
  if (options?.pageSize != null) params.set('pageSize', String(options.pageSize));
  const qs = params.toString();
  const url = `${API_URL}/admin/users${qs ? `?${qs}` : ''}`;
  const response = await fetch(url, { method: 'GET', headers: await authHeaders() });
  const rawText = await response.text();
  const data = rawText ? JSON.parse(rawText) : {};
  if (!response.ok) throw new Error(data.message ?? data.Message ?? 'Failed to load users');

  const payload = (data.data ?? data.Data ?? {}) as Record<string, unknown>;
  const itemsRaw = (payload.items ?? payload.Items ?? []) as Record<string, unknown>[];
  return {
    totalCount: Number(payload.totalCount ?? payload.TotalCount ?? itemsRaw.length),
    items: itemsRaw.map(normalizeUser),
  };
}

export async function updateBackendUserStatus(
  userId: string,
  status: BackendUserStatus,
): Promise<BackendAdminUser> {
  const response = await fetch(`${API_URL}/admin/users/${encodeURIComponent(userId)}/status`, {
    method: 'PUT',
    headers: await authHeaders(),
    body: JSON.stringify({ status }),
  });
  const rawText = await response.text();
  const data = rawText ? JSON.parse(rawText) : {};
  if (!response.ok) throw new Error(data.message ?? data.Message ?? 'Failed to update user');
  const payload = (data.data ?? data.Data ?? {}) as Record<string, unknown>;
  return normalizeUser(payload);
}
