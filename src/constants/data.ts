export type Tab = 'map' | 'friends' | 'notifications' | 'profile';

export interface Friend {
  id: string;
  name: string;
  emoji: string;
  color: string;
  place: string;
  distance: string;
  status: 'active' | 'idle' | 'moving';
  battery: number;
  lastActiveAt?: string | null;
  x: number; // 0-100 percentage on map
  y: number;
}
