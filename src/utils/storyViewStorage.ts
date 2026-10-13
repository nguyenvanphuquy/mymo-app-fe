import AsyncStorage from '@react-native-async-storage/async-storage';
import { POST_LIFETIME_MS } from './mapPostZoom';

const KEY_PREFIX = 'mymo.viewedStories.v1';
let writeQueue: Promise<void> = Promise.resolve();

type ViewedStoryMap = Record<string, number>;

function storageKey(userId: string): string {
  return `${KEY_PREFIX}:${userId.trim().toLowerCase()}`;
}

function pruneViewedStories(value: ViewedStoryMap, now = Date.now()): ViewedStoryMap {
  return Object.fromEntries(
    Object.entries(value).filter(([, viewedAt]) => (
      Number.isFinite(viewedAt) && now - viewedAt < POST_LIFETIME_MS
    )),
  );
}

export async function getViewedStoryIds(userId: string): Promise<Set<string>> {
  if (!userId.trim()) return new Set();
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    const parsed = raw ? JSON.parse(raw) as ViewedStoryMap : {};
    const pruned = pruneViewedStories(parsed);
    if (Object.keys(pruned).length !== Object.keys(parsed).length) {
      await AsyncStorage.setItem(storageKey(userId), JSON.stringify(pruned));
    }
    return new Set(Object.keys(pruned));
  } catch {
    return new Set();
  }
}

export async function markStoryViewed(userId: string, postId: string): Promise<void> {
  if (!userId.trim() || !postId.trim()) return;
  writeQueue = writeQueue.then(async () => {
    try {
      const key = storageKey(userId);
      const raw = await AsyncStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) as ViewedStoryMap : {};
      const pruned = pruneViewedStories(parsed);
      pruned[postId] = Date.now();
      await AsyncStorage.setItem(key, JSON.stringify(pruned));
    } catch {
      // Viewing a story should still work when local persistence is unavailable.
    }
  });
  await writeQueue;
}
