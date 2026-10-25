import { describe, expect, it } from 'vitest';
import { CONFIG } from '../classroom.fakes';
import { egressOutcome, verifyWebhook } from './livekit-webhook';
import { signedWebhook } from '../moderation/moderation.fakes';

const NOW = new Date('2026-10-05T17:00:00Z');
const nowS = NOW.getTime() / 1000;
const body = Buffer.from(JSON.stringify({ event: 'egress_ended', egressInfo: { egressId: 'EG_1', status: 'EGRESS_COMPLETE' } }));
const signedFor = (b: Buffer, over: object = {}, secret = CONFIG.apiSecret): string => signedWebhook(b, { now: NOW, over, secret });

const check = (authorization: string | undefined, rawBody: Buffer | undefined = body) =>
  verifyWebhook({ rawBody, authorization, config: CONFIG, now: NOW });

describe('verifyWebhook', () => {
  it('accepts LiveKit’s header (bare JWT) and a Bearer one', () => {
    expect(check(signedFor(body))).toBe(true);
    expect(check(`Bearer ${signedFor(body)}`)).toBe(true);
  });

  it('refuses another body (sha256 claim mismatch)', () => {
    expect(check(signedFor(body), Buffer.from(`${body.toString()} `))).toBe(false);
  });

  it('refuses another secret, another key, or a broken token', () => {
    expect(check(signedFor(body, {}, 'another-secret'))).toBe(false);
    expect(check(signedFor(body, { iss: 'other' }))).toBe(false);
    expect(check('a.b.c')).toBe(false);
    expect(check('nonsense')).toBe(false);
  });

  it('refuses an expired token and one without the sha256 claim', () => {
    expect(check(signedFor(body, { exp: nowS - 3600 }))).toBe(false);
    expect(check(signedFor(body, { sha256: undefined }))).toBe(false);
  });

  it('refuses a missing header or body', () => {
    expect(check(undefined)).toBe(false);
    expect(verifyWebhook({ rawBody: undefined, authorization: signedFor(body), config: CONFIG, now: NOW })).toBe(false);
  });
});

const ended = (info: object, event = 'egress_ended') => egressOutcome({ event, egressInfo: info }, NOW);

describe('egressOutcome', () => {
  it('complete (or limit reached) = done, with LiveKit’s end time (ns)', () => {
    expect(ended({ egressId: 'EG_1', status: 'EGRESS_COMPLETE', endedAt: '1791219600000000000', roomName: 'lesson-1' })).toEqual({
      egressId: 'EG_1',
      status: 'done',
      endedAt: '2026-10-05T17:00:00.000Z',
      error: null,
      room: 'lesson-1',
    });
    expect(ended({ egressId: 'EG_1', status: 'EGRESS_LIMIT_REACHED' })?.status).toBe('done');
  });

  it('failed or aborted = failed, with the error', () => {
    expect(ended({ egressId: 'EG_1', status: 'EGRESS_FAILED', error: 'upload failed' })).toMatchObject({ status: 'failed', error: 'upload failed' });
    expect(ended({ egressId: 'EG_1', status: 'EGRESS_ABORTED' })).toMatchObject({ status: 'failed', error: 'EGRESS_ABORTED' });
  });

  it('reads an egress_updated with a terminal status, and snake_case fields', () => {
    expect(egressOutcome({ event: 'egress_updated', egress_info: { egress_id: 'EG_2', status: 3 } }, NOW)).toMatchObject({ egressId: 'EG_2', status: 'done' });
  });

  it('ignores running statuses, other events and garbage', () => {
    expect(ended({ egressId: 'EG_1', status: 'EGRESS_ACTIVE' }, 'egress_updated')).toBeNull();
    expect(egressOutcome({ event: 'participant_joined' }, NOW)).toBeNull();
    expect(ended({ status: 'EGRESS_COMPLETE' })).toBeNull();
    expect(egressOutcome(null, NOW)).toBeNull();
    expect(egressOutcome({ event: 'egress_ended' }, NOW)).toBeNull();
  });

  it('no end time: now', () => {
    expect(ended({ egressId: 'EG_1', status: 'EGRESS_COMPLETE', endedAt: '0' })?.endedAt).toBe(NOW.toISOString());
  });
});
