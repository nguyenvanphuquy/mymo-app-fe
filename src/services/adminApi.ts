/** Admin portal permission catalog — synced with BE EXE.Domain.Constants.AdminPermissions */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ADMIN_PORTAL_KEY, getStoredAuthSession, type AuthResponse } from './authApi';

export type ActorId = 'admin' | 'user' | 'business';

export type Permission =
  | 'admin.portal'
  | 'admin.users.manage'
  | 'admin.actors.manage'
  | 'admin.reports.manage'
  | 'admin.settings.manage'
  | 'admin.billing.manage'
  | 'app.login'
  | 'app.profile'
  | 'app.map.view'
  | 'app.chat'
  | 'b2c.moments.post'
  | 'b2c.friends'
  | 'b2c.location.share'
  | 'b2b.business.profile'
  | 'b2b.places.manage'
  | 'b2b.events.manage'
  | 'b2b.analytics.view';

export type PermissionGroupId = 'admin' | 'app' | 'b2c' | 'b2b';

export type PermissionMeta = {
  id: Permission;
  group: PermissionGroupId;
  level: 'read' | 'write' | 'danger';
};

export const PERMISSION_CATALOG: PermissionMeta[] = [
  { id: 'admin.portal', group: 'admin', level: 'danger' },
  { id: 'admin.users.manage', group: 'admin', level: 'danger' },
  { id: 'admin.actors.manage', group: 'admin', level: 'danger' },
  { id: 'admin.reports.manage', group: 'admin', level: 'write' },
  { id: 'admin.settings.manage', group: 'admin', level: 'danger' },
  { id: 'admin.billing.manage', group: 'admin', level: 'danger' },
  { id: 'app.login', group: 'app', level: 'read' },
  { id: 'app.profile', group: 'app', level: 'write' },
  { id: 'app.map.view', group: 'app', level: 'read' },
  { id: 'app.chat', group: 'app', level: 'write' },
  { id: 'b2c.moments.post', group: 'b2c', level: 'write' },
  { id: 'b2c.friends', group: 'b2c', level: 'write' },
  { id: 'b2c.location.share', group: 'b2c', level: 'write' },
  { id: 'b2b.business.profile', group: 'b2b', level: 'write' },
  { id: 'b2b.places.manage', group: 'b2b', level: 'write' },
  { id: 'b2b.events.manage', group: 'b2b', level: 'write' },
  { id: 'b2b.analytics.view', group: 'b2b', level: 'read' },
];

export const ALL_PERMISSIONS: Permission[] = PERMISSION_CATALOG.map(p => p.id);

export const PERMISSION_GROUPS: PermissionGroupId[] = ['admin', 'app', 'b2c', 'b2b'];

export type AdminSession = {
  username: string;
  roleId: ActorId;
  loggedInAt: string;
};

export const ADMIN_BOOTSTRAP = {
  username: 'admin',
  email: 'admin@mymo.app',
  password: 'admin123',
} as const;

const ADMIN_PERMISSIONS_KEY = 'mymo.adminPermissions';

/** Matches BE AdminPermissions.All — used when API/JWT has no perm yet (legacy build). */
export const ADMIN_ROLE_PERMISSIONS: Permission[] = [
  'admin.portal',
  'admin.users.manage',
  'admin.actors.manage',
  'admin.reports.manage',
  'admin.settings.manage',
  'admin.billing.manage',
];

