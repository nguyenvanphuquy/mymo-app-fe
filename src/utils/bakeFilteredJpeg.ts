import { File, Paths } from 'expo-file-system';
import { decode, encode } from 'jpeg-js';

import type { ColorMatrix } from '../constants/beautyFilters';
import { applyColorMatrix } from './applyColorMatrix';

const MAX_EDGE = 1600;

function downsample(
  data: Uint8Array,
  width: number,
  height: number,
): { data: Uint8Array; width: number; height: number } {
  const edge = Math.max(width, height);
  if (edge <= MAX_EDGE) return { data, width, height };

  const scale = MAX_EDGE / edge;
  const tw = Math.max(1, Math.round(width * scale));
  const th = Math.max(1, Math.round(height * scale));
  const out = new Uint8Array(tw * th * 4);

  for (let y = 0; y < th; y += 1) {
    const sy = Math.min(height - 1, Math.floor(y / scale));
    for (let x = 0; x < tw; x += 1) {
      const sx = Math.min(width - 1, Math.floor(x / scale));
      const source = (sy * width + sx) * 4;
      const target = (y * tw + x) * 4;
      out[target] = data[source];
      out[target + 1] = data[source + 1];
      out[target + 2] = data[source + 2];
      out[target + 3] = data[source + 3];
    }
  }

  return { data: out, width: tw, height: th };
}

async function readBytes(uri: string): Promise<Uint8Array> {
  try {
    return await new File(uri).bytes();
  } catch {
    const response = await fetch(uri);
    return new Uint8Array(await response.arrayBuffer());
  }
}

/** Bake a color matrix into a JPEG so the uploaded photo matches the camera preview. */
export async function bakeFilteredJpeg(uri: string, matrix: ColorMatrix): Promise<string> {
  const source = decode(await readBytes(uri), { useTArray: true, formatAsRGBA: true });
  const sized = downsample(source.data, source.width, source.height);
  applyColorMatrix(sized.data, matrix);

  const encoded = encode({ data: sized.data, width: sized.width, height: sized.height }, 85);
  const file = new File(Paths.cache, `mymo-filter-${Date.now()}.jpg`);
  if (!file.exists) file.create();
  file.write(encoded.data);
  return file.uri;
}
