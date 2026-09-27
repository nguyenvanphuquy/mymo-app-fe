import { Image } from 'react-native';

export const DEFAULT_AVATAR = require('../../assets/default-avatar.jpg');

const DEFAULT_AVATAR_PATH = '/defaults/user-avatar.jpg';

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
  const resolve = (Image as { resolveAssetSource?: (asset: unknown) => { uri?: string } | null }).resolveAssetSource;
  if (typeof resolve === 'function') return resolve(source)?.uri ?? '';
  return '';
}

/** Local bundled image when the account has no custom photo. */
export function avatarUri(url?: string | null): string {
  if (!isDefaultAvatar(url)) return url!.trim();
  return bundledAvatarUri();
}
