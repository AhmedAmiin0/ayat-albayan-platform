import { evolutionConfigSchema } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { createBody, proxyBody, settingsBody, webhookBody } from './evolution-push-bodies';
import { proxyMatch, settingsMatch, webhookMatch } from './evolution-readback';

// Evolution v2's bodies (DTOs at fa09d37) and the read-back comparisons, pure.

const proxyOn = evolutionConfigSchema.parse({
  proxy: { enabled: true, host: 'proxy.example.test', port: 3128, protocol: 'http', username: 'u' },
});

describe('Evolution push bodies', () => {
  it('settings by Evolution names, defaults safe (groups ignored, nothing automatic)', () => {
    expect(settingsBody(evolutionConfigSchema.parse({}))).toEqual({
      rejectCall: false, msgCall: '', groupsIgnore: true, alwaysOnline: false, readMessages: false,
      readStatus: false, syncFullHistory: false,
    });
  });

  it('proxy: the port as a string and the password only in the body; off sends placeholders', () => {
    expect(proxyBody(proxyOn, 'fake-pass')).toEqual({
      enabled: true, host: 'proxy.example.test', port: '3128', protocol: 'http', username: 'u', password: 'fake-pass',
    });
    expect(proxyBody(evolutionConfigSchema.parse({}), 'fake-pass')).not.toHaveProperty('password');
  });

  it('a Cloud instance is created with its Meta ids', () => {
    const config = evolutionConfigSchema.parse({ cloud: { phone_number_id: '111', business_id: '222' } });
    const body = createBody({ instance: 'c-1', mode: 'cloud', token: 'fake-meta', config });
    expect(body).toMatchObject({ integration: 'WHATSAPP-BUSINESS', number: '111', businessId: '222' });
  });
});

describe('Evolution read-back', () => {
  const plain = evolutionConfigSchema.parse({});
  it('compares settings with absent values as off, and never the proxy password', () => {
    expect(settingsMatch({ groupsIgnore: true }, plain)).toBe(true);
    expect(settingsMatch({ groupsIgnore: true, alwaysOnline: true }, plain)).toBe(false);
    const found = { enabled: true, host: 'proxy.example.test', port: '3128', protocol: 'http', username: 'u' };
    expect(proxyMatch(found, proxyOn)).toBe(true);
    expect(proxyMatch({ ...found, port: '8080' }, proxyOn)).toBe(false);
    expect(proxyMatch(null, plain)).toBe(true);
  });

  it('a webhook matches on the server URL, events (any order) and both flags off', () => {
    const want = { config: plain, url: 'http://ayat-lb:8080/webhooks/evolution/x' };
    const events = [...plain.webhook.events].reverse();
    const found = { enabled: true, url: want.url, events };
    expect(webhookMatch(found, want)).toBe(true);
    expect(webhookMatch({ ...found, url: 'https://elsewhere.test/x' }, want)).toBe(false);
    expect(webhookMatch({ ...found, webhookByEvents: true }, want)).toBe(false);
    expect(webhookMatch({ ...found, webhookBase64: true }, want)).toBe(false);
  });

  it('the webhook body pins byEvents and base64 off and carries the server URL', () => {
    const body = webhookBody(plain, { url: 'http://ayat-lb:8080/webhooks/evolution/x', token: 'fake' });
    expect(body).toEqual({
      webhook: {
        enabled: true, url: 'http://ayat-lb:8080/webhooks/evolution/x',
        headers: { 'x-evolution-token': 'fake' }, byEvents: false, base64: false,
        events: [...plain.webhook.events],
      },
    });
  });
});
