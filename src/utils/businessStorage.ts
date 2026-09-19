import AsyncStorage from '@react-native-async-storage/async-storage';

/** TODO: MapScreen Events chip can later read mymo.businessEvents. */

export type BusinessVibe = 'chill' | 'study' | 'date' | 'party' | 'workout';
export type BusinessCategory = 'cafe' | 'rooftop' | 'studio' | 'other';
export type ApplicationStatus = 'pending' | 'approved' | 'rejected';

export const PARTNER_YEARLY_PRICE = 999000;

export const BUSINESS_VIBES: { id: BusinessVibe; label: string; emoji: string }[] = [
  { id: 'chill', label: 'Chill', emoji: '🌸' },
  { id: 'study', label: 'Study', emoji: '📚' },
  { id: 'date', label: 'Date', emoji: '💕' },
  { id: 'party', label: 'Party', emoji: '🎉' },
  { id: 'workout', label: 'Workout', emoji: '💪' },
];

export const BUSINESS_CATEGORIES: BusinessCategory[] = ['cafe', 'rooftop', 'studio', 'other'];

export interface BusinessApplication {
  id: string;
  applicantUserId: string;
  applicantEmail: string;
  applicantName: string;
  businessName: string;
  displayName: string;
  category: BusinessCategory;
  address: string;
  phone: string;
  vibe: BusinessVibe;
  notes: string;
  status: ApplicationStatus;
  createdAt: string;
  reviewedAt: string | null;
  rejectReason: string | null;
  issuedUsername: string | null;
  issuedPassword: string | null;
  issuedAccountId: string | null;
}

export interface BusinessAccount {
  id: string;
  username: string;
  email: string;
  password: string;
  displayName: string;
  businessName: string;
  phone: string;
  category: BusinessCategory;
  vibe: BusinessVibe;
  address: string;
  verified: boolean;
  applicationId: string | null;
  status: 'active' | 'inactive';
}

export interface BusinessSession {
  accountId: string;
  username: string;
  displayName: string;
  businessName: string;
  loggedInAt: string;
}

export interface BusinessPlace {
  id: string;
  accountId: string;
  name: string;
  address: string;
  hours: string;
  vibe: BusinessVibe;
  isOpen: boolean;
}

export interface BusinessEvent {
  id: string;
  accountId: string;
  title: string;
  startsAt: string;
  vibe: BusinessVibe;
  placeId: string;
  coverNote: string;
}

const KEYS = {
  applications: 'mymo.businessApplications',
  accounts: 'mymo.businessAccounts',
  session: 'mymo.businessSession',
  places: 'mymo.businessPlaces',
  events: 'mymo.businessEvents',
} as const;

const SEED_ACCOUNTS: BusinessAccount[] = [
  {
    id: 'biz_cafe_momo',
    username: 'cafe.momo',
    email: 'hello@cafemomo.vn',
    password: 'biz123',
    displayName: 'Cafe MoMo',
    businessName: 'Cafe MoMo Co., Ltd',
    phone: '+84 28 1234 5678',
    category: 'cafe',
    vibe: 'chill',
    address: '12 Nguyễn Huệ, Quận 1, TP.HCM',
    verified: true,
    applicationId: null,
    status: 'active',
  },
  {
    id: 'biz_sunset',
    username: 'sunset.rooftop',
    email: 'partner@sunset.vn',
    password: 'biz123',
    displayName: 'Sunset Rooftop',
    businessName: 'Sunset Hospitality JSC',
    phone: '+84 90 555 1212',
    category: 'rooftop',
    vibe: 'date',
    address: '88 Lê Lợi, Quận 1, TP.HCM',
    verified: true,
    applicationId: null,
    status: 'active',
  },
];

