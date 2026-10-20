import { Platform } from 'react-native';

// MYMO Design Tokens — pastel pink → orchid → lavender, matching the 3D logo
export const Colors = {
  // Brand primaries
  primary: '#D08BC4',
  primaryDark: '#B56AA8',
  primaryLight: '#F0C4E4',
  primarySoft: '#F8EEF6',
  primaryTint: '#F6EEF8',

  // Logo — bubblegum pink to periwinkle
  sakuraPetal: '#EBB8DC',
  sakuraPetalDeep: '#C4B4E0',
  sakuraPetalEye: '#D494C8',
  crystalWhite: '#FFFFFF',
  crystalPink: '#F8D4EA',
  crystalSakura: '#E8A8D8',
  crystalLavender: '#C4B4E8',
  crystalIce: '#D8D0F0',
  crystalAmethyst: '#B8A8DC',
  crystalPlum: '#5A3D5E',

  // Gradient stops
  gradientStart: '#F3C4E4',
  gradientEnd: '#B8A8DC',
  gradientHero1: '#FBF6FB',
  gradientHero2: '#F8EEF6',
  gradientHero3: '#EFE4F4',

  // Text
  textDark: '#5A3D5E',
  textMid: '#7A5A7E',
  textMuted: '#B89AB8',
  textWhite: '#FFFFFF',

  // UI
  white: '#FFFFFF',
  black: '#000000',
  background: '#F6EEF8',
  surface: '#FFFFFF',
  border: '#EAD8EC',

  // Status
  activeGreen: '#10B981',
  movingYellow: '#FBBF24',
  idlePurple: '#D4A8DC',

  // Overlays
  overlay: 'rgba(0,0,0,0.45)',
  overlayLight: 'rgba(255,255,255,0.85)',
  glassDark: 'rgba(90,61,94,0.42)',
  glassLight: 'rgba(255,255,255,0.62)',
  glassLightStrong: 'rgba(255,255,255,0.86)',

  // Map
  mapBase1: '#FBF6FB',
  mapBase2: '#F3E8F6',
  mapWater: '#D7EBFA',
  mapPark: '#E7F3EA',
  mapRoad: '#FFFFFF',

  // Heat
  heatHot: '#E890C0',
  heatCalm: '#D08BC4',

  // Friend colors (kept same as web)
  friend1: '#FF8FB8',
  friend2: '#7CC4FF',
  friend3: '#FFB37C',
  friend4: '#7CFFB8',
  friend5: '#F0C5EF',
};

export const Gradients = {
  primary: ['#F0C4E4', '#D08BC4'] as const,
  hero: ['#FFFFFF', '#F8EEF6', '#EFE4F4'] as const,
  dark: ['#B56AA8', '#C4B4E8', '#F8EEF6'] as const,
  warm: ['#F8D4EA', '#EFE4F4', '#E4D8F0'] as const,
  sheen: ['rgba(255,255,255,0.92)', 'rgba(255,255,255,0)'] as const,
  logo: ['#F3C4E4', '#D494C8', '#B8A8DC'] as const,
};

export const Shadows = {
  soft: Platform.select({
    web: { boxShadow: '0 1px 0 rgba(255,255,255,0.98) inset, 0 10px 26px rgba(208,139,196,0.16)' },
    default: {
      shadowColor: '#D08BC4',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 4,
    },
  }),
  float: Platform.select({
    web: { boxShadow: '0 1px 0 rgba(255,255,255,1) inset, 0 16px 42px rgba(184,168,220,0.22)' },
    default: {
      shadowColor: '#B8A8DC',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 20,
      elevation: 12,
    },
  }),
  glow: Platform.select({
    web: { boxShadow: '0 1px 0 rgba(255,255,255,0.95) inset, 0 8px 24px rgba(208,139,196,0.32), 0 0 20px rgba(240,196,228,0.45)' },
    default: {
      shadowColor: '#D08BC4',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 16,
      elevation: 10,
    },
  }),
};
