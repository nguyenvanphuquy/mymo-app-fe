import { DeviceEventEmitter } from 'react-native';

export const OPEN_USER_PROFILE = 'user:viewProfile';

const EMPTY_USER_ID = '00000000-0000-0000-0000-000000000000';

export function isRealUserId(userId?: string | null): boolean {
  if (!userId) return false;
  const id = userId.trim().toLowerCase();
  return id.length > 0 && id !== EMPTY_USER_ID;
}

export function openUserProfile(profile: {
  userId?: string | null;
  displayName?: string;
  avatarUrl?: string | null;
}) {
  if (!isRealUserId(profile.userId)) return;
  DeviceEventEmitter.emit(OPEN_USER_PROFILE, {
    userId: profile.userId,
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl ?? null,
  });
}
