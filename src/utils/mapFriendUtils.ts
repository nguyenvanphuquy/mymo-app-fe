import type { Friend } from '../constants/data';

const FRIEND_COLORS = ['#FF8FB8', '#7CC4FF', '#FFB37C', '#7CFFB8', '#C8A8FF'];

export interface FriendLocation {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  latitude: number;
  longitude: number;
  isOnline: boolean;
  lastSeen?: string | null;
}

export type MapFriendPin = Friend & {
  lng: number;
  lat: number;
  avatarUrl?: string | null;
};

function colorForId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash + id.charCodeAt(i)) % FRIEND_COLORS.length;
  }
  return FRIEND_COLORS[hash];
}

export function formatDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): string {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

function normalizeFriendLocation(raw: Record<string, unknown>): FriendLocation {
  return {
    userId: String(raw.userId || raw.UserId || ''),
    username: String(raw.username || raw.Username || ''),
    displayName: (raw.displayName ?? raw.DisplayName ?? null) as string | null,
    avatarUrl: (raw.avatarUrl ?? raw.AvatarUrl ?? null) as string | null,
    latitude: Number(raw.latitude ?? raw.Latitude ?? 0),
    longitude: Number(raw.longitude ?? raw.Longitude ?? 0),
    isOnline: Boolean(raw.isOnline ?? raw.IsOnline),
    lastSeen: (raw.lastSeen ?? raw.LastSeen ?? null) as string | null,
  };
}

export function friendLocationToMapPin(
  loc: FriendLocation,
  userLat?: number,
  userLng?: number,
): MapFriendPin {
  const name = loc.displayName || loc.username || 'Friend';
  return {
    id: loc.userId,
    name,
    emoji: '👋',
    color: colorForId(loc.userId),
    place: loc.isOnline ? 'Online' : 'Offline',
    distance:
      userLat != null && userLng != null
        ? formatDistanceKm(userLat, userLng, loc.latitude, loc.longitude)
        : '—',
    status: loc.isOnline ? 'active' : 'idle',
    battery: 100,
    x: 50,
    y: 50,
    lng: loc.longitude,
    lat: loc.latitude,
    avatarUrl: loc.avatarUrl,
  };
}

export function normalizeFriendLocations(data: unknown[]): FriendLocation[] {
  return data
    .map(item => normalizeFriendLocation(item as Record<string, unknown>))
    .filter(loc => loc.userId && loc.latitude && loc.longitude);
}