function decodeJwtPayload(accessToken: string): Record<string, unknown> | null {
  try {
    const parts = accessToken.split('.');
    if (parts.length < 2) return null;
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    if (pad) base64 += '='.repeat(4 - pad);
    let json: string;
    if (typeof globalThis.atob === 'function') {
      json = globalThis.atob(base64);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Buffer } = require('buffer') as typeof import('buffer');
      json = Buffer.from(base64, 'base64').toString('utf8');
    }
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function decodeJwtPermissions(accessToken: string): string[] {
  const payload = decodeJwtPayload(accessToken);
  if (!payload) return [];
  const perm = payload.perm ?? payload.Perm;
  if (Array.isArray(perm)) return perm.map(String);
  if (typeof perm === 'string') return [perm];
  return [];
}

function normalizePermissionList(raw: string[]): Permission[] {
  return raw.filter(p => ALL_PERMISSIONS.includes(p as Permission)) as Permission[];
}

function mergeAdminPermissions(auth: AuthResponse | null): Permission[] {
  const fromApi = auth?.permissions ?? [];
  const fromJwt = auth?.accessToken ? decodeJwtPermissions(auth.accessToken) : [];
  let merged = normalizePermissionList([...new Set([...fromApi, ...fromJwt])]);
  const role = auth?.role ?? '';
  if (role === 'Admin' && !merged.some(p => p.startsWith('admin.'))) {
    merged = [...ADMIN_ROLE_PERMISSIONS];
  }
  return merged;
}

export async function persistAdminPermissions(auth: AuthResponse): Promise<void> {
  const merged = mergeAdminPermissions(auth);
  await AsyncStorage.setItem(ADMIN_PERMISSIONS_KEY, JSON.stringify(merged));
}

export async function getStoredAdminPermissions(): Promise<Permission[]> {
  const auth = await getStoredAuthSession();
  const raw = await AsyncStorage.getItem(ADMIN_PERMISSIONS_KEY);
  let fromStorage: string[] = [];
  if (raw) {
    try {
      fromStorage = JSON.parse(raw) as string[];
    } catch {
      fromStorage = [];
    }
  }
  const merged = mergeAdminPermissions(
    auth
      ? {
          ...auth,
          permissions: [...new Set([...(auth.permissions ?? []), ...fromStorage])],
        }
      : null,
  );
  if (merged.length > 0 && auth?.role === 'Admin') {
    await AsyncStorage.setItem(ADMIN_PERMISSIONS_KEY, JSON.stringify(merged));
  }
  return merged;
}

export async function clearAdminSession(): Promise<void> {
  await AsyncStorage.removeItem(ADMIN_PERMISSIONS_KEY);
}

export async function syncAdminSessionAfterBackendLogin(email: string): Promise<AdminSession> {
  const trimmed = email.trim();
  const username = trimmed.includes('@') ? trimmed.split('@')[0] : trimmed;
  return {
    username,
    roleId: 'admin',
    loggedInAt: new Date().toISOString(),
  };
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const portal = await AsyncStorage.getItem(ADMIN_PORTAL_KEY);
  const auth = await getStoredAuthSession();
  if (portal !== '1' || !auth || auth.role !== 'Admin') return null;
  const email = auth.email || auth.username;
  return syncAdminSessionAfterBackendLogin(email);
}

export async function getSessionPermissions(_session?: AdminSession | null): Promise<Permission[]> {
  return getStoredAdminPermissions();
}

export function hasPermission(permissions: Permission[], needed: Permission): boolean {
  return permissions.includes(needed) || permissions.includes('admin.portal');
}

export function canManageUsers(permissions: Permission[]): boolean {
  return hasPermission(permissions, 'admin.users.manage');
}

export function canManageActors(permissions: Permission[]): boolean {
  return hasPermission(permissions, 'admin.actors.manage');
}

export function canManageReports(permissions: Permission[]): boolean {
  return hasPermission(permissions, 'admin.reports.manage');
}

export function canManageSettings(permissions: Permission[]): boolean {
  return hasPermission(permissions, 'admin.settings.manage');
}

export function canManageBilling(permissions: Permission[]): boolean {
  return hasPermission(permissions, 'admin.billing.manage');
}

export function canAccessAdminPortal(permissions: Permission[]): boolean {
  return hasPermission(permissions, 'admin.portal');
}

export function permissionsByGroup(group: PermissionGroupId): PermissionMeta[] {
  return PERMISSION_CATALOG.filter(p => p.group === group);
}
