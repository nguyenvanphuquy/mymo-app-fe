import AsyncStorage from '@react-native-async-storage/async-storage';

import { API_URL } from '../config/apiConfig';

const BASE_URL = API_URL;

/** Matches EXE.Domain.Enums.Mood */
export type CheckInMood = 'Happy' | 'Sad' | 'Excited' | 'Chill' | 'Angry';

/** Matches EXE.Domain.Enums.Weather */
export type CheckInWeather = 'Sunny' | 'Rainy' | 'Cloudy' | 'Snowy' | 'Windy';

export const CHECK_IN_MAX_DISTANCE_M = 1500;

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errorCode: string | null;
}

async function getAuthToken(): Promise<string | null> {
  return AsyncStorage.getItem('mymo.accessToken');
}

async function requestJson<T>(path: string, method: string, body?: unknown): Promise<T> {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    Accept: '*/*',
    'Content-Type': 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 204) {
    return undefined as T;
  }

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

export interface CheckInItem {
  checkInId: string;
  userId: string;
  placeId: string;
  createdAt: string;
}

function normalizeCheckIn(raw: Record<string, unknown>): CheckInItem {
  return {
    checkInId: String(raw.checkInId ?? raw.CheckInId ?? ''),
    userId: String(raw.userId ?? raw.UserId ?? ''),
    placeId: String(raw.placeId ?? raw.PlaceId ?? ''),
    createdAt: String(raw.createdAt ?? raw.CreatedAt ?? ''),
  };
}

export function distanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function createCheckIn(payload: {
  placeId: string;
  latitude: number;
  longitude: number;
  mood?: CheckInMood;
  weather?: CheckInWeather;
}): Promise<CheckInItem> {
  const response = await requestJson<ApiResponse<Record<string, unknown>>>(
    '/checkins',
    'POST',
    payload,
  );
  if (!response.success) {
    throw new Error(response.message || 'Unable to check in');
  }
  return normalizeCheckIn(response.data ?? {});
}

export async function getMyCheckIns(): Promise<CheckInItem[]> {
  const response = await requestJson<ApiResponse<Record<string, unknown>[]>>(
    '/checkins/me',
    'GET',
  );
  if (!response.success) {
    throw new Error(response.message || 'Unable to load check-ins');
  }
  return (response.data ?? []).map(item => normalizeCheckIn(item as Record<string, unknown>));
}

export async function deleteCheckIn(checkInId: string): Promise<void> {
  const response = await requestJson<ApiResponse<boolean>>(`/checkins/${checkInId}`, 'DELETE');
  if (!response.success) {
    throw new Error(response.message || 'Unable to delete check-in');
  }
}
