import { describe, expect, it } from 'vitest';
import { changeOf, editBody, moveDays, startsAtOf, timeOptions15, timesFor, willNotify } from './edit-time';

// Cairo is UTC+3 until 29 Oct 2026, so Cairo and Riyadh clocks agree in these tests.
const TZ = 'Africa/Cairo';
const NOW = new Date('2026-10-03T09:00:00.000Z'); // Sat 12:00 Cairo
const MON = { date: '2026-10-05', time: '18:00', durationMin: 60, tz: TZ };

describe('timeOptions15', () => {
  it('is every 15 minutes of the day and keeps an off-grid current value', () => {
    const all = timeOptions15();
    expect(all).toHaveLength(96);
    expect([all[0], all[1], all.at(-1)]).toEqual(['00:00', '00:15', '23:45']);
    expect(timeOptions15('16:10')).toContain('16:10');
    expect(timeOptions15('16:15')).toHaveLength(96);
  });
});

describe('moveDays', () => {
  it('is today and the next six days on the teacher calendar', () => {
    const days = moveDays(new Date('2026-10-03T22:30:00.000Z'), TZ); // already Sun 01:30 in Cairo
    expect(days).toHaveLength(7);
    expect([days[0], days[6]]).toEqual(['2026-10-04', '2026-10-10']);
  });
});

describe('startsAtOf / changeOf', () => {
  it('turns the teacher wall clock into the UTC instant', () => {
    expect(startsAtOf(MON)).toBe('2026-10-05T15:00:00.000Z');
  });

  it('compares instants and minutes, not clock text', () => {
    const old = { startsAt: '2026-10-05T15:00:00Z', durationMin: 45 };
    expect(changeOf(old, MON)).toEqual({ start: false, duration: true });
    expect(changeOf(old, { ...MON, time: '18:15', durationMin: 45 })).toEqual({ start: true, duration: false });
    expect(changeOf({ ...old, durationMin: 60 }, MON)).toEqual({ start: false, duration: false });
  });
});

describe('timesFor', () => {
  it('move: only later than now, plus the select value', () => {
    const today = { ...MON, date: '2026-10-03' };
    const list = timesFor('move', today, { now: NOW });
    expect(list).toContain('12:15');
    expect(list).not.toContain('12:00');
    expect(list).not.toContain('00:00');
    expect(list).toContain('18:00');
    expect(timesFor('move', MON, { now: NOW })).toHaveLength(96);
  });

  it('correct: the lesson must have ended by now (start + length ≤ now)', () => {
    const sat = { date: '2026-10-03', time: '10:00', durationMin: 60, tz: TZ };
    const list = timesFor('correct', sat, { now: NOW });
    expect(list).toContain('11:00');
    expect(list).not.toContain('11:15');
    expect(timesFor('correct', { ...sat, durationMin: 90 }, { now: NOW })).not.toContain('11:00');
  });

  it('correct: a start that is a day away for any student is not offered', () => {
    const late = { date: '2026-10-03', time: '20:00', durationMin: 30, tz: TZ };
    const rule = { now: new Date('2026-10-03T21:00:00.000Z'), sameDay: [{ tz: 'Asia/Dubai', date: '2026-10-03' }] };
    const list = timesFor('correct', late, rule);
    expect(list).toContain('22:45'); // 23:45 in Dubai, same day
    expect(list).not.toContain('23:00'); // 00:00 in Dubai, next day
    expect(timesFor('correct', late, { now: rule.now })).toContain('23:00');
  });

  it('keeps an off-grid value that is invalid now (the API explains the refusal)', () => {
    expect(timesFor('correct', { ...MON, date: '2026-10-03', time: '13:10' }, { now: NOW })).toContain('13:10');
  });
});

describe('willNotify', () => {
  const at = { ...MON, now: NOW };
  it('only a move to a later start in the future', () => {
    expect(willNotify('move', { start: true, duration: false }, at)).toBe(true);
    expect(willNotify('move', { start: false, duration: true }, at)).toBe(false);
    expect(willNotify('correct', { start: true, duration: true }, at)).toBe(false);
    expect(willNotify('move', { start: true, duration: false }, { ...at, now: new Date('2026-10-06T00:00:00Z') })).toBe(false);
  });
});

describe('editBody', () => {
  const base = { mode: 'move' as const, expectedStartsAt: '2026-10-04T14:00:00.000Z', choice: MON, reason: '  ', notify: true };

  it('move: the instant, the length and notify; a blank reason is left out', () => {
    expect(editBody(base)).toEqual({
      expectedStartsAt: '2026-10-04T14:00:00.000Z',
      startsAt: '2026-10-05T15:00:00.000Z',
      durationMin: 60,
      notify: true,
    });
    expect(editBody({ ...base, notify: false })).toMatchObject({ notify: false });
  });

  it('correct: trimmed reason, no notify; override carries its own reason', () => {
    const body = editBody({ ...base, mode: 'correct', reason: ' الحلقة خدت ساعة ', override: 'طلب ولي الأمر' });
    expect(body).toEqual({
      expectedStartsAt: '2026-10-04T14:00:00.000Z',
      startsAt: '2026-10-05T15:00:00.000Z',
      durationMin: 60,
      reason: 'الحلقة خدت ساعة',
      override: { reason: 'طلب ولي الأمر' },
    });
    expect(body).not.toHaveProperty('notify');
  });
});
