import { z } from 'zod';

// The browser's push endpoint is a URL the API will POST to: an SSRF risk (the VPS also hosts a
// live CRM on localhost). Only the four browser push services are accepted, over https on the
// default port, by host name (never an IP literal or userinfo). Checked at subscribe AND before
// every send (a row could predate a tighter list).

const EXACT_HOSTS: ReadonlySet<string> = new Set(['fcm.googleapis.com', 'updates.push.services.mozilla.com']);
/** Subdomains only (label boundary): «x.notify.windows.com», never «evilnotify.windows.com». */
const HOST_SUFFIXES = ['.push.services.mozilla.com', '.notify.windows.com', '.push.apple.com'] as const;

const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;

/** True when `endpoint` is an https URL of an allowed push service. */
export function pushEndpointAllowed(endpoint: string): boolean {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:' || url.username !== '' || url.password !== '' || url.port !== '') return false;
  const host = url.hostname.toLowerCase();
  if (host.startsWith('[') || IPV4.test(host)) return false;
  return EXACT_HOSTS.has(host) || HOST_SUFFIXES.some((s) => host.endsWith(s) && host.length > s.length);
}

const base64url = (len: number) => z.string().regex(new RegExp(`^[A-Za-z0-9_-]{${len}}$`), 'invalid_key');

/** PUT /me/web-push: PushSubscription.toJSON() (migration 380's column checks, plus the allow-list). */
export const webPushSubscriptionSchema = z.object({
  endpoint: z.string().max(2048).refine(pushEndpointAllowed, 'endpoint_not_allowed'),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({ p256dh: base64url(87), auth: base64url(22) }),
});
export type WebPushSubscriptionInput = z.infer<typeof webPushSubscriptionSchema>;

/** DELETE /me/web-push?endpoint=…: any URL-ish string (removing never reaches out). */
export const webPushEndpointQuery = z.object({ endpoint: z.string().min(1).max(2048) });
