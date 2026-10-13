import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/apiConfig';

export type AdminDashboardData = {
  users: {
    total: number;
    active: number;
    inactive: number;
    banned: number;
    admins: number;
    businessOwners: number;
    customers: number;
  };
  queues: {
    pendingBusinesses: number;
    pendingPlaces: number;
    pendingReports: number;
  };
  payments: {
    pendingCount: number;
    pendingAmountVnd: number;
    successCount: number;
    successAmountVnd: number;
  };
};

async function authHeaders(): Promise<Record<string, string>> {
  const token = await AsyncStorage.getItem('mymo.accessToken');
  const headers: Record<string, string> = { Accept: '*/*' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function num(raw: unknown): number {
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

export async function fetchAdminDashboard(): Promise<AdminDashboardData> {
  const response = await fetch(`${API_URL}/admin/dashboard`, {
    method: 'GET',
    headers: await authHeaders(),
  });
  const rawText = await response.text();
  const data = rawText ? JSON.parse(rawText) : {};
  if (!response.ok) throw new Error(data.message ?? data.Message ?? 'Failed to load dashboard');

  const p = (data.data ?? data.Data ?? {}) as Record<string, unknown>;
  const users = (p.users ?? p.Users ?? {}) as Record<string, unknown>;
  const queues = (p.queues ?? p.Queues ?? {}) as Record<string, unknown>;
  const payments = (p.payments ?? p.Payments ?? {}) as Record<string, unknown>;

  return {
    users: {
      total: num(users.total ?? users.Total),
      active: num(users.active ?? users.Active),
      inactive: num(users.inactive ?? users.Inactive),
      banned: num(users.banned ?? users.Banned),
      admins: num(users.admins ?? users.Admins),
      businessOwners: num(users.businessOwners ?? users.BusinessOwners),
      customers: num(users.customers ?? users.Customers),
    },
    queues: {
      pendingBusinesses: num(queues.pendingBusinesses ?? queues.PendingBusinesses),
      pendingPlaces: num(queues.pendingPlaces ?? queues.PendingPlaces),
      pendingReports: num(queues.pendingReports ?? queues.PendingReports),
    },
    payments: {
      pendingCount: num(payments.pendingCount ?? payments.PendingCount),
      pendingAmountVnd: num(payments.pendingAmountVnd ?? payments.PendingAmountVnd),
      successCount: num(payments.successCount ?? payments.SuccessCount),
      successAmountVnd: num(payments.successAmountVnd ?? payments.SuccessAmountVnd),
    },
  };
}
