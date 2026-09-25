import { MAPBOX_ACCESS_TOKEN } from '../constants/mapbox';

export type MapTheme = 'purple' | 'yellow' | 'blue';

export const MAP_THEME_ORDER: readonly MapTheme[] = ['purple', 'yellow', 'blue'];

export function nextMapTheme(theme: MapTheme): MapTheme {
  const index = MAP_THEME_ORDER.indexOf(theme);
  return MAP_THEME_ORDER[(index + 1) % MAP_THEME_ORDER.length];
}

export function mapThemeLabel(theme: MapTheme): string {
  switch (theme) {
    case 'purple':
      return 'Bản đồ Tím Pastel 💜';
    case 'yellow':
      return 'Bản đồ Nắng ấm ☀️';
    case 'blue':
      return 'Bản đồ Bright Blue 💙';
  }
}

type OrbConfig = {
  top?: string;
  left?: string;
  right?: string;
  size: number;
  color: string;
};

type ThemeColors = {
  background: string;
  landuse: string;
  park: string;
  parks: string;
  school: string;
  hospital: string;
  cemetery: string;
  commercial: string;
  industrial: string;
  residential: string;
  pitch: string;
  sand: string;
  wood: string;
  grass: string;
  parking: string;
  airport: string;
  landcover: string;
  water: string;
  waterStroke: string;
  waterway: string;
  building: string;
  buildingOutline: string;
  bridge: string;
  roadCase: string;
  road: string;
  roadStreet: string;
  roadService: string;
  roadMajor: string;
  roadHighway: string;
  roadLabel: string;
  placeLabel: string;
  addressLabel: string;
  poiLabel: string;
  poiIcon: string;
  naturalLabel: string;
  waterLabel: string;
};

export const MAP_THEME_UI = {
  purple: {
    atmosphere: [
      'rgba(235, 225, 255, 0.18)',
      'rgba(255,255,255,0.04)',
      'rgba(200, 228, 248, 0.08)',
    ] as const,
    shimmer: [
      'rgba(255,255,255,0.22)',
      'rgba(210, 180, 255, 0.1)',
      'rgba(255,255,255,0.03)',
    ] as const,
    sparkle: '#E8D8FF',
    sparkleAccent: '#FFFFFF',
    accent: ['#D4B4FF', '#B896FF'] as const,
    chipActive: ['#C9A8FF', '#A880FF'] as const,
    chipInactiveBg: 'rgba(255,255,255,0.82)',
    chipInactiveBorder: 'rgba(200, 175, 255, 0.32)',
    searchBg: 'rgba(255,255,255,0.88)',
    locateGlow: 'rgba(200, 170, 255, 0.5)',
    icon: '#7C5BFF',
    weatherIcon: '#7C5BFF',
    gloss: 1,
    orbOpacity: 0.38,
    glossWash: [
      'rgba(255,255,255,0.16)',
      'rgba(255,255,255,0.02)',
      'transparent',
    ] as const,
    orbs: [
      { top: '8%', right: '6%', size: 100, color: 'rgba(220, 195, 255, 0.22)' },
      { top: '38%', left: '4%', size: 80, color: 'rgba(190, 220, 255, 0.16)' },
      { top: '62%', right: '12%', size: 65, color: 'rgba(255, 220, 250, 0.14)' },
    ] as OrbConfig[],
  },
  yellow: {
    atmosphere: [
      'rgba(255, 236, 190, 0.16)',
      'rgba(255,255,255,0.04)',
      'rgba(255, 248, 220, 0.1)',
    ] as const,
    shimmer: [
      'rgba(255,255,255,0.26)',
      'rgba(255, 220, 140, 0.12)',
      'rgba(255,255,255,0.04)',
    ] as const,
    sparkle: '#FFE8A8',
    sparkleAccent: '#FFFFFF',
    accent: ['#FFE08A', '#FFC84A'] as const,
    chipActive: ['#FFE08A', '#F5B830'] as const,
    chipInactiveBg: 'rgba(255, 252, 240, 0.86)',
    chipInactiveBorder: 'rgba(240, 210, 130, 0.34)',
    searchBg: 'rgba(255, 253, 245, 0.9)',
    locateGlow: 'rgba(255, 210, 100, 0.52)',
    icon: '#C89620',
    weatherIcon: '#D4A020',
    gloss: 1,
    orbOpacity: 0.38,
    glossWash: [
      'rgba(255,255,255,0.16)',
      'rgba(255,255,255,0.02)',
      'transparent',
    ] as const,
    orbs: [
      { top: '10%', right: '8%', size: 110, color: 'rgba(255, 225, 150, 0.2)' },
      { top: '42%', left: '6%', size: 78, color: 'rgba(255, 245, 200, 0.16)' },
      { top: '68%', right: '10%', size: 68, color: 'rgba(255, 200, 120, 0.12)' },
    ] as OrbConfig[],
  },
  blue: {
    atmosphere: [
      'rgba(170, 230, 255, 0.28)',
      'rgba(255,255,255,0.1)',
      'rgba(40, 160, 255, 0.16)',
    ] as const,
    shimmer: [
      'rgba(255,255,255,0.72)',
      'rgba(90, 210, 255, 0.42)',
      'rgba(255,255,255,0.12)',
    ] as const,
    sparkle: '#C8F2FF',
    sparkleAccent: '#FFFFFF',
    accent: ['#5AD4FF', '#1496FF'] as const,
    chipActive: ['#4EC8FF', '#0A8CFF'] as const,
    chipInactiveBg: 'rgba(244, 252, 255, 0.9)',
    chipInactiveBorder: 'rgba(70, 190, 255, 0.42)',
    searchBg: 'rgba(246, 253, 255, 0.92)',
    locateGlow: 'rgba(40, 190, 255, 0.7)',
    icon: '#0A8CFF',
    weatherIcon: '#0A8CFF',
    gloss: 2.4,
    orbOpacity: 0.62,
    glossWash: [
      'rgba(255,255,255,0.46)',
      'rgba(170, 230, 255, 0.16)',
      'transparent',
    ] as const,
    orbs: [
      { top: '6%', right: '4%', size: 130, color: 'rgba(255, 255, 255, 0.42)' },
      { top: '28%', left: '2%', size: 100, color: 'rgba(120, 220, 255, 0.34)' },
      { top: '58%', right: '8%', size: 88, color: 'rgba(40, 170, 255, 0.22)' },
    ] as OrbConfig[],
  },
} as const;

