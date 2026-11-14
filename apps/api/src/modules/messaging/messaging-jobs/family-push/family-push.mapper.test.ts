import { describe, expect, it } from 'vitest';
import { lessonOf, reportOf } from './family-push.mapper';

const STUDENT = { id: 's1', name: 'سهيلة', tz: 'Asia/Riyadh', profile_id: null, guardian: null };
const TIMES = { starts_at: '2026-11-14T16:00:00Z', ends_at: '2026-11-14T16:30:00Z' };

describe('family push rows', () => {
  it('a lesson keeps its students, dropping a missing one', () => {
    const row = {
      id: 'l1',
      ...TIMES,
      room_opened_at: null,
      lesson_students: [{ student: STUDENT }, { student: null }],
    };
    expect(lessonOf(row)).toEqual({
      id: 'l1',
      ...TIMES,
      room_opened_at: null,
      students: [STUDENT],
    });
  });

  it('a report takes its lesson’s start; one without a lesson or student is nothing', () => {
    const link = { lesson: { starts_at: TIMES.starts_at }, student: STUDENT };
    expect(reportOf({ id: 'r1', lesson_id: 'l1', link })).toEqual([
      { id: 'r1', lesson_id: 'l1', starts_at: TIMES.starts_at, student: STUDENT },
    ]);
    expect(reportOf({ id: 'r1', lesson_id: 'l1', link: null })).toEqual([]);
    expect(reportOf({ id: 'r1', lesson_id: 'l1', link: { ...link, lesson: null } })).toEqual([]);
  });
});
