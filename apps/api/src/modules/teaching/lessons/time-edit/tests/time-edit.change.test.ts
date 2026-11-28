import type { Conflict } from '@ab/schedule';
import { ConflictException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { admit, overrideOf } from '@/modules/teaching/lessons/time-edit/time-edit.change';
import { body, lessonRow } from '@/modules/teaching/lessons/time-edit/time-edit.fakes';

const ROW = () =>
  lessonRow({ starts_at: '2026-10-04T14:00:00+00:00', ends_at: '2026-10-04T14:45:00+00:00' });

const codeOf = (run: () => unknown): unknown => {
  try {
    run();
  } catch (e) {
    return e instanceof ConflictException ? e.getResponse() : e;
  }
  return null;
};

describe('admit', () => {
  it('a closed status: 409 time_edit_not_allowed', () => {
    const closed = lessonRow({ status: 'cancelled_by_admin' });
    expect(codeOf(() => admit(closed, body()))).toMatchObject({ code: 'time_edit_not_allowed' });
  });

  it('the plan input of a fresh edit', () => {
    const input = admit(ROW(), body());
    expect(input?.request.startsAt.toISOString()).toBe('2026-10-05T14:00:00.000Z');
    expect(input?.current.endsAt.toISOString()).toBe('2026-10-04T14:45:00.000Z');
  });

  it('a replay of the time already held: null', () => {
    expect(admit(ROW(), body({ startsAt: '2026-10-04T14:00:00.000Z' }))).toBeNull();
  });

  it('another expected start, or another expected end: 409 stale_time', () => {
    const otherStart = body({ expectedStartsAt: '2026-10-04T13:00:00.000Z' });
    const otherEnd = body({ expectedEndsAt: '2026-10-04T15:00:00.000Z' });
    expect(codeOf(() => admit(ROW(), otherStart))).toMatchObject({ code: 'stale_time' });
    expect(codeOf(() => admit(ROW(), otherEnd))).toMatchObject({ code: 'stale_time' });
  });

  it('the expected end it saw: admitted', () => {
    const seen = body({ expectedEndsAt: '2026-10-04T14:45:00.000Z' });
    expect(admit(ROW(), seen)).not.toBeNull();
  });
});

describe('overrideOf', () => {
  const clash: Conflict[] = [
    { kind: 'teacher_busy', startsAt: '2026-10-05T14:00:00.000Z', endsAt: '2026-10-05T14:45:00.000Z' },
  ];

  it('no clash: null, even with an override', () => {
    expect(overrideOf([], body({ override: { reason: 'ok' } }))).toBeNull();
  });

  it('a clash with an override: its reason', () => {
    expect(overrideOf(clash, body({ override: { reason: 'ok' } }))).toBe('ok');
  });

  it('a clash without an override: 409', () => {
    expect(codeOf(() => overrideOf(clash, body()))).toMatchObject({ code: 'conflict', conflicts: clash });
  });
});
