import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/apiConfig';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PlacePhotoDto {
  id: string;
  imageUrl: string;
  isPrimary: boolean;
  displayOrder: number;
}

async function authHeaders(multipart = false): Promise<Record<string, string>> {
  const token = await AsyncStorage.getItem('mymo.accessToken');
  const headers: Record<string, string> = { Accept: '*/*' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!multipart) headers['Content-Type'] = 'application/json';
  return headers;
}

function normalizePhoto(raw: Record<string, unknown>): PlacePhotoDto {
  return {
    id: String(raw.id ?? raw.Id ?? raw.placePhotoId ?? raw.PlacePhotoId ?? ''),
    imageUrl: String(raw.imageUrl ?? raw.ImageUrl ?? ''),
    isPrimary: Boolean(raw.isPrimary ?? raw.IsPrimary ?? false),
    displayOrder: Number(raw.displayOrder ?? raw.DisplayOrder ?? 0),
  };
}

function unwrapData<T>(data: Record<string, unknown>): T {
  const payload = data.data ?? data.Data;
  if (payload != null) return payload as T;
  return data as T;
}

function extractPhotoRecords(parsed: Record<string, unknown>): Record<string, unknown>[] {
  const payload = parsed.data ?? parsed.Data ?? parsed;
  if (Array.isArray(payload)) {
    return payload.filter((x): x is Record<string, unknown> => x != null && typeof x === 'object');
  }
  if (payload && typeof payload === 'object') {
    const inner = payload as Record<string, unknown>;
    const list = inner.photos ?? inner.Photos ?? inner.items ?? inner.Items;
    if (Array.isArray(list)) {
      return list.filter((x): x is Record<string, unknown> => x != null && typeof x === 'object');
    }
  }
  return [];
}

export function sortPlacePhotos(photos: PlacePhotoDto[]): PlacePhotoDto[] {
  const byId = new Map<string, PlacePhotoDto>();
  for (const p of photos) {
    if (!p.id || !p.imageUrl) continue;
    byId.set(p.id, p);
  }
  return [...byId.values()].sort(
    (a, b) => a.displayOrder - b.displayOrder || a.id.localeCompare(b.id),
  );
}

export async function getPlacePhotos(placeId: string): Promise<PlacePhotoDto[]> {
  const response = await fetch(`${API_URL}/business/places/${placeId}/photos`, {
    method: 'GET',
    headers: await authHeaders(),
  });
  const rawText = await response.text();
  let parsed: Record<string, unknown> = {};
  if (rawText) {
    try { parsed = JSON.parse(rawText) as Record<string, unknown>; } catch { parsed = { message: rawText }; }
  }
  if (!response.ok) {
    throw new Error(String(parsed.message ?? parsed.Message ?? `Request failed (${response.status})`));
  }
  const list = extractPhotoRecords(parsed);
  return sortPlacePhotos(list.map(item => normalizePhoto(item)));
}

export async function uploadPlacePhoto(placeId: string, formData: FormData): Promise<PlacePhotoDto> {
  const response = await fetch(`${API_URL}/business/places/${placeId}/photos`, {
    method: 'POST',
    headers: await authHeaders(true),
    body: formData,
  });
  const rawText = await response.text();
  let parsed: Record<string, unknown> = {};
  if (rawText) {
    try { parsed = JSON.parse(rawText) as Record<string, unknown>; } catch { parsed = { message: rawText }; }
  }
  if (!response.ok) {
    throw new Error(String(parsed.message ?? `Upload failed (${response.status})`));
  }
  const item = unwrapData<Record<string, unknown>>(parsed);
  return normalizePhoto(item);
}

export async function deletePlacePhoto(placeId: string, photoId: string): Promise<void> {
  const response = await fetch(`${API_URL}/business/places/${placeId}/photos/${photoId}`, {
    method: 'DELETE',
    headers: await authHeaders(),
  });
  if (!response.ok) {
    const rawText = await response.text();
    let message = `Delete failed (${response.status})`;
    try {
      const parsed = JSON.parse(rawText) as { message?: string };
      if (parsed.message) message = parsed.message;
    } catch { /* ignore */ }
    throw new Error(message);
  }
}

export async function setPlacePhotoPrimary(placeId: string, photoId: string): Promise<PlacePhotoDto> {
  const response = await fetch(`${API_URL}/business/places/${placeId}/photos/${photoId}/primary`, {
    method: 'PUT',
    headers: await authHeaders(),
  });
  const rawText = await response.text();
  let parsed: Record<string, unknown> = {};
  if (rawText) {
    try { parsed = JSON.parse(rawText) as Record<string, unknown>; } catch { parsed = { message: rawText }; }
  }
  if (!response.ok) {
    throw new Error(String(parsed.message ?? `Request failed (${response.status})`));
  }
  return normalizePhoto(unwrapData<Record<string, unknown>>(parsed));
}

export async function reorderPlacePhotos(placeId: string, photoIds: string[]): Promise<PlacePhotoDto[]> {
  const response = await fetch(`${API_URL}/business/places/${placeId}/photos/order`, {
    method: 'PUT',
    headers: await authHeaders(),
    body: JSON.stringify({ photoIds }),
  });
  const rawText = await response.text();
  let parsed: Record<string, unknown> = {};
  if (rawText) {
    try { parsed = JSON.parse(rawText) as Record<string, unknown>; } catch { parsed = { message: rawText }; }
  }
  if (!response.ok) {
    throw new Error(String(parsed.message ?? `Request failed (${response.status})`));
  }
  const list = unwrapData<unknown[]>(parsed);
  return (Array.isArray(list) ? list : []).map(item => normalizePhoto(item as Record<string, unknown>));
}
