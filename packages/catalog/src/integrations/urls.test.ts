import { describe, expect, it } from 'vitest';
import { integrationValueValid } from './checks';
import { httpsUrl, livekitUrl } from './urls';

const ok = (schema: typeof httpsUrl, raw: string) => schema.safeParse(raw).success;

// Audit T1: a base carrying a secret or the classroom's media never goes over plain http/ws.
describe('livekitUrl', () => {
  it.each(['wss://livekit.example.org', 'ws://localhost:7880', 'ws://127.0.0.1:7880'])(
    'accepts %s',
    (raw) => expect(ok(livekitUrl, raw)).toBe(true),
  );
  it.each([
    'ws://livekit.example.org',
    'https://livekit.example.org',
    'ws://localhost.evil.example:7880',
    'ws://localhost@evil.example',
    'not a url',
  ])('refuses %s', (raw) => expect(ok(livekitUrl, raw)).toBe(false));
});

describe('httpsUrl', () => {
  it.each(['https://graph.facebook.com', 'http://localhost:4010', 'http://127.0.0.1:9/'])(
    'accepts %s',
    (raw) => expect(ok(httpsUrl, raw)).toBe(true),
  );
  it.each(['http://graph.facebook.com', 'ftp://example.org', 'http://10.0.0.5', 'wss://x.example'])(
    'refuses %s',
    (raw) => expect(ok(httpsUrl, raw)).toBe(false),
  );
});

describe('the DB-editable bases use them', () => {
  const keys = ['WA_API_BASE', 'KAPSO_API_BASE', 'WACRM_API_BASE', 'EXPO_API_BASE', 'FX_API_URL'] as const;
  it.each(keys)('%s: https yes, plain http to a public host no', (key) => {
    expect(integrationValueValid(key, 'https://api.example.org/v1')).toBe(true);
    expect(integrationValueValid(key, 'http://api.example.org/v1')).toBe(false);
  });
  it('LIVEKIT_URL: wss yes, ws to a public host no', () => {
    expect(integrationValueValid('LIVEKIT_URL', 'wss://live.example.org')).toBe(true);
    expect(integrationValueValid('LIVEKIT_URL', 'ws://live.example.org')).toBe(false);
  });
});
