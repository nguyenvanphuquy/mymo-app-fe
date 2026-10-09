import { concatColorMatrices } from 'concat-color-matrices';
import colorMatrices from 'rn-color-matrices';

const {
  normal,
  brightness,
  contrast,
  saturate,
  hueRotate,
  sepia,
  temperature,
  tint,
  grayscale,
  warm,
  cool,
  vintage,
  polaroid,
} = colorMatrices;

export type BeautyFilterId =
  | 'none'
  | 'soft'
  | 'glow'
  | 'warm'
  | 'cool'
  | 'dreamy'
  | 'rose'
  | 'golden'
  | 'film'
  | 'fade'
  | 'noir'
  | 'polaroid';

export type ColorMatrix = ReturnType<typeof normal>;

export type BeautyFilter = {
  id: BeautyFilterId;
  labelKey: string;
  emoji: string;
  /** Live preview on web. The saved photo uses `matrix`. */
  cssFilter: string;
  /** Soft wash on the native viewfinder before the shutter. */
  overlay: string;
  swatch: string;
  matrix: ColorMatrix;
};

function mix(...matrices: ColorMatrix[]): ColorMatrix {
  return concatColorMatrices(matrices);
}

export const BEAUTY_FILTERS: BeautyFilter[] = [
  {
    id: 'none',
    labelKey: 'cam.beautyNone',
    emoji: '○',
    cssFilter: 'none',
    overlay: 'transparent',
    swatch: '#F4F1FF',
    matrix: normal(),
  },
  {
    id: 'soft',
    labelKey: 'cam.beautySoft',
    emoji: '✨',
    cssFilter: 'brightness(1.07) contrast(0.94) saturate(1.08)',
    overlay: 'rgba(255, 236, 246, 0.16)',
    swatch: '#F8D7EA',
    matrix: mix(brightness(1.07), contrast(0.94), saturate(1.08)),
  },
  {
    id: 'glow',
    labelKey: 'cam.beautyGlow',
    emoji: '💫',
    cssFilter: 'brightness(1.14) contrast(1.02) saturate(1.22) sepia(0.06)',
    overlay: 'rgba(255, 214, 236, 0.2)',
    swatch: '#FFC4E2',
    matrix: mix(brightness(1.14), contrast(1.02), saturate(1.22), temperature(0.05)),
  },
  {
    id: 'warm',
    labelKey: 'cam.beautyWarm',
    emoji: '🌅',
    cssFilter: 'sepia(0.2) saturate(1.28) brightness(1.06)',
    overlay: 'rgba(255, 186, 120, 0.18)',
    swatch: '#F6B26B',
    matrix: mix(warm(), saturate(1.22), brightness(1.05)),
  },
  {
    id: 'cool',
    labelKey: 'cam.beautyCool',
    emoji: '🧊',
    cssFilter: 'hue-rotate(14deg) saturate(1.08) contrast(1.06) brightness(1.04)',
    overlay: 'rgba(170, 205, 255, 0.18)',
    swatch: '#A9C8FF',
    matrix: mix(cool(), contrast(1.06), saturate(1.06), brightness(1.04)),
  },
  {
    id: 'dreamy',
    labelKey: 'cam.beautyDreamy',
    emoji: '💜',
    cssFilter: 'brightness(1.1) contrast(0.9) saturate(1.22) hue-rotate(-12deg)',
    overlay: 'rgba(196, 160, 255, 0.2)',
    swatch: '#C9B0FF',
    matrix: mix(brightness(1.1), contrast(0.9), saturate(1.18), hueRotate(-0.2)),
  },
  {
    id: 'rose',
    labelKey: 'cam.beautyRose',
    emoji: '🌸',
    cssFilter: 'brightness(1.06) saturate(1.18) hue-rotate(-8deg) sepia(0.08)',
    overlay: 'rgba(255, 170, 190, 0.18)',
    swatch: '#F4A4B8',
    matrix: mix(brightness(1.06), saturate(1.16), tint(0.1), hueRotate(-0.08)),
  },
  {
    id: 'golden',
    labelKey: 'cam.beautyGolden',
    emoji: '✨',
    cssFilter: 'sepia(0.28) saturate(1.35) contrast(1.06) brightness(1.06)',
    overlay: 'rgba(255, 196, 90, 0.16)',
    swatch: '#F0C14A',
    matrix: mix(temperature(0.16), saturate(1.28), contrast(1.05), brightness(1.05)),
  },
  {
    id: 'film',
    labelKey: 'cam.beautyFilm',
    emoji: '🎞️',
    cssFilter: 'sepia(0.32) contrast(0.94) brightness(1.08) saturate(0.9)',
    overlay: 'rgba(196, 160, 120, 0.16)',
    swatch: '#C4A484',
    matrix: mix(vintage(), brightness(1.05), contrast(0.97)),
  },
  {
    id: 'fade',
    labelKey: 'cam.beautyFade',
    emoji: '☁️',
    cssFilter: 'brightness(1.12) contrast(0.82) saturate(0.86) sepia(0.12)',
    overlay: 'rgba(255, 255, 255, 0.14)',
    swatch: '#E7E2F2',
    matrix: mix(brightness(1.12), contrast(0.82), saturate(0.88), sepia(0.12)),
  },
  {
    id: 'noir',
    labelKey: 'cam.beautyNoir',
    emoji: '🌙',
    cssFilter: 'grayscale(0.92) contrast(1.18) brightness(1.02)',
    overlay: 'rgba(40, 40, 55, 0.16)',
    swatch: '#3C3C4A',
    matrix: mix(grayscale(0.92), contrast(1.16), brightness(1.02)),
  },
  {
    id: 'polaroid',
    labelKey: 'cam.beautyPolaroid',
    emoji: '📷',
    cssFilter: 'contrast(1.12) saturate(1.18) sepia(0.1) brightness(1.04)',
    overlay: 'rgba(255, 220, 180, 0.14)',
    swatch: '#F3D2A8',
    matrix: mix(polaroid(), brightness(1.03)),
  },
];

export function getBeautyFilter(id: BeautyFilterId): BeautyFilter {
  return BEAUTY_FILTERS.find(filter => filter.id === id) ?? BEAUTY_FILTERS[0];
}