const THEME_COLORS: Record<MapTheme, ThemeColors> = {
  purple: {
    background: '#F8F2FF',
    landuse: '#F3ECFF',
    park: '#C8EDD8',
    parks: '#B8E4CC',
    school: '#DDE8FF',
    hospital: '#FFE4EE',
    cemetery: '#E8E4F2',
    commercial: '#EDE4FF',
    industrial: '#E4DCF0',
    residential: '#F0EAFF',
    pitch: '#C0E8D0',
    sand: '#F5ECD8',
    wood: '#B8DCC8',
    grass: '#C4E8CC',
    parking: '#ECE6FA',
    airport: '#D8E8FF',
    landcover: '#D0E8D8',
    water: '#A8D8F0',
    waterStroke: '#8EC8E8',
    waterway: '#98D0EC',
    building: '#E8DFF8',
    buildingOutline: '#D4C8EC',
    bridge: '#E0D8F4',
    roadCase: '#EDE8FA',
    road: '#FFFFFF',
    roadStreet: '#FFFEFE',
    roadService: '#FAF6FF',
    roadMajor: '#FFF0D0',
    roadHighway: '#FFE8B8',
    roadLabel: '#3E3458',
    placeLabel: '#322848',
    addressLabel: '#4E4268',
    poiLabel: '#443858',
    poiIcon: '#8B6FE8',
    naturalLabel: '#3A6858',
    waterLabel: '#2A6888',
  },
  yellow: {
    background: '#FFFCF4',
    landuse: '#FFF8EC',
    park: '#C8E4A8',
    parks: '#B8DCA0',
    school: '#FFF0C8',
    hospital: '#FFE8D4',
    cemetery: '#E8E4D4',
    commercial: '#FFF4D8',
    industrial: '#F0E8D0',
    residential: '#FFF8E8',
    pitch: '#B8DCA0',
    sand: '#F5E8C8',
    wood: '#C8DCA8',
    grass: '#D0E8B0',
    parking: '#F8F0D8',
    airport: '#E8F0FF',
    landcover: '#D8E8B8',
    water: '#A8D0E0',
    waterStroke: '#90C0D4',
    waterway: '#98C8DC',
    building: '#FCF0D8',
    buildingOutline: '#E8D8B8',
    bridge: '#F0E8D0',
    roadCase: '#F8F2E4',
    road: '#FFFFFF',
    roadStreet: '#FFFFFA',
    roadService: '#FCF8EE',
    roadMajor: '#FFEAB0',
    roadHighway: '#FFE090',
    roadLabel: '#5C4C30',
    placeLabel: '#403020',
    addressLabel: '#685838',
    poiLabel: '#5C4830',
    poiIcon: '#D4A020',
    naturalLabel: '#486838',
    waterLabel: '#286878',
  },
  blue: {
    background: '#E4F6FF',
    landuse: '#C9EBFF',
    park: '#B6F0DC',
    parks: '#9EE6D0',
    school: '#D2F0FF',
    hospital: '#E4F4FF',
    cemetery: '#D4E6F4',
    commercial: '#BEE6FF',
    industrial: '#B4D8F0',
    residential: '#D6F3FF',
    pitch: '#A8E8D0',
    sand: '#F2E8D4',
    wood: '#A4DCC4',
    grass: '#B0E8D0',
    parking: '#C8E8FA',
    airport: '#B8DCFF',
    landcover: '#B4E6F8',
    water: '#1AA8FF',
    waterStroke: '#FFFFFF',
    waterway: '#3EC4FF',
    building: '#F7FCFF',
    buildingOutline: '#7ED4FF',
    bridge: '#EAF8FF',
    roadCase: '#8ED8FF',
    road: '#FFFFFF',
    roadStreet: '#FFFFFF',
    roadService: '#F3FBFF',
    roadMajor: '#E7F8FF',
    roadHighway: '#D2F2FF',
    roadLabel: '#123E6E',
    placeLabel: '#0C3260',
    addressLabel: '#1E4E82',
    poiLabel: '#123E72',
    poiIcon: '#0090FF',
    naturalLabel: '#146858',
    waterLabel: '#083868',
  },
};

