import { describe, expect, it } from 'vitest';
import {
  EVOLUTION_DEFAULT_EVENTS, evolutionConfigOf, evolutionConfigSchema, evolutionSyncOf,
} from './evolution-config.js';

// Owner 2026-11-06: every Evolution option of a number, validated with zod, safe by default.

describe('evolutionConfigSchema', () => {
  it('defaults: groups ignored, no full sync, no auto read, not always online, 3 s gap, 60 a day', () => {
    const c = evolutionConfigSchema.parse({});
    expect(c.behaviour).toEqual({
      reject_call: false, msg_call: '', groups_ignore: true, always_online: false,
      read_messages: false, read_status: false, sync_full_history: false,
    });
    expect(c.limits).toEqual({ gap_ms: 3_000, daily_cap: 60 });
    expect(c.webhook).toMatchObject({ enabled: false, url: null, events: [...EVOLUTION_DEFAULT_EVENTS] });
    expect(c.proxy.enabled).toBe(false);
  });

  it('a webhook needs a URL: https, or http to localhost or a docker service name', () => {
    const hook = (url: string | null) => evolutionConfigSchema.safeParse({ webhook: { url } }).success;
    expect(hook(null)).toBe(false);
    expect(hook('https://api.example.test/webhooks/evolution/x')).toBe(true);
    expect(hook('http://api:3000/webhooks/evolution/x')).toBe(true);
    expect(hook('http://10.0.0.5/webhooks/evolution/x')).toBe(false);
    expect(hook('http://evil.example.test/x')).toBe(false);
  });

  it('a proxy on needs host and port; limits and events are bounded', () => {
    expect(evolutionConfigSchema.safeParse({ proxy: { enabled: true } }).success).toBe(false);
    expect(evolutionConfigSchema.safeParse({ proxy: { enabled: true, host: 'p.example.test', port: 3128 } }).success).toBe(true);
    expect(evolutionConfigSchema.safeParse({ proxy: { host: 'a b' } }).success).toBe(false);
    expect(evolutionConfigSchema.safeParse({ limits: { daily_cap: 0 } }).success).toBe(false);
    expect(evolutionConfigSchema.safeParse({ limits: { gap_ms: 60_001 } }).success).toBe(false);
    expect(evolutionConfigSchema.safeParse({ webhook: { url: 'https://a.test/x', events: ['NOPE'] } }).success).toBe(false);
  });

  it('a stored value that no longer reads falls back to the defaults', () => {
    expect(evolutionConfigOf({ limits: { gap_ms: 'x' } })).toEqual(evolutionConfigSchema.parse({}));
    expect(evolutionConfigOf(null).limits.daily_cap).toBe(60);
    expect(evolutionSyncOf({ synced: 'yes' })).toBeNull();
  });
});
