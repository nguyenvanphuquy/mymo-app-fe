export const VIBE_IDS = [
  'chill',
  'cozy',
  'artistic',
  'work-friendly',
  'instagrammable',
  'rooftop',
  'nature',
  'music',
  'gen-z',
  'minimal',
  'vintage',
  'luxury',
  'romantic',
  'entertainment',
  'pet-friendly',
] as const;

export type VibeId = (typeof VIBE_IDS)[number];

export interface VibeDef {
  id: VibeId;
  name: string;
  description: string;
  descriptionEn: string;
  emoji: string;
  color: string;
  grad: readonly [string, string];
}

export const VIBES: readonly VibeDef[] = [
  { id: 'chill', name: 'Chill', description: 'Thư giãn, nhẹ nhàng', descriptionEn: 'Easy and unhurried', emoji: '🍃', color: '#0F9F6E', grad: ['#E7FFF4', '#B6F3D6'] },
  { id: 'cozy', name: 'Cozy', description: 'Ấm cúng, riêng tư', descriptionEn: 'Warm and private', emoji: '🕯️', color: '#C2410C', grad: ['#FFF4E8', '#FFD7B0'] },
  { id: 'artistic', name: 'Artistic', description: 'Nghệ thuật, sáng tạo', descriptionEn: 'Art and making', emoji: '🎨', color: '#BE185D', grad: ['#FFF0F6', '#FFC4DE'] },
  { id: 'work-friendly', name: 'Work-friendly', description: 'Tập trung, làm việc', descriptionEn: 'Focus and get things done', emoji: '💻', color: '#1D4ED8', grad: ['#EEF4FF', '#C9DBFF'] },
  { id: 'instagrammable', name: 'Instagrammable', description: 'Đẹp để chụp ảnh', descriptionEn: 'Made to be photographed', emoji: '📸', color: '#7C3AED', grad: ['#F6F0FF', '#E0D0FF'] },
  { id: 'rooftop', name: 'Rooftop', description: 'Thoáng, ngắm cảnh', descriptionEn: 'Open air and a view', emoji: '🌆', color: '#6D28D9', grad: ['#F3EEFF', '#D9C8FF'] },
  { id: 'nature', name: 'Nature', description: 'Gần thiên nhiên', descriptionEn: 'Close to green', emoji: '🌿', color: '#15803D', grad: ['#F0FFF4', '#C6F6D5'] },
  { id: 'music', name: 'Music', description: 'Âm nhạc, giải trí', descriptionEn: 'Music in the room', emoji: '🎵', color: '#9333EA', grad: ['#F8F0FF', '#E4CCFF'] },
  { id: 'gen-z', name: 'Gen Z', description: 'Trẻ, năng động', descriptionEn: 'Young and lively', emoji: '🧋', color: '#DB2777', grad: ['#FFF0F7', '#FFD0E6'] },
  { id: 'minimal', name: 'Minimal', description: 'Tối giản, hiện đại', descriptionEn: 'Quiet and modern', emoji: '🤍', color: '#475569', grad: ['#F8FAFC', '#E2E8F0'] },
  { id: 'vintage', name: 'Vintage', description: 'Hoài cổ', descriptionEn: 'A little old-world', emoji: '📻', color: '#B45309', grad: ['#FFF7ED', '#FED7AA'] },
  { id: 'luxury', name: 'Luxury', description: 'Sang trọng', descriptionEn: 'Polished and special', emoji: '✨', color: '#A16207', grad: ['#FFFBEB', '#FDE68A'] },
  { id: 'romantic', name: 'Romantic', description: 'Hẹn hò', descriptionEn: 'For a date', emoji: '💕', color: '#E11D48', grad: ['#FFF1F2', '#FECDD3'] },
  { id: 'entertainment', name: 'Entertainment', description: 'Vui chơi', descriptionEn: 'Play and stay out', emoji: '🎮', color: '#4338CA', grad: ['#EEF2FF', '#C7D2FE'] },
  { id: 'pet-friendly', name: 'Pet-friendly', description: 'Thân thiện với thú cưng', descriptionEn: 'Bring your pet', emoji: '🐱', color: '#C2410C', grad: ['#FFF7ED', '#FDBA74'] },
];

const BY_ID = new Map(VIBES.map(vibe => [vibe.id, vibe]));

export function isVibeId(value: string): value is VibeId {
  return BY_ID.has(value as VibeId);
}

export function vibeById(id: string): VibeDef | undefined {
  return BY_ID.get(id as VibeId);
}

export function parseVibeIds(raw: unknown): VibeId[] {
  const list = Array.isArray(raw)
    ? raw.map(item => String(item))
    : typeof raw === 'string'
      ? raw.split(',')
      : [];
  const seen = new Set<string>();
  const ids: VibeId[] = [];
  for (const item of list) {
    const id = item.trim().toLowerCase();
    if (!isVibeId(id) || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
    if (ids.length === 3) break;
  }
  return ids;
}
