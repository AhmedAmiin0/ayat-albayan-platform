import { describe, expect, it } from 'vitest';
import { canJoinNow, joinWindow } from './join-window.js';

const lesson = { starts_at: '2026-10-05T16:00:00.000Z', ends_at: '2026-10-05T17:00:00.000Z' };
const at = (iso: string) => new Date(iso);

describe('joinWindow', () => {
  it('reports its edges: 15 minutes before the start, 2 hours after the end', () => {
    const w = joinWindow(lesson, at('2026-10-05T16:30:00Z'));
    expect(w.opens_at).toBe('2026-10-05T15:45:00.000Z');
    expect(w.closes_at).toBe('2026-10-05T19:00:00.000Z');
  });

  it.each([
    ['2026-10-05T10:00:00Z', 'early'],
    ['2026-10-05T15:44:59Z', 'early'],
    ['2026-10-05T15:45:00Z', 'open'],
    ['2026-10-05T16:30:00Z', 'open'],
    ['2026-10-05T19:00:00Z', 'open'],
    ['2026-10-05T19:00:01Z', 'closed'],
    ['2026-10-06T10:00:00Z', 'closed'],
  ])('at %s the room is %s', (now, state) => {
    expect(joinWindow(lesson, at(now)).state).toBe(state);
  });
});

describe('canJoinNow', () => {
  it('is true only while open', () => {
    expect(canJoinNow(lesson, at('2026-10-05T15:00:00Z'))).toBe(false);
    expect(canJoinNow(lesson, at('2026-10-05T16:00:00Z'))).toBe(true);
    expect(canJoinNow(lesson, at('2026-10-05T20:00:00Z'))).toBe(false);
  });
});
