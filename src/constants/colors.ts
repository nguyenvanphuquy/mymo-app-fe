import { Platform } from 'react-native';

// MYMO Design Tokens — Purple Palette
export const Colors = {
  // Brand primaries — pale glossy lilac, less saturated than the old violet
  primary: '#9B86F5',
  primaryDark: '#8570E4',
  primaryLight: '#DDD4FF',
  primarySoft: '#F4EEFF',
  primaryTint: '#FCFAFF',

  // Gradient stops
  gradientStart: '#DDD4FF',
  gradientEnd: '#9B86F5',
  gradientHero1: '#FCFAFF',
  gradientHero2: '#F0EAFF',
  gradientHero3: '#E4DAFF',

  // Text
  textDark: '#3D2E66',
  textMid: '#6D5C96',
  textMuted: '#A89BC4',
  textWhite: '#FFFFFF',

  // UI
  white: '#FFFFFF',
  black: '#000000',
  background: '#FBFAFF',
  surface: '#FFFFFF',
  border: '#EFE8FF',

  // Status
  activeGreen: '#10B981',
  movingYellow: '#FBBF24',
  idlePurple: '#C4B5FD',

  // Overlays
  overlay: 'rgba(0,0,0,0.45)',
  overlayLight: 'rgba(255,255,255,0.85)',
  glassDark: 'rgba(70,50,120,0.45)',
  glassLight: 'rgba(255,255,255,0.62)',
  glassLightStrong: 'rgba(255,255,255,0.86)',

  // Map
  mapBase1: '#FBFAFF',
  mapBase2: '#F3EEFF',
  mapWater: '#D7EBFA',
  mapPark: '#E7F3EA',
  mapRoad: '#FFFFFF',

  // Heat
  heatHot: '#FF3D6E',
  heatCalm: '#A78BFA',

  // Friend colors (kept same as web)
  friend1: '#FF8FB8',
  friend2: '#7CC4FF',
  friend3: '#FFB37C',
  friend4: '#7CFFB8',
  friend5: '#DDD4FF',
};

export const Gradients = {
  primary: ['#C9B8FF', '#8F78F0'] as const,
  hero: ['#FFFFFF', '#F8F5FF', '#EFE8FF'] as const,
  dark: ['#B7A6F2', '#D9CEFF', '#FCFAFF'] as const,
  warm: ['#FFE8F4', '#E9E0FF', '#D7ECFF'] as const,
  sheen: ['rgba(255,255,255,0.88)', 'rgba(255,255,255,0)'] as const,
};

export const Shadows = {
  soft: Platform.select({
    web: { boxShadow: '0 1px 0 rgba(255,255,255,0.98) inset, 0 10px 24px rgba(167, 139, 250, 0.12)' },
    default: {
      shadowColor: '#A78BFA',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 4,
    },
  }),
  float: Platform.select({
    web: { boxShadow: '0 1px 0 rgba(255,255,255,1) inset, 0 16px 40px rgba(167, 139, 250, 0.14)' },
    default: {
      shadowColor: '#A78BFA',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 20,
      elevation: 12,
    },
  }),
  glow: Platform.select({
    web: { boxShadow: '0 1px 0 rgba(255,255,255,0.9) inset, 0 8px 22px rgba(167, 139, 250, 0.28)' },
    default: {
      shadowColor: '#A78BFA',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 16,
      elevation: 10,
    },
  }),
};
