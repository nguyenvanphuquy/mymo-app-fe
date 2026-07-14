/** Temporary in-memory mock — 3 actors: Admin, User (B2C), Business (B2B) */

export type ActorId = 'admin' | 'user' | 'business';

export type Permission =
  // Admin portal
  | 'admin.portal'
  | 'admin.users.manage'
  | 'admin.actors.manage'
  | 'admin.reports.manage'
  | 'admin.settings.manage'
  // Shared / app
  | 'app.login'
  | 'app.profile'
  | 'app.map.view'
  | 'app.chat'
  // User (B2C)
  | 'b2c.moments.post'
  | 'b2c.friends'
  | 'b2c.location.share'
  // Business (B2B)
  | 'b2b.business.profile'
  | 'b2b.places.manage'
  | 'b2b.events.manage'
  | 'b2b.analytics.view';

export type PermissionGroupId =
  | 'admin'
  | 'app'
  | 'b2c'
  | 'b2b';

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

/** Role = Actor type in the product */
export type AdminRole = {
  id: ActorId;
  name: string;
  segment: 'internal' | 'b2c' | 'b2b';
  description: string;
  color: string;
  permissions: Permission[];
  locked?: boolean;
};

export type AdminUserStatus = 'active' | 'inactive' | 'banned';

export type AdminUser = {
  id: string;
  username: string;
  email: string;
  displayName: string;
  phone: string;
  /** Actor type: admin | user | business */
  roleId: ActorId;
  /** B2B only — company / brand name */
  businessName: string;
  status: AdminUserStatus;
  createdAt: string;
  lastLoginAt: string | null;
  notes: string;
  password: string;
};

export type AdminSession = {
  username: string;
  roleId: ActorId;
  loggedInAt: string;
};

export const ADMIN_BOOTSTRAP = {
  username: 'admin',
  password: 'admin123',
} as const;

const MOCK_ROLES: AdminRole[] = [
  {
    id: 'admin',
    name: 'Admin',
    segment: 'internal',
    description: 'Quản trị hệ thống — truy cập cổng Admin, quản lý user & actor',
    color: '#7C5BFF',
    permissions: [
      'admin.portal',
      'admin.users.manage',
      'admin.actors.manage',
      'admin.reports.manage',
      'admin.settings.manage',
      'app.login',
      'app.profile',
      'app.map.view',
    ],
    locked: true,
  },
  {
    id: 'user',
    name: 'User (B2C)',
    segment: 'b2c',
    description: 'Người dùng cá nhân — chia sẻ moment, bạn bè, vị trí, chat',
    color: '#0EA5E9',
    permissions: [
      'app.login',
      'app.profile',
      'app.map.view',
      'app.chat',
      'b2c.moments.post',
      'b2c.friends',
      'b2c.location.share',
    ],
  },
  {
    id: 'business',
    name: 'Business (B2B)',
    segment: 'b2b',
    description: 'Doanh nghiệp — hồ sơ brand, địa điểm, sự kiện, analytics',
    color: '#10B981',
    permissions: [
      'app.login',
      'app.profile',
      'app.map.view',
      'app.chat',
      'b2b.business.profile',
      'b2b.places.manage',
      'b2b.events.manage',
      'b2b.analytics.view',
    ],
  },
];

