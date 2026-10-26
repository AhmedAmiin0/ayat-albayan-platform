import { describe, expect, it } from 'vitest';
import { lessonRow, S2 } from '../portal.fakes';
import { externalLink, toPortalLesson, wayIn } from './portal-lessons.mapper';

const win = { opensBeforeMin: 10, closesAfterMin: 15 };
const ctx = (now: string, over: Partial<{ academyAuto: boolean; override: string | null }> = {}) => ({
  academyAuto: false, override: null, win, now: new Date(now), ...over,
});
const teacher = (meeting_mode: string | null) => ({ display_name_ar: 'أبرار', display_name_en: null, meeting_mode });

describe('portal lessons mapper', () => {
  it('the way in follows the teacher mode, else the academy default', () => {
    expect(wayIn(lessonRow({ teacher: teacher('platform') }), { academyAuto: false, override: null })).toBe('classroom');
    expect(wayIn(lessonRow({ teacher: teacher(null) }), { academyAuto: true, override: null })).toBe('classroom');
    expect(wayIn(lessonRow({ teacher: teacher('static') }), { academyAuto: true, override: null })).toBe('external');
    expect(wayIn(lessonRow({ teacher: teacher('static'), meeting_link: '  ' }), { academyAuto: false, override: null })).toBe('none');
  });

  it("the student's override wins on a one-student lesson only", () => {
    expect(externalLink(lessonRow(), ' https://own.example.org ')).toBe('https://own.example.org');
    expect(externalLink(lessonRow({ lesson_students: [{ student_id: 'a' }, { student_id: S2 }] }), 'https://own.example.org')).toBe('https://meet.example.org/abc');
    expect(externalLink(lessonRow({ meeting_link: null }), null)).toBeNull();
  });

  it('whitelists the row: the URL only inside the window, a cancelled lesson has no way in', () => {
    const open = toPortalLesson(lessonRow(), ctx('2026-10-27T16:05:00.000Z'));
    expect(Object.keys(open).sort()).toEqual(['ends_at', 'id', 'meeting_url', 'starts_at', 'status', 'teacher', 'way_in', 'window']);
    expect(open.teacher).toEqual({ display_name_ar: 'أبرار', display_name_en: 'Abrar' });
    expect(open.meeting_url).toBe('https://meet.example.org/abc');
    expect(toPortalLesson(lessonRow(), ctx('2026-10-27T15:00:00.000Z')).meeting_url).toBeNull();
    expect(toPortalLesson(lessonRow(), ctx('2026-10-27T17:00:00.000Z')).window.state).toBe('closed');
    const cancelled = toPortalLesson(lessonRow({ status: 'cancelled_by_admin' }), ctx('2026-10-27T16:05:00.000Z'));
    expect([cancelled.way_in, cancelled.meeting_url]).toEqual(['none', null]);
  });

  it('a platform lesson never carries a URL (the join endpoint mints it)', () => {
    const row = lessonRow({ teacher: teacher('platform') });
    expect(toPortalLesson(row, ctx('2026-10-27T16:05:00.000Z'))).toMatchObject({ way_in: 'classroom', meeting_url: null });
  });
});
