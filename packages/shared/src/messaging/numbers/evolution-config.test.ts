import { describe, expect, it } from 'vitest';
import {
  EVOLUTION_DEFAULT_EVENTS, EVOLUTION_HOOK_INTERNAL, evolutionConfigOf, evolutionConfigSchema,
  evolutionHookUrl,
} from './evolution-config.js';
import { evolutionSynced, evolutionSyncFailed, evolutionSyncOf } from './evolution-sync.js';

// Owner 2026-11-06: every Evolution option of a number, validated with zod, safe by default.

describe('evolutionConfigSchema', () => {
  it('defaults: groups ignored, no full sync, no auto read, 3 s gap, 60 a day, 3 errors', () => {
    const c = evolutionConfigSchema.parse({});
    expect(c.behaviour).toEqual({
      reject_call: false, msg_call: '', groups_ignore: true, always_online: false,
      read_messages: false, read_status: false, sync_full_history: false,
    });
    expect(c.limits).toEqual({ gap_ms: 3_000, daily_cap: 60, error_trip: 3 });
    const events = [...EVOLUTION_DEFAULT_EVENTS];
    expect(c.webhook).toEqual({ enabled: true, origin: 'internal', events });
    expect(c.proxy.enabled).toBe(false);
  });

  it('the webhook URL is never typed: an origin of ours, a stored URL is dropped', () => {
    const parsed = evolutionConfigSchema.parse({
      webhook: { url: 'https://evil.example.test/steal', by_events: true, base64: true },
    });
    expect(parsed.webhook).toEqual({ enabled: true, origin: 'internal', events: [...EVOLUTION_DEFAULT_EVENTS] });
    expect(evolutionConfigSchema.safeParse({ webhook: { origin: 'https://evil.test' } }).success).toBe(false);
    expect(evolutionHookUrl(EVOLUTION_HOOK_INTERNAL, 'sec 1'))
      .toBe('http://ayat-lb:8080/webhooks/evolution/sec%201');
    expect(evolutionHookUrl(null, 'sec-1')).toBeNull();
  });

  it('the typing delay is capped at 2 s (it holds the sender loop)', () => {
    expect(evolutionConfigSchema.safeParse({ sending: { delay_ms: 2_000 } }).success).toBe(true);
    expect(evolutionConfigSchema.safeParse({ sending: { delay_ms: 2_001 } }).success).toBe(false);
    expect(evolutionConfigSchema.safeParse({ limits: { error_trip: 0 } }).success).toBe(false);
  });

  it('a proxy on needs host and port; limits and events are bounded', () => {
    expect(evolutionConfigSchema.safeParse({ proxy: { enabled: true } }).success).toBe(false);
    expect(evolutionConfigSchema.safeParse({ proxy: { enabled: true, host: 'p.example.test', port: 3128 } }).success).toBe(true);
    expect(evolutionConfigSchema.safeParse({ proxy: { host: 'a b' } }).success).toBe(false);
    expect(evolutionConfigSchema.safeParse({ limits: { daily_cap: 0 } }).success).toBe(false);
    expect(evolutionConfigSchema.safeParse({ limits: { gap_ms: 60_001 } }).success).toBe(false);
    expect(evolutionConfigSchema.safeParse({ webhook: { events: ['NOPE'] } }).success).toBe(false);
  });

  it('a stored value that no longer reads falls back to the defaults', () => {
    expect(evolutionConfigOf({ limits: { gap_ms: 'x' } })).toEqual(evolutionConfigSchema.parse({}));
    expect(evolutionConfigOf(null).limits.daily_cap).toBe(60);
    expect(evolutionSyncOf({ synced: 'yes' })).toBeNull();
  });

  it('only every part synced is «متزامن»: skipped, disabled and failed are not', () => {
    const all = { instance: 'synced', settings: 'synced', webhook: 'synced', proxy: 'synced' } as const;
    expect(evolutionSynced(all)).toBe(true);
    expect(evolutionSynced({ ...all, webhook: 'skipped' })).toBe(false);
    expect(evolutionSynced({ ...all, webhook: 'disabled' })).toBe(false);
    const failed = evolutionSyncFailed(new Date('2026-11-06T10:00:00Z'));
    expect(failed).toMatchObject({ synced: false, parts: { instance: 'failed', webhook: 'failed' } });
  });
});
