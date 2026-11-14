import { COURSE_PAUSE_REASON } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { lesson } from './alerts-fixture.js';
import { lessonChange } from './lesson-changes.js';

describe('lessonChange', () => {
  it('null for an ordinary open lesson', () => {
    const l = lesson({ id: 'a' });
    expect(lessonChange(l, [l])).toBeNull();
  });

  it('her own cancel keeps her reason', () => {
    const l = lesson({ id: 'a', status: 'cancelled_by_teacher', cancel_reason: 'سفر' });
    expect(lessonChange(l, [l])).toEqual({ who: 'teacher', reason: 'سفر', from: null, to: null });
  });

  it('an admin cancel hides its text (a series end can mention money) unless it is a pause', () => {
    const end = lesson({ id: 'a', status: 'cancelled_by_admin', cancel_reason: 'انتهى الاشتراك 50$' });
    expect(lessonChange(end, [end])?.reason).toBeNull();
    const pause = lesson({ id: 'b', status: 'cancelled_by_admin', cancel_reason: COURSE_PAUSE_REASON });
    expect(lessonChange(pause, [pause])).toMatchObject({ who: 'admin', reason: COURSE_PAUSE_REASON });
  });

  it('a lesson moved away names the new start and its reason', () => {
    const old = lesson({ id: 'a', status: 'rescheduled', cancel_reason: 'طلب الأسرة' });
    const neu = lesson({ id: 'b', starts_at: '2026-11-15T13:00:00Z', rescheduled_from_id: 'a' });
    expect(lessonChange(old, [old, neu])).toEqual({
      who: 'moved',
      reason: 'طلب الأسرة',
      from: null,
      to: '2026-11-15T13:00:00Z',
    });
    expect(lessonChange(old, [old])?.to).toBeNull();
  });

  it('a lesson moved in names the old start and the old reason', () => {
    const old = lesson({ id: 'a', starts_at: '2026-11-13T13:00:00Z', status: 'rescheduled', cancel_reason: 'سفر' });
    const neu = lesson({ id: 'b', rescheduled_from_id: 'a' });
    expect(lessonChange(neu, [old, neu])).toEqual({
      who: 'moved',
      reason: 'سفر',
      from: '2026-11-13T13:00:00Z',
      to: null,
    });
  });

  it('a replacement whose old lesson is out of the window, without a time edit, says nothing', () => {
    const neu = lesson({ id: 'b', rescheduled_from_id: 'gone' });
    expect(lessonChange(neu, [neu])).toBeNull();
  });

  it('a time edit names the replaced start with no reason (the admin keeps it)', () => {
    const was = { starts_at: '2026-11-14T11:00:00Z', ends_at: '2026-11-14T12:00:00Z' };
    const l = lesson({ id: 'a', time_edit: { at: '2026-11-13T00:00:00Z', reason: null, was } });
    expect(lessonChange(l, [l])).toEqual({ who: 'moved', reason: null, from: was.starts_at, to: null });
  });
});
