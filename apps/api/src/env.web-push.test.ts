import { describe, expect, it } from 'vitest';
import { loadEnv, validOverlay, webPushEnv } from './env';

const BASE = { SUPABASE_URL: 'http://127.0.0.1:54321', SUPABASE_SERVICE_ROLE_KEY: 'k' };
// Shapes only: not a real key pair.
const WP = {
  WEB_PUSH_VAPID_PUBLIC_KEY: `B${'A'.repeat(86)}`,
  WEB_PUSH_VAPID_PRIVATE_KEY: 'A'.repeat(43),
  WEB_PUSH_SUBJECT: 'mailto:ops@example.com',
};

describe('env: web push (R-NOT-02, all three or none)', () => {
  it('boots without any WEB_PUSH_* value; browser push is then off', () => {
    expect(webPushEnv(loadEnv(BASE))).toBeNull();
    expect(webPushEnv(loadEnv({ ...BASE, WEB_PUSH_VAPID_PUBLIC_KEY: '', WEB_PUSH_VAPID_PRIVATE_KEY: '', WEB_PUSH_SUBJECT: '' }))).toBeNull();
  });

  it('is configured only when the two keys and the subject are all there', () => {
    expect(webPushEnv(loadEnv({ ...BASE, ...WP }))).toEqual({
      publicKey: WP.WEB_PUSH_VAPID_PUBLIC_KEY,
      privateKey: WP.WEB_PUSH_VAPID_PRIVATE_KEY,
      subject: WP.WEB_PUSH_SUBJECT,
    });
    expect(webPushEnv(loadEnv({ ...BASE, ...WP, WEB_PUSH_SUBJECT: '' }))).toBeNull();
    expect(webPushEnv(loadEnv({ ...BASE, WEB_PUSH_VAPID_PRIVATE_KEY: WP.WEB_PUSH_VAPID_PRIVATE_KEY }))).toBeNull();
  });

  it('a malformed key or subject fails the boot', () => {
    expect(() => loadEnv({ ...BASE, ...WP, WEB_PUSH_VAPID_PUBLIC_KEY: 'short' })).toThrow();
    expect(() => loadEnv({ ...BASE, ...WP, WEB_PUSH_SUBJECT: 'http://example.com' })).toThrow();
  });

  it('a database value is checked by the same schema (a bad one is dropped by its key)', () => {
    const bad: string[] = [];
    const out = validOverlay({ WEB_PUSH_SUBJECT: 'https://example.com', WEB_PUSH_VAPID_PUBLIC_KEY: 'nope' }, (k) => bad.push(k));
    expect(out).toEqual({ WEB_PUSH_SUBJECT: 'https://example.com' });
    expect(bad).toEqual(['WEB_PUSH_VAPID_PUBLIC_KEY']);
  });
});