const SEED_PLACES: BusinessPlace[] = [
  {
    id: 'place_momo_q1',
    accountId: 'biz_cafe_momo',
    name: 'Cafe MoMo Nguyễn Huệ',
    address: '12 Nguyễn Huệ, Quận 1, TP.HCM',
    hours: '07:00 – 22:00',
    vibe: 'chill',
    isOpen: true,
  },
  {
    id: 'place_momo_q3',
    accountId: 'biz_cafe_momo',
    name: 'Cafe MoMo Võ Văn Tần',
    address: '45 Võ Văn Tần, Quận 3, TP.HCM',
    hours: '08:00 – 21:00',
    vibe: 'study',
    isOpen: true,
  },
  {
    id: 'place_sunset',
    accountId: 'biz_sunset',
    name: 'Sunset Rooftop',
    address: '88 Lê Lợi, Quận 1, TP.HCM',
    hours: '16:00 – 01:00',
    vibe: 'date',
    isOpen: true,
  },
];

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

async function ensureSeeded(): Promise<void> {
  const existing = await AsyncStorage.getItem(KEYS.accounts);
  if (existing) return;
  await writeJson(KEYS.accounts, SEED_ACCOUNTS);
  await writeJson(KEYS.places, SEED_PLACES);
  const events = await readJson<BusinessEvent[]>(KEYS.events, []);
  if (events.length === 0) await writeJson(KEYS.events, []);
}

export async function listApplications(): Promise<BusinessApplication[]> {
  return readJson<BusinessApplication[]>(KEYS.applications, []);
}

