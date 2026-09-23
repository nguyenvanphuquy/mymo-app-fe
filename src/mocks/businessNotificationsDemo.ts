import AsyncStorage from '@react-native-async-storage/async-storage';

export type BizNotificationKind = 'place' | 'campaign' | 'review' | 'system';

export interface BizNotificationItem {
  id: string;
  kind: BizNotificationKind;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
}

const KEY = 'mymo.businessNotifications';

const SEED: BizNotificationItem[] = [
  {
    id: 'n1',
    kind: 'system',
    title: 'Welcome to MYMO Partner',
    body: 'Complete your first place to appear on VibeMap.',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    read: false,
  },
];

export async function listBusinessNotifications(): Promise<BizNotificationItem[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) {
    await AsyncStorage.setItem(KEY, JSON.stringify(SEED));
    return SEED;
  }
  try {
    return JSON.parse(raw) as BizNotificationItem[];
  } catch {
    return SEED;
  }
}

export async function markAllNotificationsRead(): Promise<void> {
  const list = await listBusinessNotifications();
  const next = list.map(n => ({ ...n, read: true }));
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
}

export async function pushBusinessNotification(item: Omit<BizNotificationItem, 'id' | 'read'>): Promise<void> {
  const list = await listBusinessNotifications();
  const next: BizNotificationItem[] = [
    { ...item, id: `n_${Date.now()}`, read: false },
    ...list,
  ].slice(0, 50);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
}
