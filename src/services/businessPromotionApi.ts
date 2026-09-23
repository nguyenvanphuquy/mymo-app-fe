import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/apiConfig';

interface ApiEnvelope<T> {
  success?: boolean;
  message?: string;
  data?: T;
}

export type PromotionStatus = 'Upcoming' | 'Active' | 'Expired';

export interface PromotionDto {
  id: string;
  placeId: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  startAt: string;
  endAt: string;
  isActive: boolean;
  status: PromotionStatus;
}

async function headers(multipart = false): Promise<Record<string, string>> {
  const token = await AsyncStorage.getItem('mymo.accessToken');
  const h: Record<string, string> = { Accept: '*/*' };
  if (token) h.Authorization = `Bearer ${token}`;
  if (!multipart) h['Content-Type'] = 'application/json';
  return h;
}

function normalize(raw: Record<string, unknown>): PromotionDto {
  return {
    id: String(raw.id ?? raw.Id ?? ''),
    placeId: String(raw.placeId ?? raw.PlaceId ?? ''),
    title: String(raw.title ?? raw.Title ?? ''),
    description: (raw.description ?? raw.Description ?? null) as string | null,
    imageUrl: (raw.imageUrl ?? raw.ImageUrl ?? null) as string | null,
    startAt: String(raw.startAt ?? raw.StartAt ?? ''),
    endAt: String(raw.endAt ?? raw.EndAt ?? ''),
    isActive: Boolean(raw.isActive ?? raw.IsActive ?? true),
    status: String(raw.status ?? raw.Status ?? 'Active') as PromotionStatus,
  };
}

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  let parsed: ApiEnvelope<T> & Record<string, unknown> = {};
  if (text) {
    try { parsed = JSON.parse(text) as ApiEnvelope<T> & Record<string, unknown>; }
    catch { parsed = { message: text }; }
  }
  if (!response.ok) throw new Error(String(parsed.message ?? `Request failed (${response.status})`));
  if (parsed.data !== undefined && parsed.data !== null) return parsed.data;
  return parsed as unknown as T;
}

export async function getPlacePromotions(placeId: string): Promise<PromotionDto[]> {
  const res = await fetch(`${API_URL}/business/places/${placeId}/promotions`, { method: 'GET', headers: await headers() });
  const data = await parseResponse<unknown[]>(res);
  return (Array.isArray(data) ? data : []).map(item => normalize(item as Record<string, unknown>));
}

export type PromotionWithPlace = PromotionDto & { placeName: string };

/** All promotions for the given places (skips places that fail to load). */
export async function getAllMyPromotions(
  places: { placeId: string; name: string }[],
): Promise<PromotionWithPlace[]> {
  const batches = await Promise.all(
    places.map(async p => {
      try {
        const promos = await getPlacePromotions(p.placeId);
        return promos.map(pr => ({ ...pr, placeName: p.name }));
      } catch {
        return [] as PromotionWithPlace[];
      }
    }),
  );
  return batches
    .flat()
    .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());
}

export async function getPromotion(promotionId: string): Promise<PromotionDto> {
  const res = await fetch(`${API_URL}/business/promotions/${promotionId}`, { method: 'GET', headers: await headers() });
  return normalize(await parseResponse<Record<string, unknown>>(res));
}

export async function createPromotion(placeId: string, body: {
  title: string;
  description?: string;
  startAt: string;
  endAt: string;
  isActive?: boolean;
}): Promise<PromotionDto> {
  const res = await fetch(`${API_URL}/business/places/${placeId}/promotions`, {
    method: 'POST',
    headers: await headers(),
    body: JSON.stringify({ ...body, isActive: body.isActive ?? true }),
  });
  return normalize(await parseResponse<Record<string, unknown>>(res));
}

export async function updatePromotion(promotionId: string, body: {
  title: string;
  description?: string;
  startAt: string;
  endAt: string;
  isActive: boolean;
}): Promise<PromotionDto> {
  const res = await fetch(`${API_URL}/business/promotions/${promotionId}`, {
    method: 'PUT',
    headers: await headers(),
    body: JSON.stringify(body),
  });
  return normalize(await parseResponse<Record<string, unknown>>(res));
}

export async function deletePromotion(promotionId: string): Promise<void> {
  const res = await fetch(`${API_URL}/business/promotions/${promotionId}`, { method: 'DELETE', headers: await headers() });
  await parseResponse<unknown>(res);
}

export async function uploadPromotionImage(promotionId: string, formData: FormData): Promise<PromotionDto> {
  const res = await fetch(`${API_URL}/business/promotions/${promotionId}/image`, {
    method: 'POST',
    headers: await headers(true),
    body: formData,
  });
  return normalize(await parseResponse<Record<string, unknown>>(res));
}

export function formatPromotionRange(startAt: string, endAt: string): string {
  const s = new Date(startAt);
  const e = new Date(endAt);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return `${startAt} - ${endAt}`;
  const dateFmt = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeFmt = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' });
  return `${dateFmt.format(s)} · ${timeFmt.format(s)} - ${timeFmt.format(e)}`;
}

/** Build ISO UTC from local date (YYYY-MM-DD) and time (HH:mm). */
export function toUtcIso(dateStr: string, timeStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  const local = new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0);
  return local.toISOString();
}

export function splitIsoToLocalFields(iso: string): { date: string; time: string } {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return { date: '', time: '' };
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    date: `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`,
    time: `${pad(dt.getHours())}:${pad(dt.getMinutes())}`,
  };
}
