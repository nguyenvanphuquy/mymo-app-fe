import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://beexe-production.up.railway.app/api';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errorCode: string | null;
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

  const parsed = data as ApiResponse<T>;
  if (typeof parsed === 'object' && parsed !== null && 'success' in parsed && parsed.success === false) {
    const message = typeof parsed === 'object' && 'message' in parsed
      ? String((parsed as { message?: unknown }).message)
      : 'API reported failure';
    throw new Error(message);
  }

  if (typeof parsed === 'object' && parsed !== null && 'data' in parsed && parsed.data == null) {
    throw new Error('API returned no data');
  }

  return data as T;
}

export interface MediaUploadResult {
  id: string;
  mediaId?: string;
  url?: string;
  fileName?: string;
}

export async function uploadMedia(file: FormData): Promise<MediaUploadResult> {
  const response = await requestJson<ApiResponse<MediaUploadResult>>('/media/upload', 'POST', file, true);
  return {
    ...response.data,
    id: response.data.mediaId ?? response.data.id,
  };
}

export async function uploadMediaMultiple(file: FormData): Promise<MediaUploadResult[]> {
  const response = await requestJson<ApiResponse<MediaUploadResult[]>>('/media/upload-multiple', 'POST', file, true);
  return response.data;
}

export default {
  uploadMedia,
  uploadMediaMultiple,
};