import { describe, expect, it } from 'vitest';
import { pushEndpointAllowed } from '../web-push-endpoint';

describe('pushEndpointAllowed: the browser push services only', () => {
  it.each([
    'https://fcm.googleapis.com/fcm/send/abc:APA91b',
    'https://updates.push.services.mozilla.com/wpush/v2/gAAAAA',
    'https://eu-west.push.services.mozilla.com/wpush/v2/x',
    'https://wns2-par02p.notify.windows.com/w/?token=BQYAAAB',
    'https://web.push.apple.com/QGuQyavXutnMH',
    'https://FCM.googleapis.com/x',
    'https://fcm.googleapis.com:443/x',
    'https://@fcm.googleapis.com/x',
    ' https://fcm.googleapis.com/x\n',
  ])('accepts %s', (url) => expect(pushEndpointAllowed(url)).toBe(true));

  it.each([
    ['http, not https', 'http://fcm.googleapis.com/fcm/send/x'],
    ['localhost', 'https://localhost/fcm/send/x'],
    ['loopback IPv4', 'https://127.0.0.1/x'],
    ['IPv6 literal', 'https://[::1]/x'],
    ['userinfo trick', 'https://fcm.googleapis.com@127.0.0.1/x'],
    ['userinfo on an allowed host', 'https://user:pw@fcm.googleapis.com/x'],
    ['a password alone', 'https://:pw@fcm.googleapis.com/x'],
    ['another host', 'https://evil.example.com/fcm.googleapis.com'],
    ['look-alike suffix', 'https://evilnotify.windows.com/x'],
    ['bare suffix', 'https://push.apple.com/x'],
    ['empty first label', 'https://.push.apple.com/x'],
    ['non-default port', 'https://fcm.googleapis.com:8443/x'],
    ['trailing-dot host', 'https://fcm.googleapis.com./x'],
    ['not a URL', 'fcm.googleapis.com/x'],
    ['padding the URL parser keeps', ' https://fcm.googleapis.com/x'],
    ['trailing padding the URL parser keeps', 'https://fcm.googleapis.com/x '],
  ])('rejects %s', (_why, url) => expect(pushEndpointAllowed(url)).toBe(false));
});
