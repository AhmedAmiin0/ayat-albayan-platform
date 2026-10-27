import { createHash, randomBytes } from 'node:crypto';

/** Who holds a device (an app token or a browser endpoint) right now, as the API sees it. */
interface DeviceHolder {
  profileId: string;
  /** Its binding's auth session is still live (push_live_sessions). */
  live: boolean;
  /** The request proved it is that same device: the app's device key, the browser's own keys. */
  proven: boolean;
}

/**
 * May `caller` bind this device (docs/04-architecture.md «Push devices»)? Yes when nobody holds it,
 * when the caller already does, when the holder's session has ended, or when the request proves it
 * comes from that very device (a phone handed over without a sign-out reaching us). Never on the
 * strength of the token alone: an admin who learnt another person's token cannot pull their device
 * onto their own alerts while that person is still signed in on it. Pure.
 */
export function mayClaimDevice(caller: string, holder: DeviceHolder | null): boolean {
  return !holder || holder.profileId === caller || !holder.live || holder.proven;
}

/** 409 body when a device is someone else's (the app ignores it and retries on its next start). */
export const DEVICE_IN_USE = 'push_device_in_use';

/** A fresh device key: 32 random bytes, base64url (43 characters). Only the device keeps it. */
export function mintDeviceKey(): string {
  return randomBytes(32).toString('base64url');
}

/** What the database stores of a device key (migration 720): its sha256, hex. */
export function deviceKeyHash(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}
