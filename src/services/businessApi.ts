import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/apiConfig';
import {
  BUSINESS_PORTAL_KEY,
  getStoredAuthSession,
  loginUser,
  saveAuthSession,
  clearAuthSession,
  type AuthResponse,
} from './authApi';

/** Must match UserRoles.Name in DB (Business). */
export const BUSINESS_OWNER_ROLE = 'Business';

export interface BusinessSession {
  userId: string;
  email: string;
  displayName: string;
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
  let data = rawText ? JSON.parse(rawText) : {};
  if (!response.ok) {
    const message = data?.message ?? `Request failed (${response.status})`;
    throw new Error(message);
  }
  if (data && typeof data === 'object' && data.success === false) {
    throw new Error(String(data.message ?? 'Request failed'));
  }
  return data as ApiResponse<T>;
}

export async function loginAsBusinessOwner(email: string, password: string): Promise<BusinessSession> {
  const auth = await loginUser({ email, password });
  const role = auth.role ?? (auth as Record<string, unknown>).Role;
  if (role !== BUSINESS_OWNER_ROLE) {
    await clearAuthSession();
    throw new Error('NOT_BUSINESS_OWNER');
  }
  await saveAuthSession({ ...auth, role: String(role) });
  const { syncPortalFlagsForRole } = await import('./authApi');
  await syncPortalFlagsForRole(auth);

  const session: BusinessSession = {
    userId: auth.userId,
    email: auth.email,
    displayName: auth.username,
  };
  return session;
}

export async function getBusinessSession(): Promise<BusinessSession | null> {
  const portal = await AsyncStorage.getItem(BUSINESS_PORTAL_KEY);
  const auth = await getStoredAuthSession();
  if (portal !== '1' || !auth || auth.role !== BUSINESS_OWNER_ROLE) return null;

  const raw = await AsyncStorage.getItem('mymo.businessSession');
  if (raw) {
    try {
      return JSON.parse(raw) as BusinessSession;
    } catch {
      // fall through
    }
  }
  return {
    userId: auth.userId,
    email: auth.email,
    displayName: auth.username,
  };
}

export async function clearBusinessSession(): Promise<void> {
  await AsyncStorage.multiRemove([BUSINESS_PORTAL_KEY, 'mymo.businessSession']);
  await clearAuthSession();
}

export interface BusinessDto {
  businessId: string;
  name: string;
  description?: string | null;
  logoUrl?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  verified: boolean;
}

export interface BusinessPlaceDto {
  placeId: string;
  businessId: string;
  name: string;
  description?: string | null;
  categoryId: string;
  address?: string | null;
  latitude: number;
  longitude: number;
  openingHours?: string | null;
  thumbnailUrl?: string | null;
  status: string;
  averageRating: number;
  reviewCount: number;
  checkInCount: number;
}

export interface PlaceAnalyticsDto {
  totalCheckIns: number;
  todayCheckIns: number;
  weeklyCheckIns: number;
  monthlyCheckIns: number;
}

function normalizeBusiness(raw: Record<string, unknown>): BusinessDto {
  return {
    businessId: String(raw.businessId ?? raw.BusinessId ?? ''),
    name: String(raw.name ?? raw.Name ?? ''),
    description: (raw.description ?? raw.Description ?? null) as string | null,
    logoUrl: (raw.logoUrl ?? raw.LogoUrl ?? null) as string | null,
    phone: (raw.phone ?? raw.Phone ?? null) as string | null,
    email: (raw.email ?? raw.Email ?? null) as string | null,
    website: (raw.website ?? raw.Website ?? null) as string | null,
    verified: Boolean(raw.verified ?? raw.Verified ?? false),
  };
}

