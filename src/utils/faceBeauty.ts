import type { ColorMatrix } from '../constants/beautyFilters';
import { applyColorMatrix } from './applyColorMatrix';

export type FaceBeautyLevel = 0 | 1 | 2 | 3;

const STRENGTH = [0, 0.4, 0.68, 0.92] as const;

type NormPoint = { x: number; y: number };
type Ellipse = { cx: number; cy: number; rx: number; ry: number };

type Landmarker = {
  detectForVideo: (frame: CanvasImageSource, timestamp: number) => { faceLandmarks?: NormPoint[][] };
  setOptions: (options: { runningMode: 'IMAGE' | 'VIDEO' }) => Promise<void>;
  detect: (image: CanvasImageSource) => { faceLandmarks?: NormPoint[][] };
};

let landmarkerPromise: Promise<Landmarker> | null = null;
let runningMode: 'IMAGE' | 'VIDEO' = 'VIDEO';
let lastTimestamp = 0;
let gate: Promise<unknown> = Promise.resolve();
function exclusive<T>(work: () => Promise<T>): Promise<T> {
  const run = gate.then(work, work);
  gate = run.then(() => undefined, () => undefined);
  return run;
}

const VISION_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.0/vision_bundle.mjs';
const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.0/wasm';

type VisionModule = typeof import('@mediapipe/tasks-vision');

function loadVision(): Promise<VisionModule> {
  const importer = new Function('specifier', 'return import(specifier)') as (
    specifier: string,
  ) => Promise<VisionModule>;
  return importer(VISION_URL);
}
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

export function faceBeautyStrength(level: FaceBeautyLevel): number {
  return STRENGTH[level];
}

export function prepareFaceBeauty(): Promise<void> {
  return ensureLandmarker().then(() => undefined);
}

async function ensureLandmarker(): Promise<Landmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = createLandmarker().catch(error => {
      landmarkerPromise = null;
      throw error;
    });
  }
  return landmarkerPromise;
}

async function createLandmarker(): Promise<Landmarker> {
  const vision = await loadVision();
  const fileset = await vision.FilesetResolver.forVisionTasks(WASM_URL);
  const options = {
    baseOptions: { modelAssetPath: MODEL_URL },
    runningMode: 'VIDEO' as const,
    numFaces: 1,
    outputFaceBlendshapes: false,
    outputFacialTransformationMatrixes: false,
  };
  try {
    return await vision.FaceLandmarker.createFromOptions(fileset, {
      ...options,
      baseOptions: { ...options.baseOptions, delegate: 'GPU' },
    });
  } catch {
    return vision.FaceLandmarker.createFromOptions(fileset, options);
  }
}

function nextTimestamp(now: number): number {
  lastTimestamp = Math.max(lastTimestamp + 1, Math.round(now));
  return lastTimestamp;
}

function firstFace(result: { faceLandmarks?: NormPoint[][] }): NormPoint[] | null {
  const face = result.faceLandmarks?.[0];
  return face && face.length > 454 ? face : null;
}

export async function landmarksFromVideo(video: HTMLVideoElement, now = performance.now()): Promise<NormPoint[] | null> {
  return exclusive(async () => {
    const landmarker = await ensureLandmarker();
    if (runningMode !== 'VIDEO') {
      await landmarker.setOptions({ runningMode: 'VIDEO' });
      runningMode = 'VIDEO';
    }
    return firstFace(landmarker.detectForVideo(video, nextTimestamp(now)));
  });
}

export async function drawBeautyPreview(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  level: FaceBeautyLevel,
  matrix: ColorMatrix,
): Promise<boolean> {
  const strength = faceBeautyStrength(level);
  if (strength <= 0 || video.readyState < 2) return false;
  const maxWidth = 640;
  const sourceWidth = video.videoWidth || maxWidth;
  const sourceHeight = video.videoHeight || 480;
  const scale = Math.min(1, maxWidth / sourceWidth);
  const width = Math.max(2, Math.round(sourceWidth * scale));
  const height = Math.max(2, Math.round(sourceHeight * scale));
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return false;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(video, 0, 0, width, height);
  const landmarks = await landmarksFromVideo(video);
  const frame = ctx.getImageData(0, 0, width, height);
  paintFaceBeauty(frame, landmarks, strength);
  applyColorMatrix(frame.data, matrix);
  ctx.putImageData(frame, 0, 0);
  return true;
}