const roadWidth = (min: number, max: number) =>
  ['interpolate', ['linear'], ['zoom'], 10, min, 14, (min + max) / 2, 18, max];

const localizeName = ['coalesce', ['get', 'name_vi'], ['get', 'name'], ['get', 'name_en']];

const worldviewFilter = ['any', ['==', ['get', 'worldview'], 'all'], ['==', ['get', 'worldview'], 'US']];

const roadLabelFilter = [
  'all',
  ['has', 'name'],
  [
    'step',
    ['zoom'],
    ['match', ['get', 'class'], ['motorway', 'trunk', 'primary', 'secondary', 'tertiary'], true, false],
    12,
    ['match', ['get', 'class'], ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'street', 'street_limited'], true, false],
    15,
    ['match', ['get', 'class'], ['path', 'pedestrian', 'golf', 'ferry', 'aerialway'], false, true],
  ],
];

const landuseFillColor = (c: ThemeColors) =>
  ['match', ['get', 'class'],
    'park', c.park,
    'national_park', c.parks,
    'school', c.school,
    'hospital', c.hospital,
    'cemetery', c.cemetery,
    'commercial_area', c.commercial,
    'industrial', c.industrial,
    'residential', c.residential,
    'pitch', c.pitch,
    'sand', c.sand,
    'wood', c.wood,
    'grass', c.grass,
    'airport', c.airport,
    'parking', c.parking,
    c.landuse,
  ];

const landcoverFillColor = (c: ThemeColors) =>
  ['match', ['get', 'class'], 'wood', c.wood, 'grass', c.grass, 'scrub', c.grass, 'snow', '#F8F8FF', c.landcover];

