import { describe, expect, it } from 'vitest';
import { ApiError } from '../../../core/http/index.js';
import {
  courseCardPath,
  courseExtendErrorCode,
  courseExtendPreviewPath,
  courseResumePreviewPath,
  extendOffered,
  parseCourseCard,
  statusRoute,
} from './course-card.js';

const CARD = {
  subscriptionId: 'sub1',
  course: {
    ...{ teacherName: 'فاطمة', days: [{ weekday: 0, startTimeLocal: '18:30' }], tz: 'Asia/Riyadh' },
    ...{ endsOn: '2026-11-24', lastAt: null, lessonsTotal: 12, unbooked: 2 },
  },
  upcoming: [{ id: 'l1', startsAt: '2026-11-17T15:30:00Z', status: 'confirmed' }],
};

describe('«الدورة والباقة» paths and rules (owner 2026-11-17)', () => {
  it('the admin and the assistant read the card on their own routes', () => {
    expect(courseCardPath({ studentId: 's1', tree: 'admin' })).toBe('/students/s1/course-card');
    expect(courseCardPath({ studentId: 's1', tree: 'sales' })).toBe('/sales/students/s1/course-card');
    expect(courseExtendPreviewPath({ studentId: 's1', subscriptionId: 'a b' })).toBe(
      '/students/s1/course-extend?subscriptionId=a%20b',
    );
    expect(courseResumePreviewPath('s1')).toBe('/students/s1/course-pause/resume-preview');
  });

  it('parses the card; «مدّ الجدول» only with lessons left without a date', () => {
    const card = parseCourseCard(CARD);
    expect(extendOffered(card)).toBe(true);
    expect(extendOffered({ ...card, course: { ...CARD.course, unbooked: 0 } })).toBe(false);
    expect(extendOffered(undefined)).toBe(false);
    expect(() => parseCourseCard({ ...CARD, upcoming: [{ id: 1 }] })).toThrow();
  });

  it('«موقوف مؤقتًا» opens the pause, «متوقف» the stop, the rest are set at once', () => {
    expect([statusRoute('paused'), statusRoute('churned'), statusRoute('active')]).toEqual([
      'pause',
      'stop',
      'set',
    ]);
  });

  it('«مدّ الجدول»\'s refusals in words; anything else is generic', () => {
    expect(courseExtendErrorCode(new ApiError(409, { code: 'course_paused' }))).toBe('course_paused');
    expect(courseExtendErrorCode(new ApiError(500, { code: 'boom' }))).toBe('generic');
  });
});
