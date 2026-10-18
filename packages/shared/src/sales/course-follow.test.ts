import { describe, expect, it } from 'vitest';
import { continueFrom, prefillPicks } from './course-follow.js';

const sunday = { weekday: 0, startTimeLocal: '17:00' };
const days = [
  sunday,
  { weekday: 2, startTimeLocal: '19:30' },
];

describe('continueFrom', () => {
  it('the day after the previous course when the new subscription starts earlier', () => {
    expect(continueFrom({ endsOn: '2026-11-15' }, '2026-11-01')).toBe('2026-11-16');
  });
  it('the new subscription start when it is later', () => {
    expect(continueFrom({ endsOn: '2026-11-15' }, '2026-11-20')).toBe('2026-11-20');
  });
});

describe('prefillPicks', () => {
  const now = '2026-10-18T06:00:00.000Z';
  it('each weekday on its first date from `from`, at its own time in the zone', () => {
    // 2026-11-16 is a Monday: Tuesday 17th, then Sunday 22nd.
    expect(prefillPicks({ days, from: '2026-11-16', tz: 'Asia/Riyadh', now })).toEqual([
      '2026-11-17T16:30:00.000Z',
      '2026-11-22T14:00:00.000Z',
    ]);
  });
  it('a pick on `from` itself is kept when still ahead', () => {
    expect(prefillPicks({ days, from: '2026-11-22', tz: 'Asia/Riyadh', now })[0]).toBe('2026-11-22T14:00:00.000Z');
  });
  it('a pick that already passed today moves on a week', () => {
    // Sunday 2026-10-18, 17:00 Riyadh is 14:00Z: passed at 15:00Z.
    const picks = prefillPicks({ days: [sunday], from: '2026-10-18', tz: 'Asia/Riyadh', now: '2026-10-18T15:00:00.000Z' });
    expect(picks).toEqual(['2026-10-25T14:00:00.000Z']);
  });
  it('follows the zone across DST (Cairo after its fall-back)', () => {
    expect(prefillPicks({ days: [sunday], from: '2026-11-01', tz: 'Africa/Cairo', now })).toEqual(['2026-11-01T15:00:00.000Z']);
  });
  it('no days → no picks', () => {
    expect(prefillPicks({ days: [], from: '2026-11-01', tz: 'Asia/Riyadh', now })).toEqual([]);
  });
});
