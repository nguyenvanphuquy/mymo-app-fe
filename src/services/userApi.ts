import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://beexe-production.up.railway.app/api';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errorCode: string | null;
}

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  bio: string | null;
  gender: string;
  dateOfBirth: string;
  email: string;
  phoneNumber: string;
  friendCount: number;
  postCount: number;
  placeCount: number;
  createdAt: string;
}

interface UpdateUserPayload {
  displayName?: string;
  bio?: string;
  gender?: string;
  dateOfBirth?: string;
}

interface ChangePasswordPayload {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface UserSettingsPayload {
  isLocationSharing?: boolean;
  isAnonymous?: boolean;
  language?: string;
  notificationEnabled?: boolean;
}

async function getAuthToken(): Promise<string | null> {
  return AsyncStorage.getItem('mymo.accessToken');
}

async function requestJson<T>(path: string, method: string, body?: unknown, isMultipart = false): Promise<T> {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    Accept: '*/*',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (!isMultipart) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: isMultipart ? (body as FormData) : body ? JSON.stringify(body) : undefined,
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

export async function getUserProfile(): Promise<UserProfile> {
  const response = await requestJson<ApiResponse<UserProfile>>('/users/me', 'GET');
  return response.data;
}

export async function updateUserProfile(payload: UpdateUserPayload): Promise<UserProfile> {
  const response = await requestJson<ApiResponse<UserProfile>>('/users/me', 'PUT', payload);
  return response.data;
}

export async function changeUserPassword(payload: ChangePasswordPayload): Promise<void> {
  await requestJson<ApiResponse<null>>('/users/change-password', 'PUT', payload);
}

export async function updateUserSettings(payload: UserSettingsPayload): Promise<void> {
  await requestJson<ApiResponse<null>>('/users/settings', 'PATCH', payload);
}

export async function updateUserLocation(
  latitude: number | null,
  longitude: number | null,
): Promise<void> {
  try {
    await requestJson<ApiResponse<boolean>>('/users/location', 'PUT', {
      latitude,
      longitude,
    });
  } catch {
    // Endpoint may not be deployed yet — ignore silently
  }
}

export async function uploadUserAvatar(file: FormData): Promise<string> {
  const response = await requestJson<ApiResponse<string>>('/users/avatar', 'PUT', file, true);
  if (!response.success) {
    throw new Error(response.message || 'Failed to upload avatar');
  }
  return response.data;
}

export async function uploadUserCover(file: FormData): Promise<string> {
  const response = await requestJson<ApiResponse<string>>('/users/cover', 'PUT', file, true);
  if (!response.success) {
    throw new Error(response.message || 'Failed to upload cover');
  }
  return response.data;
}
