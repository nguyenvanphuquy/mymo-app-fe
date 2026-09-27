import { PixelRatio } from 'react-native';
import { getAssetByID } from 'react-native-web/dist/modules/AssetRegistry';

export const DEFAULT_AVATAR = require('../../assets/default-avatar.jpg');

const DEFAULT_AVATAR_PATH = '/defaults/user-avatar.jpg';

type WebAsset = {
  uri?: string;
  httpServerLocation?: string;
  name?: string;
  type?: string;
  scales?: number[];
};

export function isDefaultAvatar(url?: string | null): boolean {
  const value = url?.trim();
  return !value || value.includes(DEFAULT_AVATAR_PATH);
}

function bundledAvatarUri(): string {
  const source = DEFAULT_AVATAR as unknown;
  if (typeof source === 'string') return source;
  if (source && typeof source === 'object' && typeof (source as { uri?: string }).uri === 'string') {
    return (source as { uri: string }).uri;
  }
  if (typeof source !== 'number') return '';

  const asset = getAssetByID(source) as WebAsset | undefined;
  if (!asset) return '';
  if (asset.uri) return asset.uri;
  if (!asset.httpServerLocation || !asset.name || !asset.type) return '';

  const scales = asset.scales ?? [1];
  let scale = scales[0] ?? 1;
  if (scales.length > 1) {
    const preferred = PixelRatio.get();
    scale = scales.reduce((prev, curr) =>
      Math.abs(curr - preferred) < Math.abs(prev - preferred) ? curr : prev);
  }
  const scaleSuffix = scale !== 1 ? `@${scale}x` : '';
  return `${asset.httpServerLocation}/${asset.name}${scaleSuffix}.${asset.type}`;
}

/** Local bundled image when the account has no custom photo. */
export function avatarUri(url?: string | null): string {
  if (!isDefaultAvatar(url)) return url!.trim();
  return bundledAvatarUri();
}
