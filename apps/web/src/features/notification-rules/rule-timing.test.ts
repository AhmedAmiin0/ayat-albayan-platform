import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n';
import { boundedInt, parseTiming, sameTiming, timingDraft } from './rule-timing';

const e = t.notificationRules.errors;
const follow = (hours: string[], from = '12', to = '7') => parseTiming({ kind: 'follow_up_slots', hours, from, to });

describe('timing bounds (RULE_TIMING_SCHEMAS, in words)', () => {
  it('lead time: whole minutes 5–720, typed on any keypad', () => {
    expect(parseTiming({ kind: 'lesson_reminder', minutes: '5' })).toEqual({ ok: true, value: { minutes_before: 5 } });
    expect(parseTiming({ kind: 'lesson_reminder', minutes: '720' })).toEqual({ ok: true, value: { minutes_before: 720 } });
    expect(parseTiming({ kind: 'lesson_reminder', minutes: '٤٥' })).toEqual({ ok: true, value: { minutes_before: 45 } });
    for (const bad of ['4', '721', '', '60.5', '-10', 'abc']) {
      expect(parseTiming({ kind: 'lesson_reminder', minutes: bad })).toEqual({ ok: false, error: e.minutes });
    }
  });

  it('teacher lead time: null when «مثل تذكير الأسرة», else the same bounds', () => {
    expect(parseTiming({ kind: 'teacher_lesson_reminder', minutes: '1', same: true })).toEqual({ ok: true, value: { minutes_before: null } });
    expect(parseTiming({ kind: 'teacher_lesson_reminder', minutes: '30', same: false })).toEqual({ ok: true, value: { minutes_before: 30 } });
    expect(parseTiming({ kind: 'teacher_lesson_reminder', minutes: '1', same: false })).toEqual({ ok: false, error: e.minutes });
  });

  it('day before: one of DAY_BEFORE_HOURS, anything else is the lesson’s own time (null)', () => {
    expect(parseTiming({ kind: 'lesson_reminder_24h', at: '20:00' })).toEqual({ ok: true, value: { send_at_local: '20:00' } });
    expect(parseTiming({ kind: 'lesson_reminder_24h', at: '' })).toEqual({ ok: true, value: { send_at_local: null } });
    expect(parseTiming({ kind: 'lesson_reminder_24h', at: '20:30' })).toEqual({ ok: true, value: { send_at_local: null } });
  });

  it('follow-ups: 1–5 hours of 1–720, strictly ascending; window 1–168 h and 1–30 days', () => {
    expect(follow(['24', '72'])).toEqual({ ok: true, value: { hours: [24, 72], slots_from_hours: 12, slots_to_days: 7 } });
    expect(follow(['1', '2', '3', '4', '720'])).toMatchObject({ ok: true });
    expect(follow(['1', '2', '3', '4', '5', '6'])).toEqual({ ok: false, error: e.hours });
    expect(follow([])).toEqual({ ok: false, error: e.hours });
    expect(follow(['0'])).toEqual({ ok: false, error: e.hours });
    expect(follow(['721'])).toEqual({ ok: false, error: e.hours });
    expect(follow(['72', '24'])).toEqual({ ok: false, error: e.ascending });
    expect(follow(['24', '24'])).toEqual({ ok: false, error: e.ascending });
    expect(follow(['24'], '0')).toEqual({ ok: false, error: e.slotsFrom });
    expect(follow(['24'], '169')).toEqual({ ok: false, error: e.slotsFrom });
    expect(follow(['24'], '168', '31')).toEqual({ ok: false, error: e.slotsTo });
    expect(follow(['24'], '1', '0')).toEqual({ ok: false, error: e.slotsTo });
  });
});

describe('timing drafts', () => {
  it('from a stored timing, and the defaults when it is null', () => {
    expect(timingDraft('lesson_reminder', { minutes_before: 45 })).toEqual({ kind: 'lesson_reminder', minutes: '45' });
    expect(timingDraft('lesson_reminder', null)).toEqual({ kind: 'lesson_reminder', minutes: '60' });
    expect(timingDraft('teacher_lesson_reminder', { minutes_before: null })).toEqual({ kind: 'teacher_lesson_reminder', minutes: '60', same: true });
    expect(timingDraft('lesson_reminder_24h', { send_at_local: '18:00' })).toEqual({ kind: 'lesson_reminder_24h', at: '18:00' });
    expect(timingDraft('follow_up_slots', null)).toEqual({ kind: 'follow_up_slots', hours: ['24', '72'], from: '12', to: '7' });
  });

  it('a draft parses back to the timing it came from', () => {
    const stored = { hours: [12, 48, 96], slots_from_hours: 6, slots_to_days: 14 };
    const back = parseTiming(timingDraft('follow_up_slots', stored));
    expect(back.ok && sameTiming(back.value, stored)).toBe(true);
  });

  it('sameTiming ignores key order; boundedInt refuses fractions and signs', () => {
    expect(sameTiming({ a: 1, b: [1, 2] }, { b: [1, 2], a: 1 })).toBe(true);
    expect(sameTiming({ a: 1 }, { a: 2 })).toBe(false);
    expect(sameTiming(null, undefined)).toBe(true);
    expect(boundedInt(' 7 ', { min: 1, max: 10 })).toBe(7);
    expect(boundedInt('+7', { min: 1, max: 10 })).toBeNull();
  });
});
