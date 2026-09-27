import { Platform } from 'react-native';

// MYMO Design Tokens — Purple Palette
export const Colors = {
  // Brand primaries
  primary: '#7C5BFF',
  primaryDark: '#5A3FD4',
  primaryLight: '#B9A4FF',
  primarySoft: '#E7DEFF',
  primaryTint: '#F8F5FF',

  // Gradient stops
  gradientStart: '#9C7CFF',
  gradientEnd: '#7C5BFF',
  gradientHero1: '#E8DFFF',
  gradientHero2: '#C8A8FF',
  gradientHero3: '#A88BFF',

  // Text
  textDark: '#2A1758',
  textMid: '#4E3A87',
  textMuted: '#9C8EC0',
  textWhite: '#FFFFFF',

  // UI
  white: '#FFFFFF',
  black: '#000000',
  background: '#F7F4FF',
  surface: '#FFFFFF',
  border: '#E6DCFF',

  // Status
  activeGreen: '#10B981',
  movingYellow: '#FBBF24',
  idlePurple: '#9C7CFF',

  // Overlays
  overlay: 'rgba(0,0,0,0.45)',
  overlayLight: 'rgba(255,255,255,0.85)',
  glassDark: 'rgba(30,15,60,0.7)',
  glassLight: 'rgba(255,255,255,0.62)',
  glassLightStrong: 'rgba(255,255,255,0.86)',

  // Map
  mapBase1: '#F6F2FF',
  mapBase2: '#E8DFFF',
  mapWater: '#C9B8FF',
  mapPark: '#D8C8FF',
  mapRoad: '#FFFFFF',

  // Heat
  heatHot: '#FF3D6E',
  heatCalm: '#7C5BFF',

  // Friend colors (kept same as web)
  friend1: '#FF8FB8',
  friend2: '#7CC4FF',
  friend3: '#FFB37C',
  friend4: '#7CFFB8',
  friend5: '#C8A8FF',
};

export const Gradients = {
  primary: ['#CDBBFF', '#7C5BFF'] as const,
  hero: ['#FBF8FF', '#E7DCFF', '#C9B4FF'] as const,
  dark: ['#3A2470', '#7C5BFF', '#CDBBFF'] as const,
  warm: ['#FFD0EA', '#D4C2FF', '#9AD4FF'] as const,
  sheen: ['rgba(255,255,255,0.72)', 'rgba(255,255,255,0)'] as const,
};

export const Shadows = {
  soft: Platform.select({
    web: { boxShadow: '0 1px 0 rgba(255,255,255,0.95) inset, 0 10px 24px rgba(124, 91, 255, 0.14)' },
    default: {
      shadowColor: '#7C5BFF',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 4,
    },
  }),
  float: Platform.select({
    web: { boxShadow: '0 1px 0 rgba(255,255,255,1) inset, 0 16px 40px rgba(124, 91, 255, 0.16)' },
    default: {
      shadowColor: '#7C5BFF',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 20,
      elevation: 12,
    },
  }),
  glow: Platform.select({
    web: { boxShadow: '0 1px 0 rgba(255,255,255,0.65) inset, 0 8px 22px rgba(124, 91, 255, 0.42)' },
    default: {
      shadowColor: '#7C5BFF',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 16,
      elevation: 10,
    },
  }),
};
