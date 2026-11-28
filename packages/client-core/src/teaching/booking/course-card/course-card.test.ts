import { courseCardSchema } from '@ab/shared';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../core/http';
import { courseExtendErrorCode, extendOffered, readLessonAt, statusRoute } from './course-card';

const CARD = {
  subscriptionId: 'sub1',
  course: {
    ...{ teacherName: 'فاطمة', days: [{ weekday: 0, startTimeLocal: '18:30' }], tz: 'Asia/Riyadh' },
    ...{ endsOn: '2026-11-24', lastAt: null, lessonsTotal: 12, unbooked: 2 },
  },
  upcoming: [{ id: 'l1', startsAt: '2026-11-17T15:30:00Z', status: 'confirmed' }],
};

describe('«الدورة والباقة» paths and rules (owner 2026-11-17)', () => {
  it('parses the card; «مدّ الجدول» only with lessons left without a date', () => {
    const card = courseCardSchema.parse(CARD);
    expect(extendOffered(card)).toBe(true);
    expect(extendOffered({ ...card, course: { ...CARD.course, unbooked: 0 } })).toBe(false);
    expect(extendOffered(undefined)).toBe(false);
  });

  it('«موقوف مؤقتًا» opens the pause, «متوقف» the stop, the rest are set at once', () => {
    expect([statusRoute('paused'), statusRoute('churned'), statusRoute('active')]).toEqual([
      'pause',
      'stop',
      'set',
    ]);
  });

  it("«مدّ الجدول»'s refusals in words; anything else is generic", () => {
    expect(courseExtendErrorCode(new ApiError(409, { code: 'course_paused' }))).toBe(
      'course_paused',
    );
    expect(courseExtendErrorCode(new ApiError(500, { code: 'boom' }))).toBe('generic');
  });

  it('a card lesson is read over the minute it starts, then picked by id', async () => {
    const fetch = vi.fn(async () => [{ id: 'a' }, { id: 'b' }]);
    expect(await readLessonAt(fetch, { id: 'b', startsAt: '2099-10-04T14:00:00Z' })).toEqual({
      id: 'b',
    });
    expect(fetch).toHaveBeenCalledWith(
      '/lessons?from=2099-10-04T14%3A00%3A00.000Z&to=2099-10-04T14%3A01%3A00.000Z',
    );
    expect(await readLessonAt(fetch, { id: 'c', startsAt: '2099-10-04T14:00:00Z' })).toBeNull();
  });
});
