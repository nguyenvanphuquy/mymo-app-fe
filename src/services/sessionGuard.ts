import { DeviceEventEmitter } from 'react-native';
import { clearAuthSession } from './authApi';

export const AUTH_EXPIRED = 'auth:expired';

let expiring = false;

export function isAccessTokenExpired(token: string | null | undefined): boolean {
  if (!token) return true;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return true;
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    if (pad) base64 += '='.repeat(4 - pad);
    let json: string;
    if (typeof globalThis.atob === 'function') {
      json = globalThis.atob(base64);
    } else {
      const { Buffer } = require('buffer') as typeof import('buffer');
      json = Buffer.from(base64, 'base64').toString('utf8');
    }
    const payload = JSON.parse(json) as { exp?: number };
    if (!payload.exp) return false;
    return payload.exp * 1000 <= Date.now() + 15_000;
  } catch {
    return true;
  }
}

/** Drop the saved login and tell the app to open the login screen. */
export function expireSession(): void {
  if (expiring) return;
  expiring = true;
  void clearAuthSession()
    .catch(() => {})
    .finally(() => {
      DeviceEventEmitter.emit(AUTH_EXPIRED);
      setTimeout(() => {
        expiring = false;
      }, 1500);
    });
}

export function rejectIfUnauthorized(status: number): void {
  if (status === 401) expireSession();
}
