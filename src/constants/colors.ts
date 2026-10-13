import { Platform } from 'react-native';

// MYMO Design Tokens — glossy orchid (tím lan) palette
export const Colors = {
  // Brand primaries
  primary: '#DA70D6',
  primaryDark: '#C04BB8',
  primaryLight: '#F4C4F1',
  primarySoft: '#FBEAF9',
  primaryTint: '#FFF7FD',

  // Logo — icy crystal glass (white + ice blue + blush)
  sakuraPetal: '#C8E8FF',
  sakuraPetalDeep: '#B8A8E8',
  sakuraPetalEye: '#A898D8',
  crystalWhite: '#FFFFFF',
  crystalPink: '#F8EBFF',
  crystalSakura: '#F5A9DF',
  crystalLavender: '#D8B9FF',
  crystalIce: '#A8DFFF',
  crystalAmethyst: '#970DD9',
  crystalPlum: '#51204F',

  // Gradient stops
  gradientStart: '#F4C4F1',
  gradientEnd: '#DA70D6',
  gradientHero1: '#FFF9FF',
  gradientHero2: '#FBEAF9',
  gradientHero3: '#F3D4F1',

  // Text
  textDark: '#4F2852',
  textMid: '#7D4E80',
  textMuted: '#B48EB5',
  textWhite: '#FFFFFF',

  // UI
  white: '#FFFFFF',
  black: '#000000',
  background: '#FFF9FF',
  surface: '#FFFFFF',
  border: '#F2DAF0',

  // Status
  activeGreen: '#10B981',
  movingYellow: '#FBBF24',
  idlePurple: '#E8A8E4',

  // Overlays
  overlay: 'rgba(0,0,0,0.45)',
  overlayLight: 'rgba(255,255,255,0.85)',
  glassDark: 'rgba(106,52,108,0.45)',
  glassLight: 'rgba(255,255,255,0.62)',
  glassLightStrong: 'rgba(255,255,255,0.86)',

  // Map
  mapBase1: '#FFF9FF',
  mapBase2: '#F9EBF7',
  mapWater: '#D7EBFA',
  mapPark: '#E7F3EA',
  mapRoad: '#FFFFFF',

  // Heat
  heatHot: '#FF3D6E',
  heatCalm: '#DA70D6',

  // Friend colors (kept same as web)
  friend1: '#FF8FB8',
  friend2: '#7CC4FF',
  friend3: '#FFB37C',
  friend4: '#7CFFB8',
  friend5: '#F0C5EF',
};

export const Gradients = {
  primary: ['#F0B8ED', '#DA70D6'] as const,
  hero: ['#FFFFFF', '#FFF5FE', '#F8E3F6'] as const,
  dark: ['#C04BB8', '#E39BDE', '#FFF8FE'] as const,
  warm: ['#FFE8F4', '#F6DDF4', '#F3D4F1'] as const,
  sheen: ['rgba(255,255,255,0.92)', 'rgba(255,255,255,0)'] as const,
};

export const Shadows = {
  soft: Platform.select({
    web: { boxShadow: '0 1px 0 rgba(255,255,255,0.98) inset, 0 10px 26px rgba(218,112,214,0.18)' },
    default: {
      shadowColor: '#DA70D6',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 4,
    },
  }),
  float: Platform.select({
    web: { boxShadow: '0 1px 0 rgba(255,255,255,1) inset, 0 16px 42px rgba(218,112,214,0.22)' },
    default: {
      shadowColor: '#DA70D6',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 20,
      elevation: 12,
    },
  }),
  glow: Platform.select({
    web: { boxShadow: '0 1px 0 rgba(255,255,255,0.95) inset, 0 8px 24px rgba(218,112,214,0.38), 0 0 20px rgba(244,196,241,0.5)' },
    default: {
      shadowColor: '#DA70D6',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 16,
      elevation: 10,
    },
  }),
};
