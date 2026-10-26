import { lesson, yusuf } from '@/today/testing/fixtures';
import { canSubmit, correctStarts, editBody, willNotify, type EditState } from './edit-time-body';
import { held, NOW, SAT_17, SUN_17, upcoming } from '../testing/fixtures';

const state = (over: Partial<EditState> = {}): EditState => ({ picked: null, durationMin: 45, reason: '', notify: true, ...over });

describe('editBody, move', () => {
  test('a later start: the body names what was seen, the pick and the guardian toggle', () => {
    expect(editBody(upcoming, state({ picked: SAT_17, notify: true }), NOW)).toEqual({
      expectedStartsAt: SUN_17,
      expectedEndsAt: upcoming.ends_at,
      startsAt: SAT_17,
      durationMin: 45,
      notify: true,
    });
    expect(editBody(upcoming, state({ picked: SAT_17, notify: false }), NOW)?.notify).toBe(false);
  });

  test('a new length alone keeps the start and sends no notify (nothing the guardian sees changed)', () => {
    const body = editBody(upcoming, state({ durationMin: 60 }), NOW);
    expect(body).toEqual({ expectedStartsAt: SUN_17, expectedEndsAt: upcoming.ends_at, startsAt: SUN_17, durationMin: 60 });
  });

  test('a trimmed reason goes along, cut at 300 characters', () => {
    expect(editBody(upcoming, state({ picked: SAT_17, reason: '  سفر  ' }), NOW)?.reason).toBe('سفر');
    expect(editBody(upcoming, state({ picked: SAT_17, reason: 'ي'.repeat(400) }), NOW)?.reason).toHaveLength(300);
  });

  test('nothing changed, a start already past, or a lesson that cannot be edited: no body', () => {
    expect(editBody(upcoming, state(), NOW)).toBeNull();
    expect(editBody(upcoming, state({ picked: '2026-10-01T10:00:00.000Z' }), NOW)).toBeNull();
    expect(editBody(lesson({ id: 'plain' }), state({ durationMin: 60 }), NOW)).toBeNull();
    expect(editBody({ ...upcoming, time_edit_mode: null }, state({ durationMin: 60 }), NOW)).toBeNull();
  });
});

test('a length the API does not take (an odd recorded 50 minutes) is never sent', () => {
  const odd = { ...upcoming, ends_at: '2026-10-04T14:50:00.000Z' };
  expect(editBody(odd, state({ picked: SAT_17, durationMin: 50 }), NOW)).toBeNull();
  expect(editBody(odd, state({ picked: SAT_17, durationMin: 45 }), NOW)?.durationMin).toBe(45);
});

describe('editBody, correct', () => {
  const ten15 = '2026-10-01T07:15:00.000Z';

  test('a held lesson needs a reason; the guardian is never part of it', () => {
    expect(canSubmit(held, state({ durationMin: 60 }), NOW)).toBe(false);
    expect(editBody(held, state({ durationMin: 60, reason: 'الحلقة خدت ساعة' }), NOW)).toEqual({
      expectedStartsAt: held.starts_at,
      expectedEndsAt: held.ends_at,
      startsAt: held.starts_at,
      durationMin: 60,
      reason: 'الحلقة خدت ساعة',
    });
  });

  test('a start that would end after now cannot be sent', () => {
    // 10:15Z + 90 min = 11:45Z, before now (13:20Z): fine; 12:00Z + 90 = 13:30Z: not.
    expect(canSubmit(held, state({ picked: ten15, durationMin: 90, reason: 'x' }), NOW)).toBe(true);
    expect(canSubmit(held, state({ picked: '2026-10-01T12:00:00.000Z', durationMin: 90, reason: 'x' }), NOW)).toBe(false);
  });
});

describe('willNotify', () => {
  test('only a move to a later start', () => {
    expect(willNotify(upcoming, state({ picked: SAT_17 }), NOW)).toBe(true);
    expect(willNotify(upcoming, state({ durationMin: 60 }), NOW)).toBe(false);
    expect(willNotify(held, state({ picked: '2026-10-01T07:15:00.000Z' }), NOW)).toBe(false);
  });
});

describe('correctStarts', () => {
  const at = (iso: string, students = [yusuf]) =>
    lesson({ id: 'c', starts_at: iso, ends_at: new Date(Date.parse(iso) + 45 * 60_000).toISOString(), students });
  test('quarter hours around the recorded start, over by now, the recorded start included', () => {
    const starts = correctStarts(held, 45, NOW);
    expect(starts).toContain('2026-10-01T07:00:00.000Z');
    expect(starts).toContain('2026-10-01T07:15:00.000Z');
    expect(starts.every((s) => Date.parse(s) % (15 * 60_000) === 0)).toBe(true);
    expect([...starts].sort()).toEqual(starts);
  });

  test('an off-grid recorded start stays offered', () => {
    const odd = at('2026-10-01T07:07:00.000Z');
    expect(correctStarts(odd, 45, NOW)).toContain('2026-10-01T07:07:00.000Z');
  });

  test('never past the day the lesson was on, in the teacher’s and the student’s zone', () => {
    // 23:30 Riyadh on the 1st: the 2nd starts at 21:00Z.
    const late = at('2026-10-01T20:30:00.000Z');
    const starts = correctStarts(late, 45, new Date('2026-10-02T09:00:00Z'));
    expect(starts.at(-1)).toBe('2026-10-01T20:45:00.000Z');
    // A student in Muscat (UTC+4): their midnight is 20:00Z, so nothing before it either.
    const muscat = at('2026-10-01T20:30:00.000Z', [{ ...yusuf, tz: 'Asia/Muscat' }]);
    const both = correctStarts(muscat, 45, new Date('2026-10-02T09:00:00Z'));
    expect(both[0]).toBe('2026-10-01T20:00:00.000Z');
    expect(both.at(-1)).toBe('2026-10-01T20:45:00.000Z');
  });

  test('a start whose lesson would still be running is left out; none left = empty', () => {
    const now = new Date('2026-10-01T07:50:00Z');
    expect(correctStarts(held, 60, now).at(-1)).toBe('2026-10-01T06:45:00.000Z');
    expect(correctStarts(held, 90, new Date('2026-09-01T00:00:00Z'))).toEqual([]);
  });
});
