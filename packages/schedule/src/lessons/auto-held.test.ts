import { describe, expect, it } from 'vitest';
import { LESSON_STATUSES } from '@ab/catalog';
import { autoHeldWindow, isAutoHeldDue, needsConfirmation } from './auto-held.js';

const NOW = new Date('2026-11-02T12:00:00Z');
const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60_000).toISOString();
const lesson = (over: Partial<Parameters<typeof isAutoHeldDue>[0]> = {}) => ({
  status: 'scheduled' as const,
  ends_at: minutesAgo(31),
  packageStarts: [],
  ...over,
});

describe('autoHeldWindow', () => {
  it('reads ends from 14 days back up to 30 minutes ago', () => {
    expect(autoHeldWindow(NOW)).toEqual({
      from: new Date('2026-10-19T12:00:00Z'),
      until: new Date('2026-11-02T11:30:00Z'),
    });
  });
});

describe('isAutoHeldDue', () => {
  it('a scheduled or confirmed lesson ended over 30 min ago is held', () => {
    expect(isAutoHeldDue(lesson(), NOW)).toBe(true);
    expect(isAutoHeldDue(lesson({ status: 'confirmed' }), NOW)).toBe(true);
  });

  it('never touches any other status (cancelled, excused, reported outcomes)', () => {
    const others = LESSON_STATUSES.filter((s) => s !== 'scheduled' && s !== 'confirmed');
    for (const status of others) expect(isAutoHeldDue(lesson({ status }), NOW)).toBe(false);
  });

  it('waits for the 30-minute grace after the end', () => {
    expect(isAutoHeldDue(lesson({ ends_at: minutesAgo(29) }), NOW)).toBe(false);
    expect(isAutoHeldDue(lesson({ ends_at: minutesAgo(30) }), NOW)).toBe(true);
  });

  it('never rewrites a lesson that ended more than 14 days ago', () => {
    expect(isAutoHeldDue(lesson({ ends_at: minutesAgo(14 * 24 * 60) }), NOW)).toBe(true);
    expect(isAutoHeldDue(lesson({ ends_at: minutesAgo(14 * 24 * 60 + 1) }), NOW)).toBe(false);
  });

  it('only lessons that end after the start of every student’s current package', () => {
    const starts = (iso: string | null) => ({
      packageStarts: [iso === null ? null : new Date(iso)],
    });
    expect(isAutoHeldDue(lesson(starts('2026-11-01T00:00:00Z')), NOW)).toBe(true);
    expect(isAutoHeldDue(lesson(starts('2026-11-02T12:00:00Z')), NOW)).toBe(false);
    expect(isAutoHeldDue(lesson(starts(null)), NOW)).toBe(true);
  });
});

describe('needsConfirmation', () => {
  it('only a scheduled lesson, and only while the academy requires a confirmation', () => {
    expect(needsConfirmation('scheduled', true)).toBe(true);
    expect(needsConfirmation('scheduled', false)).toBe(false);
    expect(needsConfirmation('confirmed', true)).toBe(false);
  });
});
