import { COURSE_PAUSE_REASON } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { lesson, NOW } from './alerts-fixture.js';
import { lessonChange } from './lesson-changes.js';

describe('lessonChange', () => {
  it('null for an ordinary open lesson', () => {
    const l = lesson({ id: 'a' });
    expect(lessonChange(l, { lessons: [l], now: NOW })).toBeNull();
  });

  it('her own cancel keeps her reason', () => {
    const l = lesson({ id: 'a', status: 'cancelled_by_teacher', cancel_reason: 'سفر' });
    expect(lessonChange(l, { lessons: [l], now: NOW })).toEqual({ who: 'teacher', reason: 'سفر', from: null, to: null });
  });

  it('an admin cancel hides its text (a series end can mention money) unless it is a pause', () => {
    const end = lesson({ id: 'a', status: 'cancelled_by_admin', cancel_reason: 'انتهى الاشتراك 50$' });
    expect(lessonChange(end, { lessons: [end], now: NOW })?.reason).toBeNull();
    const pause = lesson({ id: 'b', status: 'cancelled_by_admin', cancel_reason: COURSE_PAUSE_REASON });
    expect(lessonChange(pause, { lessons: [pause], now: NOW })).toMatchObject({ who: 'admin', reason: COURSE_PAUSE_REASON });
  });

  it('a lesson moved away names the new start and its reason', () => {
    const old = lesson({ id: 'a', status: 'rescheduled', cancel_reason: 'طلب الأسرة' });
    const neu = lesson({ id: 'b', starts_at: '2026-11-15T13:00:00Z', rescheduled_from_id: 'a' });
    expect(lessonChange(old, { lessons: [old, neu], now: NOW })).toEqual({
      who: 'moved',
      reason: 'طلب الأسرة',
      from: null,
      to: '2026-11-15T13:00:00Z',
    });
    expect(lessonChange(old, { lessons: [old], now: NOW })?.to).toBeNull();
  });

  it('a lesson moved in names the old start and the old reason', () => {
    const old = lesson({ id: 'a', starts_at: '2026-11-13T13:00:00Z', status: 'rescheduled', cancel_reason: 'سفر' });
    const neu = lesson({ id: 'b', rescheduled_from_id: 'a' });
    expect(lessonChange(neu, { lessons: [old, neu], now: NOW })).toEqual({
      who: 'moved',
      reason: 'سفر',
      from: '2026-11-13T13:00:00Z',
      to: null,
    });
  });

  it('a replacement whose old lesson is out of the window, without a time edit, says nothing', () => {
    const neu = lesson({ id: 'b', rescheduled_from_id: 'gone' });
    expect(lessonChange(neu, { lessons: [neu], now: NOW })).toBeNull();
  });

  it('a time edit names the replaced start with no reason (the admin keeps it)', () => {
    const was = { starts_at: '2026-11-14T11:00:00Z', ends_at: '2026-11-14T12:00:00Z' };
    const l = lesson({ id: 'a', time_edit: { at: '2026-11-13T00:00:00Z', reason: null, was } });
    expect(lessonChange(l, { lessons: [l], now: NOW })).toEqual({ who: 'moved', reason: null, from: was.starts_at, to: null });
    const old = lesson({ id: 'b', time_edit: { at: '2026-10-01T00:00:00Z', reason: null, was } });
    expect(lessonChange(old, { lessons: [old], now: NOW })).toBeNull();
  });

  it('a held or no-show replacement says nothing more', () => {
    const was = { starts_at: '2026-11-14T11:00:00Z', ends_at: '2026-11-14T12:00:00Z' };
    const l = lesson({ id: 'a', status: 'completed', time_edit: { at: '2026-11-13T00:00:00Z', reason: null, was } });
    expect(lessonChange(l, { lessons: [l], now: NOW })).toBeNull();
  });
});
