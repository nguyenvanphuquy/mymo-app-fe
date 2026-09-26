import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/apiConfig';

interface ApiEnvelope<T> {
  success?: boolean;
  message?: string;
  data?: T;
}

export interface MenuItemDto {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  imageUrl?: string | null;
  categoryName?: string | null;
  isAvailable: boolean;
  displayOrder: number;
}

export interface BusinessMenuDto {
  id: string;
  placeId: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  items: MenuItemDto[];
}

async function headers(multipart = false): Promise<Record<string, string>> {
  const token = await AsyncStorage.getItem('mymo.accessToken');
  const h: Record<string, string> = { Accept: '*/*' };
  if (token) h.Authorization = `Bearer ${token}`;
  if (!multipart) h['Content-Type'] = 'application/json';
  return h;
}

function normalizeItem(raw: Record<string, unknown>): MenuItemDto {
  return {
    id: String(raw.id ?? raw.Id ?? ''),
    name: String(raw.name ?? raw.Name ?? ''),
    description: (raw.description ?? raw.Description ?? null) as string | null,
    price: Number(raw.price ?? raw.Price ?? 0),
    imageUrl: (raw.imageUrl ?? raw.ImageUrl ?? null) as string | null,
    categoryName: (raw.categoryName ?? raw.CategoryName ?? null) as string | null,
    isAvailable: Boolean(raw.isAvailable ?? raw.IsAvailable ?? true),
    displayOrder: Number(raw.displayOrder ?? raw.DisplayOrder ?? 0),
  };
}

export function sortMenuItems(items: MenuItemDto[]): MenuItemDto[] {
  const byId = new Map<string, MenuItemDto>();
  for (const item of items) {
    if (!item.id) continue;
    byId.set(item.id, item);
  }
  return [...byId.values()].sort(
    (a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name),
  );
}

function normalizeMenu(raw: Record<string, unknown>): BusinessMenuDto {
  const itemsRaw = (raw.items ?? raw.Items ?? []) as Record<string, unknown>[];
  return {
    id: String(raw.id ?? raw.Id ?? ''),
    placeId: String(raw.placeId ?? raw.PlaceId ?? ''),
    name: String(raw.name ?? raw.Name ?? ''),
    description: (raw.description ?? raw.Description ?? null) as string | null,
    isActive: Boolean(raw.isActive ?? raw.IsActive ?? true),
    items: sortMenuItems(itemsRaw.map(normalizeItem)),
  };
}

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  let parsed: ApiEnvelope<T> & Record<string, unknown> = {};
  if (text) {
    try { parsed = JSON.parse(text) as ApiEnvelope<T> & Record<string, unknown>; }
    catch { parsed = { message: text }; }
  }
  if (!response.ok) {
    throw new Error(String(parsed.message ?? `Request failed (${response.status})`));
  }
  const payload = parsed.data ?? (parsed as Record<string, unknown>).Data;
  if (payload !== undefined && payload !== null) return payload as T;
  return parsed as unknown as T;
}

export async function getPlaceMenu(placeId: string): Promise<BusinessMenuDto> {
  const res = await fetch(`${API_URL}/business/places/${placeId}/menu`, { method: 'GET', headers: await headers() });
  return normalizeMenu(await parseResponse<Record<string, unknown>>(res));
}

export async function createPlaceMenu(placeId: string, body: { name: string; description?: string }): Promise<BusinessMenuDto> {
  const res = await fetch(`${API_URL}/business/places/${placeId}/menu`, {
    method: 'POST',
    headers: await headers(),
    body: JSON.stringify({ name: body.name, description: body.description, isActive: true }),
  });
  return normalizeMenu(await parseResponse<Record<string, unknown>>(res));
}

export async function createMenuItem(menuId: string, body: {
  name: string;
  description?: string;
  price: number;
  categoryName?: string;
  isAvailable?: boolean;
}): Promise<MenuItemDto> {
  const res = await fetch(`${API_URL}/business/menus/${menuId}/items`, {
    method: 'POST',
    headers: await headers(),
    body: JSON.stringify(body),
  });
  return normalizeItem(await parseResponse<Record<string, unknown>>(res));
}

export async function updateMenuItem(itemId: string, body: {
  name: string;
  description?: string;
  price: number;
  categoryName?: string;
  isAvailable: boolean;
}): Promise<MenuItemDto> {
  const res = await fetch(`${API_URL}/business/menu-items/${itemId}`, {
    method: 'PUT',
    headers: await headers(),
    body: JSON.stringify(body),
  });
  return normalizeItem(await parseResponse<Record<string, unknown>>(res));
}

export async function deleteMenuItem(itemId: string): Promise<void> {
  const res = await fetch(`${API_URL}/business/menu-items/${itemId}`, { method: 'DELETE', headers: await headers() });
  await parseResponse<unknown>(res);
}

export async function uploadMenuItemImage(itemId: string, formData: FormData): Promise<MenuItemDto> {
  const res = await fetch(`${API_URL}/business/menu-items/${itemId}/image`, {
    method: 'POST',
    headers: await headers(true),
    body: formData,
  });
  return normalizeItem(await parseResponse<Record<string, unknown>>(res));
}

export function formatVnd(price: number): string {
  return `${Math.round(price).toLocaleString('vi-VN')}₫`;
}
