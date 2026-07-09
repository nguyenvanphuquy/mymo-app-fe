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
  x: number; // 0-100 percentage on map
  y: number;
}

export type NotifType = 'request' | 'like' | 'nearby' | 'post';

export interface Notif {
  id: string;
  type: NotifType;
  who: string;
  emoji: string;
  textKey: string;
  time: string;
}

export const FRIENDS: Friend[] = [
  { id: '1', name: 'Léa',  emoji: '🌸', color: '#FF8FB8', place: 'Café Lumière', distance: '0.4 km', status: 'active',  battery: 82, x: 32, y: 38 },
  { id: '2', name: 'Noah', emoji: '🛹', color: '#7CC4FF', place: 'Skatepark',    distance: '1.2 km', status: 'moving',  battery: 47, x: 64, y: 28 },
  { id: '3', name: 'Maya', emoji: '🎧', color: '#FFB37C', place: 'Home',         distance: '2.8 km', status: 'idle',    battery: 91, x: 22, y: 70 },
  { id: '4', name: 'Kai',  emoji: '🏄', color: '#7CFFB8', place: 'Sunset Beach', distance: '5.1 km', status: 'active',  battery: 64, x: 78, y: 60 },
  { id: '5', name: 'Zoe',  emoji: '📚', color: '#C8A8FF', place: 'Library',      distance: '0.9 km', status: 'idle',    battery: 30, x: 50, y: 80 },
];

export const NOTIFS: Notif[] = [
  { id: 'n1', type: 'request', who: 'Sasha', emoji: '🦋', textKey: 'notif.text.request',  time: 'now' },
  { id: 'n2', type: 'like',    who: 'Léa',   emoji: '🌸', textKey: 'notif.text.like',     time: '2m' },
  { id: 'n3', type: 'nearby',  who: 'Noah',  emoji: '🛹', textKey: 'notif.text.nearby',   time: '12m' },
  { id: 'n4', type: 'post',    who: 'Maya',  emoji: '🎧', textKey: 'notif.text.post',     time: '1h' },
  { id: 'n5', type: 'request', who: 'Eli',   emoji: '⚡', textKey: 'notif.text.shareLoc', time: '3h' },
];
