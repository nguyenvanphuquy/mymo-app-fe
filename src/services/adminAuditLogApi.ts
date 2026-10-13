import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/apiConfig';

export type AdminAuditAction = 'Create' | 'Update' | 'Delete';

export type AdminAuditLogSummary = {
  last24Hours: number;
  createCount: number;
  updateCount: number;
  deleteCount: number;
};

export type AdminAuditLogItem = {
  auditLogId: string;
  userId: string;
  actorDisplayName: string | null;
  actorEmail: string | null;
  action: AdminAuditAction;
  entityName: string;
  entityId: string;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
};

export type AdminAuditLogPage = {
  totalCount: number;
  summary: AdminAuditLogSummary;
  items: AdminAuditLogItem[];
};

async function authHeaders(): Promise<Record<string, string>> {
  const token = await AsyncStorage.getItem('mymo.accessToken');
  const headers: Record<string, string> = {
    Accept: '*/*',
    'Content-Type': 'application/json',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function normalizeAction(raw: unknown): AdminAuditAction {
  const s = String(raw ?? 'Update');
  if (s === 'Create' || s === 'Delete' || s === 'Update') return s;
  return 'Update';
}

function normalizeSummary(raw: Record<string, unknown> | null | undefined): AdminAuditLogSummary {
  const s = raw ?? {};
  return {
    last24Hours: Number(s.last24Hours ?? s.Last24Hours ?? 0),
    createCount: Number(s.createCount ?? s.CreateCount ?? 0),
    updateCount: Number(s.updateCount ?? s.UpdateCount ?? 0),
    deleteCount: Number(s.deleteCount ?? s.DeleteCount ?? 0),
  };
}

function normalizeItem(raw: Record<string, unknown>): AdminAuditLogItem {
  return {
    auditLogId: String(raw.auditLogId ?? raw.AuditLogId ?? ''),
    userId: String(raw.userId ?? raw.UserId ?? ''),
    actorDisplayName: (raw.actorDisplayName ?? raw.ActorDisplayName ?? null) as string | null,
    actorEmail: (raw.actorEmail ?? raw.ActorEmail ?? null) as string | null,
    action: normalizeAction(raw.action ?? raw.Action),
    entityName: String(raw.entityName ?? raw.EntityName ?? ''),
    entityId: String(raw.entityId ?? raw.EntityId ?? ''),
    oldValue: (raw.oldValue ?? raw.OldValue ?? null) as string | null,
    newValue: (raw.newValue ?? raw.NewValue ?? null) as string | null,
    createdAt: String(raw.createdAt ?? raw.CreatedAt ?? ''),
  };
}

export async function fetchAdminAuditLogs(options?: {
  action?: AdminAuditAction;
  entityName?: string;
  page?: number;
  pageSize?: number;
}): Promise<AdminAuditLogPage> {
  const params = new URLSearchParams();
  if (options?.action) params.set('action', options.action);
  if (options?.entityName?.trim()) params.set('entityName', options.entityName.trim());
  if (options?.page != null) params.set('page', String(options.page));
  if (options?.pageSize != null) params.set('pageSize', String(options.pageSize));

  const qs = params.toString();
  const url = `${API_URL}/admin/audit-logs${qs ? `?${qs}` : ''}`;
  const response = await fetch(url, { method: 'GET', headers: await authHeaders() });
  const rawText = await response.text();
  const data = rawText ? JSON.parse(rawText) : {};
  if (!response.ok) throw new Error(data.message ?? data.Message ?? 'Failed to load audit logs');

  const payload = (data.data ?? data.Data ?? {}) as Record<string, unknown>;
  const itemsRaw = (payload.items ?? payload.Items ?? []) as Record<string, unknown>[];
  return {
    totalCount: Number(payload.totalCount ?? payload.TotalCount ?? itemsRaw.length),
    summary: normalizeSummary(payload.summary as Record<string, unknown> | undefined),
    items: itemsRaw.map(normalizeItem),
  };
}