const MOCK_USERS: AdminUser[] = [
  {
    id: 'u_admin',
    username: 'admin',
    email: 'admin@mymo.app',
    displayName: 'System Admin',
    phone: '+84 900 000 001',
    roleId: 'admin',
    businessName: '',
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
    lastLoginAt: '2026-07-14T10:00:00.000Z',
    notes: 'Tài khoản Admin hệ thống — không xóa',
    password: 'admin123',
  },
  {
    id: 'u_b2c_1',
    username: 'lan.nguyen',
    email: 'lan.nguyen@gmail.com',
    displayName: 'Nguyễn Thị Lan',
    phone: '+84 912 345 678',
    roleId: 'user',
    businessName: '',
    status: 'active',
    createdAt: '2026-02-12T08:30:00.000Z',
    lastLoginAt: '2026-07-13T18:20:00.000Z',
    notes: 'User B2C — dùng app thường xuyên',
    password: 'user123',
  },
  {
    id: 'u_b2c_2',
    username: 'minh.tran',
    email: 'minh.tran@email.com',
    displayName: 'Trần Minh Quân',
    phone: '+84 933 222 111',
    roleId: 'user',
    businessName: '',
    status: 'active',
    createdAt: '2026-03-05T09:00:00.000Z',
    lastLoginAt: '2026-07-14T07:45:00.000Z',
    notes: 'User B2C',
    password: 'user123',
  },
  {
    id: 'u_b2b_1',
    username: 'cafe.momo',
    email: 'hello@cafemomo.vn',
    displayName: 'Cafe MoMo',
    phone: '+84 28 1234 5678',
    roleId: 'business',
    businessName: 'Cafe MoMo Co., Ltd',
    status: 'active',
    createdAt: '2026-04-18T11:00:00.000Z',
    lastLoginAt: '2026-07-12T15:10:00.000Z',
    notes: 'Business B2B — quản lý 2 chi nhánh',
    password: 'biz123',
  },
  {
    id: 'u_b2b_2',
    username: 'sunset.rooftop',
    email: 'partner@sunset.vn',
    displayName: 'Sunset Rooftop',
    phone: '+84 90 555 1212',
    roleId: 'business',
    businessName: 'Sunset Hospitality JSC',
    status: 'active',
    createdAt: '2026-05-01T00:00:00.000Z',
    lastLoginAt: '2026-07-10T09:00:00.000Z',
    notes: 'Business B2B — tạo sự kiện cuối tuần',
    password: 'biz123',
  },
  {
    id: 'u_banned',
    username: 'spam.bot',
    email: 'spam@example.com',
    displayName: 'Spam Account',
    phone: '',
    roleId: 'user',
    businessName: '',
    status: 'banned',
    createdAt: '2026-06-20T00:00:00.000Z',
    lastLoginAt: null,
    notes: 'User B2C bị cấm vì spam',
    password: 'user123',
  },
];

let rolesStore: AdminRole[] = MOCK_ROLES.map(r => ({
  ...r,
  permissions: [...r.permissions],
}));
let usersStore: AdminUser[] = MOCK_USERS.map(u => ({ ...u }));
let sessionStore: AdminSession | null = null;

export async function getAdminSession(): Promise<AdminSession | null> {
  return sessionStore;
}

export async function clearAdminSession(): Promise<void> {
  sessionStore = null;
}

export async function loginAdmin(username: string, password: string): Promise<AdminSession> {
  const user = username.trim().toLowerCase();
  const pass = password;

  if (user === ADMIN_BOOTSTRAP.username && pass === ADMIN_BOOTSTRAP.password) {
    sessionStore = {
      username: ADMIN_BOOTSTRAP.username,
      roleId: 'admin',
      loggedInAt: new Date().toISOString(),
    };
    usersStore = usersStore.map(u =>
      u.username === ADMIN_BOOTSTRAP.username
        ? { ...u, lastLoginAt: sessionStore!.loggedInAt }
        : u,
    );
    return sessionStore;
  }

  throw new Error('INVALID_CREDENTIALS');
}

export async function listAdminRoles(): Promise<AdminRole[]> {
  return rolesStore.map(r => ({ ...r, permissions: [...r.permissions] }));
}

export async function listAdminUsers(): Promise<AdminUser[]> {
  return usersStore.map(u => ({ ...u }));
}

export async function getSessionPermissions(session: AdminSession | null): Promise<Permission[]> {
  if (!session) return [];
  const role = rolesStore.find(r => r.id === session.roleId);
  return role ? [...role.permissions] : [];
}

export function hasPermission(permissions: Permission[], needed: Permission): boolean {
  return permissions.includes(needed);
}

/** Portal capability helpers derived from actor permissions */
export function canManageUsers(permissions: Permission[]): boolean {
  return hasPermission(permissions, 'admin.users.manage') || hasPermission(permissions, 'admin.portal');
}

export function canManageActors(permissions: Permission[]): boolean {
  return hasPermission(permissions, 'admin.actors.manage') || hasPermission(permissions, 'admin.portal');
}

export function canAccessAdminPortal(permissions: Permission[]): boolean {
  return hasPermission(permissions, 'admin.portal');
}

export type CreateAdminUserInput = {
  username: string;
  email: string;
  displayName: string;
  phone?: string;
  roleId: ActorId;
  businessName?: string;
  password: string;
  status?: AdminUserStatus;
  notes?: string;
};

