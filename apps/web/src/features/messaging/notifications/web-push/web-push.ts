import { deleteWebPush, saveWebPush } from '@/features/messaging/notifications/api';

// This browser's push subscription (R-NOT-01): public/sw.js shows what arrives. Subscribing asks
// for permission, so it only ever runs from a click («فعّل إشعارات المتصفح»), never on load.

export const SW_URL = '/sw.js';
/** Longest sign-out waits for the subscription to be forgotten. */
export const FORGET_TIMEOUT_MS = 1_500;

/** The VAPID public key (base64url) as the bytes pushManager.subscribe takes. */
export function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4);
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

/** The subscription of this browser, or null (no worker, never subscribed, no push support). */
export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator)) return null;
  const registration = await navigator.serviceWorker.getRegistration(SW_URL);
  return (await registration?.pushManager.getSubscription()) ?? null;
}

/**
 * On load: this browser's existing subscription is PUT again (best effort), so the server binds it
 * to the session now signed in (migration 700: a push goes only to a browser bound to a live
 * session). Null when there is none. Never prompts.
 */
export async function rebindWebPush(): Promise<PushSubscription | null> {
  const subscription = await currentSubscription();
  if (subscription) await saveWebPush(subscription.toJSON()).catch(() => undefined);
  return subscription;
}

export type SubscribeResult = 'subscribed' | NotificationPermission;

/** Permission prompt → worker → subscription → PUT /me/web-push. Throws when a step fails. */
export async function subscribeWebPush(publicKey: string): Promise<SubscribeResult> {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission;
  await navigator.serviceWorker.register(SW_URL);
  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ?? (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToBytes(publicKey) }));
  await saveWebPush(subscription.toJSON());
  return 'subscribed';
}

/** DELETE /me/web-push for this browser, then drop the subscription. Throws when the API fails. */
export async function unsubscribeWebPush(): Promise<void> {
  const subscription = await currentSubscription();
  if (!subscription) return;
  await deleteWebPush(subscription.endpoint);
  await subscription.unsubscribe();
}

/**
 * Drops this browser's subscription locally only (no API call: used once the session is gone).
 * The server row then answers 404/410 on the next push and is deleted there. Never throws.
 */
export async function dropLocalWebPush(): Promise<void> {
  try {
    await (await currentSubscription())?.unsubscribe();
  } catch {
    // best effort
  }
}

async function forget(): Promise<void> {
  const subscription = await currentSubscription();
  if (!subscription) return;
  await deleteWebPush(subscription.endpoint).catch(() => undefined);
  await subscription.unsubscribe();
}

/**
 * Sign-out and sign-in: the next person on this browser must not get the previous user's pushes,
 * and must opt in again themselves (a leftover subscription is never re-sent for a new user).
 * Best effort: never throws, never waits longer than FORGET_TIMEOUT_MS. Runs before supabase
 * signOut / signInWithPassword (the DELETE needs the outgoing user's token).
 */
export async function forgetWebPush(): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, FORGET_TIMEOUT_MS);
  });
  try {
    await Promise.race([forget().catch(() => undefined), timeout]);
  } finally {
    clearTimeout(timer);
  }
}
