import type { SlotView } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { nearestFree, pickState } from './pick-check.js';

const slot = (starts_at: string, busy = false): SlotView => ({
  starts_at,
  ends_at: new Date(Date.parse(starts_at) + 45 * 60_000).toISOString(),
  conflicts: busy ? [{ kind: 'teacher_busy', startsAt: starts_at, endsAt: starts_at, lessonId: 'l1' }] : [],
});
const slots = [
  slot('2026-11-08T14:00:00.000Z'),
  slot('2026-11-08T14:30:00.000Z', true),
  slot('2026-11-08T15:00:00.000Z'),
  slot('2026-11-08T15:30:00.000Z'),
  slot('2026-11-09T14:00:00.000Z'),
];
const now = new Date('2026-11-07T10:00:00.000Z');
const base = { slots, stepMin: 30, durationMin: 45, now };

describe('pickState: what the grid says about a picked time', () => {
  it('a free grid start is free; a blocked one carries its conflicts', () => {
    expect(pickState({ ...base, at: '2026-11-08T14:00:00.000Z' })).toEqual({ kind: 'free' });
    const busy = pickState({ ...base, at: '2026-11-08T14:30:00Z' });
    expect(busy.kind).toBe('busy');
  });

  it('off the step but inside a window: the series check decides', () => {
    expect(pickState({ ...base, at: '2026-11-08T14:10:00.000Z' })).toEqual({ kind: 'unchecked' });
  });

  it('outside every window: an outside_availability conflict for the lesson length', () => {
    expect(pickState({ ...base, at: '2026-11-08T20:00:00.000Z' })).toEqual({
      kind: 'outside',
      conflict: { kind: 'outside_availability', startsAt: '2026-11-08T20:00:00.000Z', endsAt: '2026-11-08T20:45:00.000Z' },
    });
    expect(pickState({ ...base, at: '2026-11-08T15:45:00.000Z' }).kind).toBe('outside');
    expect(pickState({ ...base, slots: [], at: '2026-11-08T15:45:00.000Z' }).kind).toBe('outside');
  });

  it('a time already past', () => {
    expect(pickState({ ...base, at: '2026-11-07T09:00:00.000Z' })).toEqual({ kind: 'past' });
  });
});

describe('nearestFree: optional suggestions from the slot data', () => {
  it('the nearest free starts on the same local day, earliest first, never the busy ones', () => {
    const at = '2026-11-08T14:30:00.000Z';
    expect(nearestFree({ at, slots, tz: 'Africa/Cairo' })).toEqual([
      '2026-11-08T14:00:00.000Z',
      '2026-11-08T15:00:00.000Z',
      '2026-11-08T15:30:00.000Z',
    ]);
    expect(nearestFree({ at, slots, tz: 'Africa/Cairo', limit: 1 })).toHaveLength(1);
  });

  it('another local day gives none', () => {
    expect(nearestFree({ at: '2026-11-10T14:00:00.000Z', slots, tz: 'Africa/Cairo' })).toEqual([]);
  });
});
