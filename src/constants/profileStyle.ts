export const PROFILE_FRAMES = [
  { id: 'blush', color: '#F4C4F1' },
  { id: 'gold', color: '#E8B931' },
  { id: 'neon', color: '#C084FC' },
  { id: 'midnight', color: '#312E81' },
] as const;

export const PROFILE_THEMES = [
  { id: 'blush', background: '#FFF5FB' },
  { id: 'lilac', background: '#F7F2FF' },
  { id: 'neon', background: '#F4EEFF' },
  { id: 'sunset', background: '#FFF6EE' },
  { id: 'mint', background: '#F3FBF6' },
] as const;

export const PROFILE_TITLES = [
  'nightExplorer',
  'cafeHunter',
  'cityWalker',
  'sunsetChaser',
  'foodie',
] as const;

export function frameColor(id?: string | null) {
  return PROFILE_FRAMES.find(frame => frame.id === id)?.color ?? null;
}

export function themeBackground(id?: string | null) {
  return PROFILE_THEMES.find(theme => theme.id === id)?.background ?? null;
}