export async function getApplicationForUser(userId: string): Promise<BusinessApplication | null> {
  const all = await listApplications();
  const mine = all.filter(a => a.applicantUserId === userId);
  if (!mine.length) return null;
  return mine.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

export async function submitApplication(
  input: Omit<
    BusinessApplication,
    'id' | 'status' | 'createdAt' | 'reviewedAt' | 'rejectReason' | 'issuedUsername' | 'issuedPassword' | 'issuedAccountId'
  >,
): Promise<BusinessApplication> {
  const all = await listApplications();
  const latest = all
    .filter(a => a.applicantUserId === input.applicantUserId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  if (latest?.status === 'pending' || latest?.status === 'approved') {
    throw new Error('APPLICATION_EXISTS');
  }

  const app: BusinessApplication = {
    ...input,
    id: `app_${Date.now()}`,
    status: 'pending',
    createdAt: new Date().toISOString(),
    reviewedAt: null,
    rejectReason: null,
    issuedUsername: null,
    issuedPassword: null,
    issuedAccountId: null,
  };
  await writeJson(KEYS.applications, [app, ...all]);
  return app;
}

export async function rejectApplication(id: string, reason: string): Promise<BusinessApplication> {
  const all = await listApplications();
  const idx = all.findIndex(a => a.id === id);
  if (idx < 0) throw new Error('NOT_FOUND');
  const updated: BusinessApplication = {
    ...all[idx],
    status: 'rejected',
    reviewedAt: new Date().toISOString(),
    rejectReason: reason.trim(),
  };
  const next = [...all];
  next[idx] = updated;
  await writeJson(KEYS.applications, next);
  return updated;
}

export function slugifyBusiness(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.|\.$/g, '')
    .slice(0, 18);
  return slug || 'partner';
}

export function generateTempPassword(): string {
  const n = Math.floor(1000 + Math.random() * 9000);
  return `biz${n}`;
}

export async function listBusinessAccounts(): Promise<BusinessAccount[]> {
  await ensureSeeded();
  return readJson<BusinessAccount[]>(KEYS.accounts, SEED_ACCOUNTS);
}

export async function issueBusinessAccount(app: BusinessApplication): Promise<{
  application: BusinessApplication;
  account: BusinessAccount;
}> {
  const currentApps = await listApplications();
  const current = currentApps.find(a => a.id === app.id);
  if (!current) throw new Error('NOT_FOUND');
  if (current.status !== 'pending') throw new Error('NOT_PENDING');

  await ensureSeeded();
  const accounts = await listBusinessAccounts();
  let base = slugifyBusiness(app.displayName || app.businessName);
  let username = base;
  let i = 1;
  while (accounts.some(a => a.username.toLowerCase() === username.toLowerCase())) {
    username = `${base}${i}`;
    i += 1;
  }
  const password = generateTempPassword();
  const email = `partner.${username}@mymo.app`;
  const account: BusinessAccount = {
    id: `biz_${Date.now()}`,
    username,
    email,
    password,
    displayName: app.displayName.trim(),
    businessName: app.businessName.trim(),
    phone: app.phone.trim(),
    category: app.category,
    vibe: app.vibe,
    address: app.address.trim(),
    verified: true,
    applicationId: app.id,
    status: 'active',
  };

  const place: BusinessPlace = {
    id: `place_${Date.now()}`,
    accountId: account.id,
    name: app.displayName.trim(),
    address: app.address.trim(),
    hours: '08:00 – 22:00',
    vibe: app.vibe,
    isOpen: true,
  };

  await writeJson(KEYS.accounts, [account, ...accounts]);
  const places = await listPlaces();
  await writeJson(KEYS.places, [place, ...places]);

  const all = await listApplications();
  const idx = all.findIndex(a => a.id === app.id);
  if (idx < 0) throw new Error('NOT_FOUND');
  if (all[idx].status !== 'pending') throw new Error('NOT_PENDING');
  const updated: BusinessApplication = {
    ...all[idx],
    status: 'approved',
    reviewedAt: new Date().toISOString(),
    issuedUsername: username,
    issuedPassword: password,
    issuedAccountId: account.id,
  };
  const next = [...all];
  next[idx] = updated;
  await writeJson(KEYS.applications, next);
  return { application: updated, account };
}

export async function loginBusiness(username: string, password: string): Promise<BusinessSession> {
  await ensureSeeded();
  const accounts = await listBusinessAccounts();
  const user = username.trim().toLowerCase();
  const match = accounts.find(
    a =>
      a.status === 'active' &&
      (a.username.toLowerCase() === user || a.email.toLowerCase() === user) &&
      a.password === password,
  );
  if (!match) throw new Error('INVALID_CREDENTIALS');
  const session: BusinessSession = {
    accountId: match.id,
    username: match.username,
    displayName: match.displayName,
    businessName: match.businessName,
    loggedInAt: new Date().toISOString(),
  };
  await writeJson(KEYS.session, session);
  return session;
}

export async function getBusinessSession(): Promise<BusinessSession | null> {
  return readJson<BusinessSession | null>(KEYS.session, null);
}

export async function clearBusinessSession(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.session);
}

export async function getBusinessAccount(accountId: string): Promise<BusinessAccount | null> {
  const accounts = await listBusinessAccounts();
  return accounts.find(a => a.id === accountId) ?? null;
}

export async function listPlaces(accountId?: string): Promise<BusinessPlace[]> {
  await ensureSeeded();
  const places = await readJson<BusinessPlace[]>(KEYS.places, SEED_PLACES);
  if (!accountId) return places;
  return places.filter(p => p.accountId === accountId);
}

export async function upsertPlace(place: BusinessPlace): Promise<void> {
  const places = await listPlaces();
  const idx = places.findIndex(p => p.id === place.id);
  if (idx >= 0) {
    const next = [...places];
    next[idx] = place;
    await writeJson(KEYS.places, next);
    return;
  }
  await writeJson(KEYS.places, [place, ...places]);
}

export async function listEvents(accountId?: string): Promise<BusinessEvent[]> {
  const events = await readJson<BusinessEvent[]>(KEYS.events, []);
  if (!accountId) return events;
  return events.filter(e => e.accountId === accountId);
}

export async function addEvent(event: BusinessEvent): Promise<void> {
  const events = await listEvents();
  await writeJson(KEYS.events, [event, ...events]);
}