export async function beautifyCanvas(canvas: HTMLCanvasElement, level: FaceBeautyLevel): Promise<boolean> {
  const strength = faceBeautyStrength(level);
  if (strength <= 0) return false;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return false;

  return exclusive(async () => {
    const landmarker = await ensureLandmarker();
    if (runningMode !== 'IMAGE') {
      await landmarker.setOptions({ runningMode: 'IMAGE' });
      runningMode = 'IMAGE';
    }
    const landmarks = firstFace(landmarker.detect(canvas));
    const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const changed = paintFaceBeauty(frame, landmarks, strength);
    if (changed) ctx.putImageData(frame, 0, 0);
    return changed;
  });
}

export function paintFaceBeauty(
  frame: ImageData,
  landmarks: NormPoint[] | null,
  strength: number,
): boolean {
  if (!landmarks || strength <= 0) return false;
  const { width, height, data } = frame;
  const face = faceEllipse(landmarks, width, height);
  if (!face || face.rx < 24 || face.ry < 24) return false;

  const eyes = eyeEllipses(landmarks, width, height);
  const mouth = mouthEllipse(landmarks, width, height);
  const features = [...eyes, noseEllipse(landmarks, width, height), browEllipses(landmarks, width, height), mouth].filter(
    (item): item is Ellipse => item !== null,
  );
  const radius = Math.max(3, Math.round((5 + strength * 8) * (width / 720)));
  const smooth = boxBlur(data, width, height, radius);
  const mask = skinMask(width, height, face, features, strength);
  blendSkin(data, data, smooth, mask);
  return true;
}

function faceEllipse(landmarks: NormPoint[], width: number, height: number): Ellipse | null {
  const forehead = point(landmarks, 10, width, height);
  const chin = point(landmarks, 152, width, height);
  const left = point(landmarks, 234, width, height);
  const right = point(landmarks, 454, width, height);
  if (!forehead || !chin || !left || !right) return null;
  return {
    cx: (left.x + right.x) / 2,
    cy: (forehead.y + chin.y) / 2,
    rx: Math.abs(right.x - left.x) / 2,
    ry: Math.abs(chin.y - forehead.y) / 2,
  };
}

function eyeEllipses(landmarks: NormPoint[], width: number, height: number): Ellipse[] {
  return [
    pairEllipse(landmarks, 33, 133, width, height, 1.05, 1.35),
    pairEllipse(landmarks, 263, 362, width, height, 1.05, 1.35),
  ].filter((item): item is Ellipse => item !== null);
}

function mouthEllipse(landmarks: NormPoint[], width: number, height: number): Ellipse | null {
  return pairEllipse(landmarks, 61, 291, width, height, 0.78, 1.45);
}

function noseEllipse(landmarks: NormPoint[], width: number, height: number): Ellipse | null {
  const left = point(landmarks, 98, width, height);
  const right = point(landmarks, 327, width, height);
  const tip = point(landmarks, 1, width, height);
  if (!left || !right || !tip) return null;
  const span = Math.hypot(right.x - left.x, right.y - left.y);
  return {
    cx: (left.x + right.x) / 2,
    cy: tip.y,
    rx: Math.max(8, span * 0.85),
    ry: Math.max(10, span * 1.05),
  };
}

function browEllipses(landmarks: NormPoint[], width: number, height: number): Ellipse | null {
  const left = pairEllipse(landmarks, 70, 107, width, height, 0.85, 0.7);
  const right = pairEllipse(landmarks, 300, 336, width, height, 0.85, 0.7);
  if (!left || !right) return left || right;
  return {
    cx: (left.cx + right.cx) / 2,
    cy: (left.cy + right.cy) / 2,
    rx: Math.abs(right.cx - left.cx) / 2 + Math.max(left.rx, right.rx),
    ry: Math.max(left.ry, right.ry, 8),
  };
}

function pairEllipse(
  landmarks: NormPoint[],
  start: number,
  end: number,
  width: number,
  height: number,
  rxScale: number,
  ryScale: number,
): Ellipse | null {
  const a = point(landmarks, start, width, height);
  const b = point(landmarks, end, width, height);
  if (!a || !b) return null;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const span = Math.hypot(dx, dy);
  return {
    cx: (a.x + b.x) / 2,
    cy: (a.y + b.y) / 2,
    rx: Math.max(6, span * rxScale),
    ry: Math.max(5, span * ryScale * 0.42),
  };
}

function point(landmarks: NormPoint[], index: number, width: number, height: number): { x: number; y: number } | null {
  const mark = landmarks[index];
  if (!mark) return null;
  return { x: mark.x * width, y: mark.y * height };
}

