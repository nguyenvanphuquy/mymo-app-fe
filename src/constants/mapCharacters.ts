export const MAP_CHARACTERS = [
  { id: 'fox', emoji: '🦊' },
  { id: 'cat', emoji: '🐱' },
  { id: 'bunny', emoji: '🐰' },
  { id: 'bear', emoji: '🐻' },
  { id: 'chick', emoji: '🐤' },
  { id: 'ghost', emoji: '👻' },
  { id: 'alien', emoji: '👾' },
  { id: 'star', emoji: '⭐' },
] as const;

export type MapCharacterId = (typeof MAP_CHARACTERS)[number]['id'];

export function mapCharacterEmoji(marker?: string | null): string | null {
  if (!marker) return null;
  return MAP_CHARACTERS.find(item => item.id === marker)?.emoji ?? null;
}

export function isMapImage(marker?: string | null): boolean {
  return !!marker && /^https?:\/\//i.test(marker);
}
