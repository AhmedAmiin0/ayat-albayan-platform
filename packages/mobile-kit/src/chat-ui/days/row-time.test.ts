import { chatDayLabel, chatRowTime } from './day-label';

// The clock today, else the day's words.

const now = new Date('2026-11-17T12:00:00Z');
const clock = { now, tz: 'UTC', cycle: '24' as const };

describe('chatRowTime', () => {
  it('today: the clock only', () => {
    expect(chatRowTime('2026-11-17T09:05:00Z', clock)).toMatch(/09:05|٠٩:٠٥/);
  });

  it('another day: the day chip words', () => {
    const iso = '2026-11-16T09:05:00Z';
    expect(chatRowTime(iso, clock)).toBe(chatDayLabel(iso, clock));
  });

  it('no time or an invalid one: empty', () => {
    expect(chatRowTime(null, clock)).toBe('');
    expect(chatRowTime('not a time', clock)).toBe('');
  });
});