function inside(ellipse: Ellipse, x: number, y: number, scale = 1): number {
  const dx = (x - ellipse.cx) / (ellipse.rx * scale);
  const dy = (y - ellipse.cy) / (ellipse.ry * scale);
  return dx * dx + dy * dy;
}

function skinMask(
  width: number,
  height: number,
  face: Ellipse,
  features: Ellipse[],
  strength: number,
): Uint8Array {
  const mask = new Uint8Array(width * height);
  const peak = 170 + strength * 70;
  const x0 = Math.max(0, Math.floor(face.cx - face.rx));
  const x1 = Math.min(width - 1, Math.ceil(face.cx + face.rx));
  const y0 = Math.max(0, Math.floor(face.cy - face.ry));
  const y1 = Math.min(height - 1, Math.ceil(face.cy + face.ry));

  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      const dist = inside(face, x, y, 0.92);
      if (dist > 1) continue;
      if (features.some(feature => inside(feature, x, y) <= 1)) continue;
      const edge = Math.min(1, (1 - Math.sqrt(dist)) * 2.4);
      mask[y * width + x] = Math.round(edge * peak);
    }
  }

  return mask;
}

function blendSkin(
  dest: Uint8ClampedArray,
  sharp: Uint8ClampedArray,
  smooth: Uint8ClampedArray,
  mask: Uint8Array,
): void {
  for (let p = 0; p < mask.length; p += 1) {
    const amount = mask[p];
    if (!amount) continue;
    const keep = 255 - amount;
    const i = p * 4;
    const lift = (6 * amount) / 255;
    dest[i] = Math.min(255, (smooth[i] * amount + sharp[i] * keep) / 255 + lift);
    dest[i + 1] = Math.min(255, (smooth[i + 1] * amount + sharp[i + 1] * keep) / 255 + lift * 0.7);
    dest[i + 2] = Math.min(255, (smooth[i + 2] * amount + sharp[i + 2] * keep) / 255 + lift * 0.55);
    dest[i + 3] = sharp[i + 3];
  }
}

function boxBlur(src: Uint8ClampedArray, width: number, height: number, radius: number): Uint8ClampedArray {
  const tmp = new Uint8ClampedArray(src.length);
  const dst = new Uint8ClampedArray(src.length);
  blurHorizontal(src, tmp, width, height, radius);
  blurVertical(tmp, dst, width, height, radius);
  return dst;
}

function blurHorizontal(
  src: Uint8ClampedArray,
  dst: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number,
): void {
  const windowSize = radius * 2 + 1;
  for (let y = 0; y < height; y += 1) {
    let red = 0;
    let green = 0;
    let blue = 0;
    const row = y * width;
    for (let k = -radius; k <= radius; k += 1) {
      const x = Math.min(width - 1, Math.max(0, k));
      const i = (row + x) * 4;
      red += src[i];
      green += src[i + 1];
      blue += src[i + 2];
    }
    for (let x = 0; x < width; x += 1) {
      const i = (row + x) * 4;
      dst[i] = red / windowSize;
      dst[i + 1] = green / windowSize;
      dst[i + 2] = blue / windowSize;
      dst[i + 3] = src[i + 3];
      const remove = (row + Math.max(0, x - radius)) * 4;
      const add = (row + Math.min(width - 1, x + radius + 1)) * 4;
      red += src[add] - src[remove];
      green += src[add + 1] - src[remove + 1];
      blue += src[add + 2] - src[remove + 2];
    }
  }
}

function blurVertical(
  src: Uint8ClampedArray,
  dst: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number,
): void {
  const windowSize = radius * 2 + 1;
  for (let x = 0; x < width; x += 1) {
    let red = 0;
    let green = 0;
    let blue = 0;
    for (let k = -radius; k <= radius; k += 1) {
      const y = Math.min(height - 1, Math.max(0, k));
      const i = (y * width + x) * 4;
      red += src[i];
      green += src[i + 1];
      blue += src[i + 2];
    }
    for (let y = 0; y < height; y += 1) {
      const i = (y * width + x) * 4;
      dst[i] = red / windowSize;
      dst[i + 1] = green / windowSize;
      dst[i + 2] = blue / windowSize;
      dst[i + 3] = src[i + 3];
      const remove = (Math.max(0, y - radius) * width + x) * 4;
      const add = (Math.min(height - 1, y + radius + 1) * width + x) * 4;
      red += src[add] - src[remove];
      green += src[add + 1] - src[remove + 1];
      blue += src[add + 2] - src[remove + 2];
    }
  }
}
