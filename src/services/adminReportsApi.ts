import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/apiConfig';

export type ReportStatus = 'Pending' | 'Reviewed' | 'Resolved' | 'Dismissed';

export type ReportTargetType = 'User' | 'Post' | 'Comment' | 'Place' | 'Review';

export interface AdminReportItem {
  reportId: string;
  reporterId: string;
  reporterDisplayName: string | null;
  targetType: ReportTargetType;
  targetId: string;
  targetSummary: string | null;
  reason: string;
  status: ReportStatus;
  createdAt: string;
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
  const data = rawText ? JSON.parse(rawText) : {};
  if (!response.ok) {
    throw new Error(data?.message ?? 'Request failed');
  }
  return data as ApiResponse<T>;
}

function normalizeItem(raw: Record<string, unknown>): AdminReportItem {
  return {
    reportId: String(raw.reportId ?? raw.ReportId ?? ''),
    reporterId: String(raw.reporterId ?? raw.ReporterId ?? ''),
    reporterDisplayName: (raw.reporterDisplayName ?? raw.ReporterDisplayName ?? null) as string | null,
    targetType: String(raw.targetType ?? raw.TargetType ?? 'Post') as ReportTargetType,
    targetId: String(raw.targetId ?? raw.TargetId ?? ''),
    targetSummary: (raw.targetSummary ?? raw.TargetSummary ?? null) as string | null,
    reason: String(raw.reason ?? raw.Reason ?? ''),
    status: String(raw.status ?? raw.Status ?? 'Pending') as ReportStatus,
    createdAt: String(raw.createdAt ?? raw.CreatedAt ?? ''),
  };
}

export async function listAdminReports(status?: ReportStatus): Promise<AdminReportItem[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  const res = await requestJson<Record<string, unknown>[]>(`/admin/reports${query}`, 'GET');
  return (res.data ?? []).map(item => normalizeItem(item as Record<string, unknown>));
}

export async function updateAdminReportStatus(
  reportId: string,
  status: ReportStatus,
): Promise<AdminReportItem> {
  const res = await requestJson<Record<string, unknown>>(
    `/admin/reports/${reportId}/status`,
    'PUT',
    { status },
  );
  return normalizeItem((res.data ?? {}) as Record<string, unknown>);
}
