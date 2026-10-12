import { describe, expect, it } from 'vitest';
import { pushEndpointAllowed, webPushSubscriptionSchema } from './web-push.endpoint';

const KEYS = { p256dh: `B${'A'.repeat(86)}`, auth: 'A'.repeat(22) };

describe('push endpoint allow-list (SSRF guard)', () => {
  it.each([
    'https://fcm.googleapis.com/fcm/send/abc:APA91b',
    'https://updates.push.services.mozilla.com/wpush/v2/gAAAAA',
    'https://eu-west.push.services.mozilla.com/wpush/v2/x',
    'https://wns2-par02p.notify.windows.com/w/?token=BQYAAAB',
    'https://web.push.apple.com/QGuQyavXutnMH',
  ])('accepts %s', (url) => expect(pushEndpointAllowed(url)).toBe(true));

  it.each([
    ['http, not https', 'http://fcm.googleapis.com/fcm/send/x'],
    ['localhost', 'https://localhost/fcm/send/x'],
    ['loopback IPv4', 'https://127.0.0.1/x'],
    ['IPv6 literal', 'https://[::1]/x'],
    ['userinfo trick', 'https://fcm.googleapis.com@127.0.0.1/x'],
    ['userinfo on an allowed host', 'https://user:pw@fcm.googleapis.com/x'],
    ['another host', 'https://evil.example.com/fcm.googleapis.com'],
    ['look-alike suffix', 'https://evilnotify.windows.com/x'],
    ['bare suffix', 'https://push.apple.com/x'],
    ['non-default port', 'https://fcm.googleapis.com:8443/x'],
    ['trailing-dot host', 'https://fcm.googleapis.com./x'],
    ['not a URL', 'fcm.googleapis.com/x'],
  ])('rejects %s', (_why, url) => expect(pushEndpointAllowed(url)).toBe(false));
});

describe('webPushSubscriptionSchema', () => {
  it('accepts PushSubscription.toJSON()', () => {
    const sub = { endpoint: 'https://fcm.googleapis.com/fcm/send/x', expirationTime: null, keys: KEYS };
    expect(webPushSubscriptionSchema.parse(sub)).toEqual(sub);
  });

  it('refuses a disallowed endpoint or malformed keys', () => {
    expect(webPushSubscriptionSchema.safeParse({ endpoint: 'https://127.0.0.1/x', keys: KEYS }).success).toBe(false);
    expect(webPushSubscriptionSchema.safeParse({ endpoint: 'https://fcm.googleapis.com/x', keys: { ...KEYS, auth: 'short' } }).success).toBe(false);
    expect(webPushSubscriptionSchema.safeParse({ endpoint: 'https://fcm.googleapis.com/x', keys: { ...KEYS, p256dh: `${KEYS.p256dh}=` } }).success).toBe(false);
  });
});
