import { describe, expect, it } from 'vitest';
import { EVENT_KINDS, parseDomainEvent } from './events.schemas';

const ID = '7d3f6a52-8f4e-4c55-9f0e-5a2b1c3d4e5f';
const PROBE = '0b6c1d2e-3f40-4a51-8b62-7c8d9e0f1a2b';
const AT = '2026-11-23T08:00:00.000+00:00';

const row = (over: Record<string, unknown> = {}) => ({
  id: ID,
  kind: 'events.probe',
  payload: { probe_id: PROBE },
  occurred_at: AT,
  attempts: 0,
  ...over,
});

describe('parseDomainEvent', () => {
  it('reads an outbox row as a typed event (extra columns dropped)', () => {
    expect(parseDomainEvent(row())).toEqual({
      ok: true,
      event: { id: ID, kind: 'events.probe', payload: { probe_id: PROBE }, occurred_at: AT },
    });
  });

  it.each([
    ['an unknown kind', row({ kind: 'lesson.nope' })],
    ['a payload of the wrong shape', row({ payload: { probe_id: 'not-a-uuid' } })],
    ['a payload with personal data beside the ids', row({ payload: { probe_id: PROBE, name: 'x' } })],
    ['an id that is not a uuid', row({ id: '42' })],
    ['an instant without an offset', row({ occurred_at: '2026-11-23T08:00:00' })],
    ['not an object', 'events.probe'],
  ])('refuses %s with a reason', (_label, raw) => {
    const parsed = parseDomainEvent(raw);
    expect(parsed.ok).toBe(false);
    expect(parsed.ok ? '' : parsed.reason).not.toBe('');
  });

  it('caps the reason at 500 characters (the last_error column)', () => {
    const parsed = parseDomainEvent(row({ kind: 'x'.repeat(2_000), payload: 'y'.repeat(2_000) }));
    expect(parsed.ok ? '' : parsed.reason.length).toBeLessThanOrEqual(500);
  });
});

describe('EVENT_KINDS', () => {
  it('lists every catalogued kind once', () => {
    expect(EVENT_KINDS).toEqual(['events.probe']);
  });
});
