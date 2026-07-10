export type BeautyFilterId = 'none' | 'soft' | 'glow' | 'warm' | 'cool' | 'dreamy';

export type BeautyFilter = {
  id: BeautyFilterId;
  labelKey: string;
  emoji: string;
  /** CSS filter for web preview + capture */
  cssFilter: string;
  /** Soft color overlay for native preview */
  overlay: string;
};

export const BEAUTY_FILTERS: BeautyFilter[] = [
  {
    id: 'none',
    labelKey: 'cam.beautyNone',
    emoji: '○',
    cssFilter: 'none',
    overlay: 'transparent',
  },
  {
    id: 'soft',
    labelKey: 'cam.beautySoft',
    emoji: '✨',
    cssFilter: 'brightness(1.08) contrast(0.95) saturate(1.05) blur(0.3px)',
    overlay: 'rgba(255, 240, 250, 0.18)',
  },
  {
    id: 'glow',
    labelKey: 'cam.beautyGlow',
    emoji: '💫',
    cssFilter: 'brightness(1.12) contrast(1.05) saturate(1.15)',
    overlay: 'rgba(255, 220, 240, 0.22)',
  },
  {
    id: 'warm',
    labelKey: 'cam.beautyWarm',
    emoji: '🌅',
    cssFilter: 'brightness(1.06) sepia(0.18) saturate(1.2)',
    overlay: 'rgba(255, 200, 140, 0.2)',
  },
  {
    id: 'cool',
    labelKey: 'cam.beautyCool',
    emoji: '🧊',
    cssFilter: 'brightness(1.04) hue-rotate(12deg) saturate(1.1)',
    overlay: 'rgba(180, 210, 255, 0.2)',
  },
  {
    id: 'dreamy',
    labelKey: 'cam.beautyDreamy',
    emoji: '💜',
    cssFilter: 'brightness(1.1) contrast(0.92) saturate(1.25) hue-rotate(-8deg)',
    overlay: 'rgba(200, 160, 255, 0.24)',
  },
];

export function getBeautyFilter(id: BeautyFilterId): BeautyFilter {
  return BEAUTY_FILTERS.find(f => f.id === id) ?? BEAUTY_FILTERS[0];
}
