import { describe, expect, it } from 'vitest';
import { scheduleRow } from './sales-academy.fakes';
import { nextLessons, riyadhDayRange, riyadhToday, teacherDayFacts, toScheduleLesson, upcomingRange } from './sales-schedule.mapper';

const NOW = new Date('2026-10-11T16:10:00.000Z');

describe('sales schedule mappers', () => {
  it('riyadhToday / riyadhDayRange: the Riyadh calendar day (UTC+3, no DST)', () => {
    expect(riyadhToday(new Date('2026-10-11T20:59:00.000Z'))).toBe('2026-10-11');
    expect(riyadhToday(new Date('2026-10-11T21:00:00.000Z'))).toBe('2026-10-12');
    expect(riyadhDayRange('2026-10-12')).toEqual({ from: new Date('2026-10-11T21:00:00.000Z'), to: new Date('2026-10-12T21:00:00.000Z') });
  });

  it('upcomingRange looks 8 days ahead from now', () => {
    expect(upcomingRange(NOW)).toEqual({ from: NOW, to: new Date('2026-10-19T16:10:00.000Z') });
  });

  it('toScheduleLesson whitelists: secret columns of the row never come out', () => {
    const out = toScheduleLesson(scheduleRow());
    expect(Object.keys(out).sort()).toEqual(['ends_at', 'id', 'makeup', 'starts_at', 'status', 'students', 'teacher', 'trial']);
    expect(out.teacher).toEqual({ id: 'tc1', display_name_ar: 'أبرار', display_name_en: 'Abrar' });
    expect(out.students).toEqual([{ id: 's1', code: 'AB-0101', name: 'ياسمين' }]);
    const bare = toScheduleLesson(scheduleRow({ teacher: null, rule: null, makeup_of_id: 'x', lesson_students: [{ student: { id: 's9', code: null, name: 'ن' } }] }));
    expect([bare.teacher.display_name_ar, bare.trial, bare.makeup, bare.students[0]?.code]).toEqual(['', false, true, '']);
  });

  it('teacherDayFacts counts today’s lessons but not cancelled ones, and flags one running now', () => {
    const facts = teacherDayFacts(
      [
        scheduleRow({ starts_at: '2026-10-11T16:00:00.000Z', ends_at: '2026-10-11T16:30:00.000Z' }),
        scheduleRow({ id: 'x', status: 'cancelled_by_admin', starts_at: '2026-10-11T16:00:00.000Z' }),
        scheduleRow({ id: 'y', status: 'completed', starts_at: '2026-10-11T09:00:00.000Z', ends_at: '2026-10-11T09:30:00.000Z' }),
        scheduleRow({ id: 'z', teacher: { id: 'tc2', display_name_ar: 'ب', display_name_en: null }, status: 'completed', starts_at: '2026-10-11T16:00:00.000Z' }),
        scheduleRow({ id: 'w', teacher: null }),
      ],
      NOW,
    );
    expect(facts.get('tc1')).toEqual({ lessons_today: 2, live_now: true });
    expect(facts.get('tc2')).toEqual({ lessons_today: 1, live_now: false });
    expect(facts.size).toBe(2);
  });

  it('nextLessons keeps each student’s first start (rows come by start)', () => {
    const next = nextLessons([
      { starts_at: '2026-10-12T10:00:00.000Z', lesson_students: [{ student_id: 'a' }] },
      { starts_at: '2026-10-13T10:00:00.000Z', lesson_students: [{ student_id: 'a' }, { student_id: 'b' }] },
    ]);
    expect([...next]).toEqual([['a', '2026-10-12T10:00:00.000Z'], ['b', '2026-10-13T10:00:00.000Z']]);
  });
});
