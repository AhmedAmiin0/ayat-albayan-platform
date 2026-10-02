import { describe, expect, it } from 'vitest';
import { toLessonView } from './lessons.mapper';
import { LESSON_ID, lessonRow, STUDENT_ID, TEACHER_ID } from './lessons.fakes';

const none = new Map<string, number>();

describe('toLessonView (R-LES-01, R-LES-03, R-SCH-03)', () => {
  it('maps the row, normalising Postgres instants to ISO UTC', () => {
    const view = toLessonView(lessonRow({ confirmed_at: '2026-10-03 09:00:00+00' }), { role: 'admin', seq: none });
    expect(view).toMatchObject({
      id: LESSON_ID,
      teacher: { id: TEACHER_ID, display_name_ar: 'أبرار', tz: 'Africa/Cairo' },
      starts_at: '2026-10-04T14:00:00.000Z',
      ends_at: '2026-10-04T14:45:00.000Z',
      confirmed_at: '2026-10-03T09:00:00.000Z',
      meeting_link: 'https://meet.jit.si/abrar',
      students: [{ id: STUDENT_ID, code: 'AB-0183', name: 'سهيلة', tz: 'Asia/Riyadh', attendance: null, chargeable: true, seq: null }],
    });
  });

  it('fills the lesson number from v_lesson_sequence for that (lesson, student)', () => {
    const seq = new Map([[`${LESSON_ID}:${STUDENT_ID}`, 7]]);
    const view = toLessonView(lessonRow({ status: 'completed' }), { role: 'admin', seq });
    expect(view.students[0]?.seq).toBe(7);
  });

  it('admins get every allowed event; teachers only confirm and attendance outcomes', () => {
    const row = lessonRow();
    expect(toLessonView(row, { role: 'admin', seq: none }).allowed_events).toEqual([
      'confirm',
      'complete',
      'mark_late',
      'excuse',
      'mark_no_show',
      'cancel_by_teacher',
      'cancel_by_admin',
      'reschedule',
    ]);
    expect(toLessonView(row, { role: 'teacher', seq: none }).allowed_events).toEqual([
      'confirm',
      'complete',
      'mark_late',
      'excuse',
      'mark_no_show',
    ]);
  });

  it('a terminal lesson offers nothing', () => {
    expect(toLessonView(lessonRow({ status: 'rescheduled' }), { role: 'admin', seq: none }).allowed_events).toEqual([]);
  });

  it('sorts group students by Arabic name and tolerates a missing embed', () => {
    const row = lessonRow({
      lesson_students: [
        { student_id: 's2', attendance: null, chargeable: true, student: { id: 's2', code: 'AB-0200', name: 'مريم', tz: 'Asia/Riyadh' } },
        { student_id: 's1', attendance: 'on_time', chargeable: true, student: { id: 's1', code: null, name: 'أحمد', tz: 'Africa/Cairo' } },
      ],
      teacher: null,
    });
    const view = toLessonView(row, { role: 'admin', seq: none });
    expect(view.students.map((s) => s.name)).toEqual(['أحمد', 'مريم']);
    expect(view.students[0]?.code).toBe('');
    expect(view.teacher.id).toBe(TEACHER_ID);
  });
});