function normalizePlace(raw: Record<string, unknown>): BusinessPlaceDto {
  return {
    placeId: String(raw.placeId ?? raw.PlaceId ?? ''),
    businessId: String(raw.businessId ?? raw.BusinessId ?? ''),
    name: String(raw.name ?? raw.Name ?? ''),
    description: (raw.description ?? raw.Description ?? null) as string | null,
    categoryId: String(raw.categoryId ?? raw.CategoryId ?? ''),
    address: (raw.address ?? raw.Address ?? null) as string | null,
    latitude: Number(raw.latitude ?? raw.Latitude ?? 0),
    longitude: Number(raw.longitude ?? raw.Longitude ?? 0),
    openingHours: (raw.openingHours ?? raw.OpeningHours ?? null) as string | null,
    thumbnailUrl: (raw.thumbnailUrl ?? raw.ThumbnailUrl ?? null) as string | null,
    status: String(raw.status ?? raw.Status ?? ''),
    averageRating: Number(raw.averageRating ?? raw.AverageRating ?? 0),
    reviewCount: Number(raw.reviewCount ?? raw.ReviewCount ?? 0),
    checkInCount: Number(raw.checkInCount ?? raw.CheckInCount ?? 0),
  };
}

export async function getMyBusinesses(): Promise<BusinessDto[]> {
  const res = await requestJson<Record<string, unknown>>('/business/me', 'GET');
  const wrapped = res.data ?? {};
  const list = (wrapped.businesses ?? wrapped.Businesses ?? []) as Record<string, unknown>[];
  return list.map(normalizeBusiness);
}

export async function createBusiness(payload: {
  name: string;
  description?: string;
  phone?: string;
  email?: string;
}): Promise<BusinessDto> {
  const res = await requestJson<Record<string, unknown>>('/business', 'POST', payload);
  return normalizeBusiness(res.data);
}

export async function getMyPlaces(): Promise<BusinessPlaceDto[]> {
  const res = await requestJson<Record<string, unknown>[]>('/business/places', 'GET');
  return (res.data ?? []).map(p => normalizePlace(p));
}

export async function createPlace(payload: {
  businessId: string;
  name: string;
  categoryId: string;
  address: string;
  latitude: number;
  longitude: number;
  description?: string;
  openingHours?: string;
  thumbnailUrl?: string;
}): Promise<BusinessPlaceDto> {
  const res = await requestJson<Record<string, unknown>>('/business/places', 'POST', payload);
  return normalizePlace(res.data);
}

export async function updatePlace(
  placeId: string,
  payload: {
    name: string;
    categoryId: string;
    address: string;
    latitude: number;
    longitude: number;
    description?: string;
    openingHours?: string;
    thumbnailUrl?: string;
  },
): Promise<BusinessPlaceDto> {
  const res = await requestJson<Record<string, unknown>>(`/business/places/${placeId}`, 'PUT', payload);
  return normalizePlace(res.data);
}

export async function getPlaceAnalytics(placeId: string): Promise<PlaceAnalyticsDto> {
  const res = await requestJson<Record<string, unknown>>(`/business/places/${placeId}/analytics`, 'GET');
  const raw = res.data;
  return {
    totalCheckIns: Number(raw.totalCheckIns ?? raw.TotalCheckIns ?? 0),
    todayCheckIns: Number(raw.todayCheckIns ?? raw.TodayCheckIns ?? 0),
    weeklyCheckIns: Number(raw.weeklyCheckIns ?? raw.WeeklyCheckIns ?? 0),
    monthlyCheckIns: Number(raw.monthlyCheckIns ?? raw.MonthlyCheckIns ?? 0),
  };
}

export async function getPlaceCategories(): Promise<{ placeCategoryId: string; name: string }[]> {
  const res = await requestJson<Record<string, unknown>[]>('/place-categories', 'GET');
  return (res.data ?? []).map(c => ({
    placeCategoryId: String(c.placeCategoryId ?? c.PlaceCategoryId ?? ''),
    name: String(c.name ?? c.Name ?? ''),
  }));
}

export type { AuthResponse };
