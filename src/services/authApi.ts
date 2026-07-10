import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://beexe-production.up.railway.app/api/Auth';

export interface AuthResponse {
  userId: string;
  username: string;
  email: string;
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
  return requestJson<AuthResponse>('/login', payload);
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
