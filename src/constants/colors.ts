import { Platform } from 'react-native';

// MYMO Design Tokens — Purple Palette
export const Colors = {
  // Brand primaries
  primary: '#7C5BFF',
  primaryDark: '#5A3FD4',
  primaryLight: '#9C7CFF',
  primarySoft: '#E8DFFF',
  primaryTint: '#F6F2FF',

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
  background: '#F6F2FF',
  surface: '#FFFFFF',
  border: '#E8DFFF',

  // Status
  activeGreen: '#10B981',
  movingYellow: '#FBBF24',
  idlePurple: '#9C7CFF',

  // Overlays
  overlay: 'rgba(0,0,0,0.45)',
  overlayLight: 'rgba(255,255,255,0.85)',
  glassDark: 'rgba(30,15,60,0.7)',
  glassLight: 'rgba(255,255,255,0.75)',
  glassLightStrong: 'rgba(255,255,255,0.92)',

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
  primary: ['#9C7CFF', '#7C5BFF'] as const,
  hero: ['#F0EAFF', '#D8C8FF', '#BFA2FF'] as const,
  dark: ['#3A2470', '#7C5BFF', '#BFA2FF'] as const,
  warm: ['#FFB8E0', '#BFA2FF', '#7CC4FF'] as const,
};

export const Shadows = {
  soft: Platform.select({
    web: { boxShadow: '0 2px 8px rgba(124, 91, 255, 0.12)' },
    default: {
      shadowColor: '#7C5BFF',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 4,
    },
  }),
  float: Platform.select({
    web: { boxShadow: '0 8px 30px rgba(124, 91, 255, 0.06)' },
    default: {
      shadowColor: '#7C5BFF',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 20,
      elevation: 12,
    },
  }),
  glow: Platform.select({
    web: { boxShadow: '0 4px 16px rgba(124, 91, 255, 0.4)' },
    default: {
      shadowColor: '#7C5BFF',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 16,
      elevation: 10,
    },
  }),
};