export function getMymoMapStyle(theme: MapTheme): object {
  const c = THEME_COLORS[theme];
  const glossyBlue = theme === 'blue';

  return {
    version: 8,
    name: `MYMO ${theme}`,
    glyphs: `https://api.mapbox.com/fonts/v1/mapbox/{fontstack}/{range}.pbf?access_token=${MAPBOX_ACCESS_TOKEN}`,
    sprite: 'mapbox://sprites/mapbox/streets-v12',
    sources: {
      composite: {
        type: 'vector',
        url: 'mapbox://mapbox.mapbox-streets-v8',
      },
    },
    layers: [
      // ── Base ──────────────────────────────────────────────────────────────
      { id: 'background', type: 'background', paint: { 'background-color': c.background } },

      { id: 'landcover', type: 'fill', source: 'composite', 'source-layer': 'landcover', minzoom: 5,
        paint: { 'fill-color': landcoverFillColor(c), 'fill-opacity': 0.75 } },

      { id: 'landuse', type: 'fill', source: 'composite', 'source-layer': 'landuse', minzoom: 5,
        paint: { 'fill-color': landuseFillColor(c), 'fill-opacity': 0.88 } },

      { id: 'national-park', type: 'fill', source: 'composite', 'source-layer': 'landuse_overlay', minzoom: 5,
        filter: ['==', ['get', 'class'], 'national_park'],
        paint: { 'fill-color': c.parks, 'fill-opacity': 0.85 } },

      // ── Water ─────────────────────────────────────────────────────────────
      { id: 'water', type: 'fill', source: 'composite', 'source-layer': 'water',
        paint: { 'fill-color': c.water, 'fill-opacity': glossyBlue ? 1 : 0.88 } },

      { id: 'water-stroke', type: 'line', source: 'composite', 'source-layer': 'water',
        paint: {
          'line-color': c.waterStroke,
          'line-width': glossyBlue ? 2.6 : 1.2,
          'line-opacity': glossyBlue ? 0.95 : 0.5,
          'line-blur': glossyBlue ? 0.4 : 0,
        } },

      ...(glossyBlue ? [{
        id: 'water-gloss',
        type: 'line',
        source: 'composite',
        'source-layer': 'water',
        paint: {
          'line-color': '#FFFFFF',
          'line-width': ['interpolate', ['linear'], ['zoom'], 8, 1.4, 14, 3.2, 18, 5],
          'line-opacity': 0.82,
          'line-blur': 1.8,
        },
      }, {
        id: 'waterway-gloss',
        type: 'line',
        source: 'composite',
        'source-layer': 'waterway',
        minzoom: 8,
        filter: ['in', ['get', 'class'], ['literal', ['river', 'canal', 'stream', 'drain']]],
        paint: {
          'line-color': '#F4FCFF',
          'line-width': ['interpolate', ['linear'], ['zoom'], 8, 1.2, 14, 3.4, 18, 5.5],
          'line-opacity': 0.9,
          'line-blur': 0.8,
        },
      }] : []),

      { id: 'waterway', type: 'line', source: 'composite', 'source-layer': 'waterway', minzoom: 8,
        filter: ['in', ['get', 'class'], ['literal', ['river', 'canal', 'stream', 'drain']]],
        paint: {
          'line-color': c.waterway,
          'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.5, 14, 2.5, 18, 4],
          'line-opacity': 0.75,
        } },

      // ── Airports ──────────────────────────────────────────────────────────
      { id: 'aeroway-polygon', type: 'fill', source: 'composite', 'source-layer': 'aeroway', minzoom: 10,
        filter: ['==', ['geometry-type'], 'Polygon'],
        paint: { 'fill-color': c.airport, 'fill-opacity': 0.9 } },

      { id: 'aeroway-line', type: 'line', source: 'composite', 'source-layer': 'aeroway', minzoom: 10,
        filter: ['==', ['geometry-type'], 'LineString'],
        paint: { 'line-color': c.airport, 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1, 16, 6] } },

      // ── Structures (bridges) ──────────────────────────────────────────────
      { id: 'structure', type: 'fill', source: 'composite', 'source-layer': 'structure', minzoom: 13,
        filter: ['==', ['get', 'class'], 'bridge'],
        paint: { 'fill-color': c.bridge, 'fill-opacity': 0.65 } },

      // ── Buildings ─────────────────────────────────────────────────────────
      { id: 'building', type: 'fill', source: 'composite', 'source-layer': 'building', minzoom: 13,
        filter: ['all', ['!=', ['get', 'type'], 'building:part'], ['!=', ['get', 'underground'], 'true'], ['!=', ['get', 'underground'], true]],
        paint: {
          'fill-color': c.building,
          'fill-opacity': ['interpolate', ['linear'], ['zoom'], 13, 0.2, 15, 0.45, 17, 0.62, 19, 0.72],
          'fill-outline-color': c.buildingOutline,
        } },

      // ── Roads ─────────────────────────────────────────────────────────────
      { id: 'road-case', type: 'line', source: 'composite', 'source-layer': 'road', minzoom: 10,
        filter: ['==', ['geometry-type'], 'LineString'],
        paint: { 'line-color': c.roadCase, 'line-width': roadWidth(0.8, 5.5), 'line-opacity': glossyBlue ? 0.82 : 0.45 } },

      { id: 'road-service', type: 'line', source: 'composite', 'source-layer': 'road', minzoom: 12,
        filter: ['in', ['get', 'class'], ['literal', ['service', 'service_drive', 'driveway', 'alley', 'parking_aisle']]],
        paint: { 'line-color': c.roadService, 'line-width': roadWidth(0.4, 2.4) } },

      { id: 'road-street', type: 'line', source: 'composite', 'source-layer': 'road', minzoom: 11,
        filter: ['in', ['get', 'class'], ['literal', ['street', 'street_limited']]],
        paint: { 'line-color': c.roadStreet, 'line-width': roadWidth(0.75, 5) } },

      { id: 'road-minor', type: 'line', source: 'composite', 'source-layer': 'road', minzoom: 10,
        filter: ['in', ['get', 'class'], ['literal', ['tertiary', 'tertiary_link']]],
        paint: { 'line-color': c.road, 'line-width': roadWidth(0.7, 4.5) } },

      { id: 'road-major', type: 'line', source: 'composite', 'source-layer': 'road', minzoom: 8,
        filter: ['in', ['get', 'class'], ['literal', ['primary', 'primary_link', 'secondary', 'secondary_link', 'trunk', 'trunk_link']]],
        paint: { 'line-color': c.roadMajor, 'line-width': roadWidth(1.3, 8) } },

      { id: 'road-highway', type: 'line', source: 'composite', 'source-layer': 'road', minzoom: 6,
        filter: ['in', ['get', 'class'], ['literal', ['motorway', 'motorway_link']]],
        paint: { 'line-color': c.roadHighway, 'line-width': roadWidth(1.8, 10) } },

      { id: 'road-path', type: 'line', source: 'composite', 'source-layer': 'road', minzoom: 14,
        filter: ['in', ['get', 'class'], ['literal', ['path', 'pedestrian', 'track', 'steps']]],
        paint: {
          'line-color': c.roadService,
          'line-width': roadWidth(0.35, 1.8),
          'line-dasharray': [1.5, 1.5],
          'line-opacity': 0.6,
        } },

      // ── Labels: natural & water ───────────────────────────────────────────
      { id: 'natural-point-label', type: 'symbol', source: 'composite', 'source-layer': 'natural_label',
        minzoom: 4,
        filter: ['all', worldviewFilter, ['==', ['geometry-type'], 'Point'], ['<=', ['get', 'filterrank'], 3]],
        layout: {
          'text-field': localizeName,
          'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 10, 10, 16, 13],
          'icon-image': ['coalesce', ['image', ['get', 'maki']], ['image', 'park-15']],
          'icon-size': 0.9,
          'text-anchor': 'top',
          'text-offset': [0, 1.1],
          'text-max-width': 8,
        },
        paint: {
          'text-color': c.naturalLabel,
          'text-halo-color': '#FFFFFF',
          'text-halo-width': 2,
          'icon-color': c.poiIcon,
          'icon-opacity': 0.9,
        } },

      { id: 'waterway-label', type: 'symbol', source: 'composite', 'source-layer': 'natural_label',
        minzoom: 12,
        filter: ['all', worldviewFilter, ['==', ['geometry-type'], 'LineString'],
          ['in', ['get', 'class'], ['literal', ['river', 'canal', 'stream']]]],
        layout: {
          'text-field': localizeName,
          'text-font': ['DIN Pro Italic', 'Arial Unicode MS Regular'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 12, 10, 18, 14],
          'symbol-placement': 'line',
          'text-pitch-alignment': 'viewport',
        },
        paint: { 'text-color': c.waterLabel, 'text-halo-color': '#FFFFFF', 'text-halo-width': 2 } },

      // ── Labels: roads & places ────────────────────────────────────────────
      { id: 'road-label', type: 'symbol', source: 'composite', 'source-layer': 'road',
        minzoom: 10,
        filter: roadLabelFilter,
        layout: {
          'text-field': localizeName,
          'text-font': ['DIN Pro Regular', 'Arial Unicode MS Regular'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 12, 10, 16, 12, 18, 13],
          'symbol-placement': 'line',
          'text-rotation-alignment': 'map',
          'text-pitch-alignment': 'viewport',
          'text-max-angle': 30,
          'text-padding': 2,
        },
        paint: { 'text-color': c.roadLabel, 'text-halo-color': '#FFFFFF', 'text-halo-width': 2.2 } },

      { id: 'place-label-city', type: 'symbol', source: 'composite', 'source-layer': 'place_label',
        filter: ['all', worldviewFilter,
          ['==', ['get', 'class'], 'settlement'],
          ['in', ['get', 'type'], ['literal', ['city', 'town', 'village', 'hamlet']]]],
        layout: {
          'text-field': localizeName,
          'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 8, 11, 14, 17],
        },
        paint: { 'text-color': c.placeLabel, 'text-halo-color': '#FFFFFF', 'text-halo-width': 2.5 } },

      { id: 'place-label-area', type: 'symbol', source: 'composite', 'source-layer': 'place_label',
        minzoom: 10,
        filter: ['all', worldviewFilter,
          ['==', ['get', 'class'], 'settlement_subdivision'],
          ['in', ['get', 'type'], ['literal', ['suburb', 'quarter', 'neighbourhood']]]],
        layout: {
          'text-field': localizeName,
          'text-font': ['DIN Pro Regular', 'Arial Unicode MS Regular'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 11, 10, 15, 14],
        },
        paint: { 'text-color': c.placeLabel, 'text-halo-color': '#FFFFFF', 'text-halo-width': 2 } },

      { id: 'airport-label', type: 'symbol', source: 'composite', 'source-layer': 'airport_label',
        minzoom: 8,
        filter: worldviewFilter,
        layout: {
          'text-field': localizeName,
          'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 8, 10, 14, 14],
          'icon-image': ['coalesce', ['image', ['get', 'maki']], ['image', 'airport-15']],
          'icon-size': 1,
          'text-anchor': 'top',
          'text-offset': [0, 1.2],
        },
        paint: {
          'text-color': c.poiLabel,
          'text-halo-color': '#FFFFFF',
          'text-halo-width': 2,
          'icon-color': c.poiIcon,
        } },

      // ── Labels: POI (công viên, trường, bệnh viện, nhà hàng…) ───────────
      { id: 'poi-label', type: 'symbol', source: 'composite', 'source-layer': 'poi_label',
        minzoom: 12,
        filter: ['<=', ['get', 'filterrank'], 4],
        layout: {
          'text-field': localizeName,
          'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 12, 10, 16, 12, 18, 13],
          'icon-image': ['coalesce', ['image', ['get', 'maki']], ['image', 'marker-15']],
          'icon-size': ['interpolate', ['linear'], ['zoom'], 12, 0.75, 16, 0.95],
          'text-anchor': 'top',
          'text-offset': [0, 1.2],
          'text-max-width': 9,
          'text-padding': 2,
        },
        paint: {
          'text-color': c.poiLabel,
          'text-halo-color': '#FFFFFF',
          'text-halo-width': 2.2,
          'icon-color': c.poiIcon,
          'icon-opacity': 0.92,
        } },

      { id: 'transit-label', type: 'symbol', source: 'composite', 'source-layer': 'transit_stop_label',
        minzoom: 14,
        filter: ['<=', ['get', 'filterrank'], 3],
        layout: {
          'text-field': localizeName,
          'text-font': ['DIN Pro Regular', 'Arial Unicode MS Regular'],
          'text-size': 10,
          'icon-image': ['coalesce', ['image', ['get', 'maki']], ['image', 'bus-15']],
          'icon-size': 0.8,
          'text-anchor': 'top',
          'text-offset': [0, 1.1],
        },
        paint: {
          'text-color': c.poiLabel,
          'text-halo-color': '#FFFFFF',
          'text-halo-width': 1.8,
          'icon-color': c.poiIcon,
        } },

      // ── House numbers ─────────────────────────────────────────────────────
      { id: 'housenum-label', type: 'symbol', source: 'composite', 'source-layer': 'housenum_label',
        minzoom: 16,
        layout: {
          'text-field': ['get', 'house_num'],
          'text-font': ['DIN Pro Regular', 'Arial Unicode MS Regular'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 16, 10, 18, 12],
          'text-anchor': 'center',
          'text-padding': 4,
          'text-max-width': 7,
        },
        paint: {
          'text-color': c.addressLabel,
          'text-halo-color': '#FFFFFF',
          'text-halo-width': 2.2,
        } },
    ],
  };
}
