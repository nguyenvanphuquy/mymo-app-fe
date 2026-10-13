import AsyncStorage from '@react-native-async-storage/async-storage';
import { AUTH_API_URL } from '../config/apiConfig';

const BASE_URL = AUTH_API_URL;

export const ADMIN_PORTAL_KEY = 'mymo.adminPortal';
export const BUSINESS_PORTAL_KEY = 'mymo.businessPortal';
const BUSINESS_SESSION_KEY = 'mymo.businessSession';
export const LAST_PORTAL_KEY = 'mymo.lastPortal';

export type PortalChoice = 'user' | 'business';
export type PostLoginDestination = 'user' | 'admin' | 'business' | 'portal-choice';

export async function setLastPortal(portal: PortalChoice): Promise<void> {
  await AsyncStorage.setItem(LAST_PORTAL_KEY, portal);
}

export async function getLastPortal(): Promise<PortalChoice | null> {
  const value = await AsyncStorage.getItem(LAST_PORTAL_KEY);
  if (value === 'user' || value === 'business') return value;
  return null;
}

/** Persist business portal session data (same JWT as user app). */
export async function prepareBusinessOwnerSession(auth: AuthResponse): Promise<void> {
  await AsyncStorage.multiSet([
    [BUSINESS_PORTAL_KEY, '1'],
    [BUSINESS_SESSION_KEY, JSON.stringify({
      userId: auth.userId,
      email: auth.email,
      displayName: auth.username,
    })],
  ]);
  await AsyncStorage.removeItem(ADMIN_PORTAL_KEY);
}

/** Align AsyncStorage portal flags with JWT role (Admin / Business / User). */
export async function syncPortalFlagsForRole(auth: AuthResponse): Promise<PostLoginDestination> {
  const role = (auth.role ?? 'User').trim();

  if (role === 'Admin') {
    await AsyncStorage.setItem(ADMIN_PORTAL_KEY, '1');
    await AsyncStorage.multiRemove([BUSINESS_PORTAL_KEY, BUSINESS_SESSION_KEY, LAST_PORTAL_KEY]);
    return 'admin';
  }

  if (role === 'Business') {
    await prepareBusinessOwnerSession(auth);
    return 'portal-choice';
  }

  await AsyncStorage.multiRemove([
    ADMIN_PORTAL_KEY,
    BUSINESS_PORTAL_KEY,
    BUSINESS_SESSION_KEY,
    LAST_PORTAL_KEY,
  ]);
  return 'user';
}

export interface AuthResponse {
  userId: string;
  username: string;
  email: string;
  role?: string;
  accessToken: string;
  refreshToken: string;
  permissions?: string[];
}

interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  displayName: string;
  gender: string;
  phoneNumber: string;
  dateOfBirth: string;
  otpCode: string;
}

interface LoginPayload {
  email: string;
  password: string;
}

function readErrorMessage(data: unknown): string {
  if (typeof data !== 'object' || data === null) return 'Unable to complete request';
  const record = data as Record<string, unknown>;
  const direct = record.message ?? record.Message;
  if (typeof direct === 'string' && direct.trim()) return direct;
  const errors = record.errors ?? record.Errors;
  if (typeof errors === 'object' && errors !== null) {
    const first = Object.values(errors as Record<string, unknown>)[0];
    if (Array.isArray(first) && typeof first[0] === 'string') return first[0];
  }
  return 'Unable to complete request';
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
    throw new Error(readErrorMessage(data));
  }

  return data as T;
}

export async function registerUser(payload: RegisterPayload): Promise<AuthResponse> {
  return requestJson<AuthResponse>('/register', payload);
}

export async function sendRegisterOtp(email: string): Promise<void> {
  await requestJson<unknown>('/send-register-otp', { email: email.trim() });
}

export async function sendResetOtp(email: string): Promise<void> {
  await requestJson<unknown>('/send-reset-otp', { email: email.trim() });
}

export async function resetPassword(payload: {
  email: string;
  otpCode: string;
  newPassword: string;
}): Promise<void> {
  await requestJson<unknown>('/reset-password', payload);
}

function normalizePermissions(raw: Record<string, unknown>): string[] {
  const p = raw.permissions ?? raw.Permissions;
  if (Array.isArray(p)) return p.map(String);
  return [];
}

function normalizeAuthResponse(raw: Record<string, unknown>): AuthResponse {
  return {
    userId: String(raw.userId ?? raw.UserId ?? ''),
    username: String(raw.username ?? raw.Username ?? ''),
    email: String(raw.email ?? raw.Email ?? ''),
    role: String(raw.role ?? raw.Role ?? 'User'),
    accessToken: String(raw.accessToken ?? raw.AccessToken ?? ''),
    refreshToken: String(raw.refreshToken ?? raw.RefreshToken ?? ''),
    permissions: normalizePermissions(raw),
  };
}

export async function loginUser(payload: LoginPayload): Promise<AuthResponse> {
  const raw = await requestJson<Record<string, unknown>>('/login', payload);
  return normalizeAuthResponse(raw);
}

export async function loginWithGoogleIdToken(idToken: string): Promise<AuthResponse> {
  const raw = await requestJson<Record<string, unknown>>('/google', { idToken });
  return normalizeAuthResponse(raw);
}

export async function saveAuthSession(auth: AuthResponse): Promise<void> {
  await AsyncStorage.multiSet([
    ['mymo.auth', JSON.stringify(auth)],
    ['mymo.accessToken', auth.accessToken],
    ['mymo.refreshToken', auth.refreshToken],
  ]);
  if (auth.role === 'Admin') {
    const { persistAdminPermissions } = await import('./adminApi');
    await persistAdminPermissions(auth);
  }
}

export async function clearAuthSession(): Promise<void> {
  await AsyncStorage.multiRemove([
    'mymo.auth',
    'mymo.accessToken',
    'mymo.refreshToken',
    'mymo.adminPermissions',
    LAST_PORTAL_KEY,
  ]);
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
      permissions: Array.isArray(parsed.permissions)
        ? (parsed.permissions as string[])
        : Array.isArray(parsed.Permissions)
          ? (parsed.Permissions as string[])
          : undefined,
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
