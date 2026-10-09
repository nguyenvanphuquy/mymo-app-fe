import { Platform } from 'react-native';

import type { ColorMatrix } from '../constants/beautyFilters';

/** Offsets from rn-color-matrices are 0–1 on iOS and 0–255 elsewhere. Pixel buffers are 0–255. */
export function matrixForPixels(matrix: ColorMatrix): ColorMatrix {
  if (Platform.OS !== 'ios') return matrix;
  const next = [...matrix] as ColorMatrix;
  next[4] *= 255;
  next[9] *= 255;
  next[14] *= 255;
  next[19] *= 255;
  return next;
}

function clampChannel(value: number): number {
  if (value < 0) return 0;
  if (value > 255) return 255;
  return value;
}

export function applyColorMatrix(pixels: Uint8ClampedArray | Uint8Array, matrix: ColorMatrix): void {
  const m = matrixForPixels(matrix);
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const a = pixels[i + 3];
    pixels[i] = clampChannel(m[0] * r + m[1] * g + m[2] * b + m[3] * a + m[4]);
    pixels[i + 1] = clampChannel(m[5] * r + m[6] * g + m[7] * b + m[8] * a + m[9]);
    pixels[i + 2] = clampChannel(m[10] * r + m[11] * g + m[12] * b + m[13] * a + m[14]);
  }
}