export async function createAdminUser(input: CreateAdminUserInput): Promise<AdminUser> {
  const username = input.username.trim().toLowerCase();
  const email = input.email.trim().toLowerCase();

  if (!username || !email || !input.displayName.trim() || !input.password) {
    throw new Error('VALIDATION');
  }
  if (input.roleId === 'business' && !(input.businessName ?? '').trim()) {
    throw new Error('BUSINESS_NAME_REQUIRED');
  }
  if (usersStore.some(u => u.username.toLowerCase() === username)) {
    throw new Error('USERNAME_EXISTS');
  }
  if (usersStore.some(u => u.email.toLowerCase() === email)) {
    throw new Error('EMAIL_EXISTS');
  }
  if (!rolesStore.some(r => r.id === input.roleId)) {
    throw new Error('INVALID_ROLE');
  }

  const user: AdminUser = {
    id: `u_${Date.now()}`,
    username: input.username.trim(),
    email: input.email.trim(),
    displayName: input.displayName.trim(),
    phone: (input.phone ?? '').trim(),
    roleId: input.roleId,
    businessName: input.roleId === 'business' ? (input.businessName ?? '').trim() : '',
    status: input.status ?? 'active',
    createdAt: new Date().toISOString(),
    lastLoginAt: null,
    notes: (input.notes ?? '').trim(),
    password: input.password,
  };

  usersStore = [user, ...usersStore];
  return { ...user };
}

export type UpdateAdminUserInput = Partial<Omit<AdminUser, 'id' | 'createdAt'>> & { id: string };

export async function updateAdminUser(input: UpdateAdminUserInput): Promise<AdminUser> {
  const idx = usersStore.findIndex(u => u.id === input.id);
  if (idx < 0) throw new Error('NOT_FOUND');

  const current = usersStore[idx];
  const nextUsername = (input.username ?? current.username).trim();
  const nextEmail = (input.email ?? current.email).trim();
  const nextRoleId = (input.roleId ?? current.roleId) as ActorId;
  const nextBusinessName =
    input.businessName !== undefined ? input.businessName.trim() : current.businessName;

  if (
    usersStore.some(
      u => u.id !== input.id && u.username.toLowerCase() === nextUsername.toLowerCase(),
    )
  ) {
    throw new Error('USERNAME_EXISTS');
  }
  if (
    usersStore.some(u => u.id !== input.id && u.email.toLowerCase() === nextEmail.toLowerCase())
  ) {
    throw new Error('EMAIL_EXISTS');
  }
  if (!rolesStore.some(r => r.id === nextRoleId)) {
    throw new Error('INVALID_ROLE');
  }
  if (nextRoleId === 'business' && !nextBusinessName) {
    throw new Error('BUSINESS_NAME_REQUIRED');
  }

  const updated: AdminUser = {
    ...current,
    username: nextUsername,
    email: nextEmail,
    displayName: (input.displayName ?? current.displayName).trim(),
    phone: input.phone !== undefined ? input.phone.trim() : current.phone,
    roleId: nextRoleId,
    businessName: nextRoleId === 'business' ? nextBusinessName : '',
    status: input.status ?? current.status,
    notes: input.notes !== undefined ? input.notes.trim() : current.notes,
    lastLoginAt: input.lastLoginAt !== undefined ? input.lastLoginAt : current.lastLoginAt,
    password: input.password?.trim() ? input.password.trim() : current.password,
  };

  usersStore = usersStore.map((u, i) => (i === idx ? updated : u));
  return { ...updated };
}

export async function deleteAdminUser(id: string, session: AdminSession): Promise<void> {
  const target = usersStore.find(u => u.id === id);
  if (!target) throw new Error('NOT_FOUND');
  if (target.username.toLowerCase() === session.username.toLowerCase()) {
    throw new Error('CANNOT_DELETE_SELF');
  }
  if (target.username === ADMIN_BOOTSTRAP.username) {
    throw new Error('CANNOT_DELETE_BOOTSTRAP');
  }
  usersStore = usersStore.filter(u => u.id !== id);
}

export async function updateRolePermissions(
  roleId: string,
  permissions: Permission[],
): Promise<AdminRole> {
  const idx = rolesStore.findIndex(r => r.id === roleId);
  if (idx < 0) throw new Error('NOT_FOUND');
  if (rolesStore[idx].locked) throw new Error('ROLE_LOCKED');

  const updated: AdminRole = {
    ...rolesStore[idx],
    permissions: [...new Set(permissions)],
  };
  rolesStore = rolesStore.map((r, i) => (i === idx ? updated : r));
  return { ...updated, permissions: [...updated.permissions] };
}

export function permissionsByGroup(group: PermissionGroupId): PermissionMeta[] {
  return PERMISSION_CATALOG.filter(p => p.group === group);
}
