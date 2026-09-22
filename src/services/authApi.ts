import AsyncStorage from '@react-native-async-storage/async-storage';
import { AUTH_API_URL } from '../config/apiConfig';

const BASE_URL = AUTH_API_URL;

export const ADMIN_PORTAL_KEY = 'mymo.adminPortal';
export const BUSINESS_PORTAL_KEY = 'mymo.businessPortal';
const BUSINESS_SESSION_KEY = 'mymo.businessSession';

export type PostLoginDestination = 'user' | 'admin' | 'business';

/** Align AsyncStorage portal flags with JWT role (Admin / Business / User). */
export async function syncPortalFlagsForRole(auth: AuthResponse): Promise<PostLoginDestination> {
  const role = (auth.role ?? 'User').trim();

  if (role === 'Admin') {
    await AsyncStorage.setItem(ADMIN_PORTAL_KEY, '1');
    await AsyncStorage.multiRemove([BUSINESS_PORTAL_KEY, BUSINESS_SESSION_KEY]);
    return 'admin';
  }

  if (role === 'Business') {
    await AsyncStorage.multiSet([
      [BUSINESS_PORTAL_KEY, '1'],
      [BUSINESS_SESSION_KEY, JSON.stringify({
        userId: auth.userId,
        email: auth.email,
        displayName: auth.username,
      })],
    ]);
    await AsyncStorage.removeItem(ADMIN_PORTAL_KEY);
    return 'business';
  }

  await AsyncStorage.multiRemove([ADMIN_PORTAL_KEY, BUSINESS_PORTAL_KEY, BUSINESS_SESSION_KEY]);
  return 'user';
}

export interface AuthResponse {
  userId: string;
  username: string;
  email: string;
  role?: string;
  accessToken: string;
  refreshToken: string;
}

interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  displayName: string;
  gender: string;
  phoneNumber: string;
  dateOfBirth: string;
}

interface LoginPayload {
  email: string;
  password: string;
}

async function requestJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      Accept: '*/*',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const rawText = await response.text();
  let data: unknown = rawText;

  if (rawText) {
    try {
      data = JSON.parse(rawText);
    } catch {
      data = { message: rawText };
    }
  }

  if (!response.ok) {
    const message = typeof data === 'object' && data !== null && 'message' in data
      ? String((data as { message?: unknown }).message)
      : 'Unable to complete request';
    throw new Error(message);
  }

  return data as T;
}

export async function registerUser(payload: RegisterPayload): Promise<AuthResponse> {
  return requestJson<AuthResponse>('/register', payload);
}

export async function loginUser(payload: LoginPayload): Promise<AuthResponse> {
  const raw = await requestJson<Record<string, unknown>>('/login', payload);
  return {
    userId: String(raw.userId ?? raw.UserId ?? ''),
    username: String(raw.username ?? raw.Username ?? ''),
    email: String(raw.email ?? raw.Email ?? ''),
    role: String(raw.role ?? raw.Role ?? 'User'),
    accessToken: String(raw.accessToken ?? raw.AccessToken ?? ''),
    refreshToken: String(raw.refreshToken ?? raw.RefreshToken ?? ''),
  };
}

export async function saveAuthSession(auth: AuthResponse): Promise<void> {
  await AsyncStorage.multiSet([
    ['mymo.auth', JSON.stringify(auth)],
    ['mymo.accessToken', auth.accessToken],
    ['mymo.refreshToken', auth.refreshToken],
  ]);
}

export async function clearAuthSession(): Promise<void> {
  await AsyncStorage.multiRemove(['mymo.auth', 'mymo.accessToken', 'mymo.refreshToken']);
}

export async function getStoredAuthSession(): Promise<AuthResponse | null> {
  const raw = await AsyncStorage.getItem('mymo.auth');
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const userId = String(parsed.userId ?? parsed.UserId ?? '').trim();
    if (!userId) return null;

    return {
      userId,
      username: String(parsed.username ?? parsed.Username ?? ''),
      email: String(parsed.email ?? parsed.Email ?? ''),
      role: String(parsed.role ?? parsed.Role ?? 'User'),
      accessToken: String(parsed.accessToken ?? parsed.AccessToken ?? ''),
      refreshToken: String(parsed.refreshToken ?? parsed.RefreshToken ?? ''),
    };
  } catch {
    return null;
  }
}

/** Resolve current user id from stored auth (handles PascalCase legacy payloads). */
export function getAuthUserId(session: AuthResponse | null | undefined): string | null {
  if (!session?.userId) return null;
  const id = session.userId.trim();
  return id || null;
}
