// One report row on invented data: A2 (no code), A3 (teacher text), A5 (number text), A6 (dates,
// Lorem), grades, start time from the booking or noon Riyadh.
import { describe, expect, it } from 'vitest';
import { keys } from '../../keys.ts';
import { bundleOf, pipeline, reportRow, row, studentRow } from '../../sources/sheets/fixtures.ts';
import type { Cell } from '../../types.ts';
import { guardiansModule } from '../people/guardians.ts';
import { studentIndex } from '../people/match.ts';
import { studentsModule } from '../people/students.ts';
import { teachersModule } from '../teachers/teachers.ts';
import { type ParsedReport, parseReport } from './parse.ts';
import { bookingSlots } from './times.ts';

const sheets = {
  hub_students: [
    studentRow({}),
    studentRow({ student_name: 'هالة محمد', phone: '966551110002', teacher: 'hend' }),
  ],
  book_bookings: [
    row({
      name: 'ليان',
      phone: '966551110001',
      date: '2026-09-10',
      start_time: '17:00',
      duration_min: 30,
      status: 'يحتاج تأكيد',
    }),
  ],
};
const people = pipeline(bundleOf(sheets), [teachersModule, guardiansModule, studentsModule]);
const ix = studentIndex(people.by('students'));
const ctx = { ix, slots: bookingSlots(bundleOf(sheets), ix), today: '2026-10-02' };
const parse = (f: Record<string, Cell>) => parseReport(reportRow(f), ctx);
const ok = (f: Record<string, Cell>): ParsedReport => {
  const r = parse(f);
  if (Array.isArray(r)) throw new Error(JSON.stringify(r));
  return r;
};
const LAYAN = keys.student({ guardianPhone: '+966551110001', name: 'ليان' });

describe('parseReport', () => {
  it('a linked row: student by phone, booked time in Riyadh → UTC, grades, sent', () => {
    const r = ok({ grade_memorization: 'يحتاج إلى مراجعة' });
    expect(r).toMatchObject({
      teacher: 'abrar',
      student: LAYAN,
      date: '2026-09-10',
      startsAt: '2026-09-10T14:00:00.000Z',
      endsAt: '2026-09-10T14:30:00.000Z',
      attendance: 'on_time',
      trial: false,
      sent: true,
      submittedAt: '2026-09-10T16:30:05.000Z',
      lessonKey: keys.lesson({ teacher: 'abrar', students: [LAYAN.key], at: '2026-09-10' }),
      issues: [],
    });
    expect(r.body).toMatchObject({
      grade_overall: 'excellent',
      grade_tajweed: 'very_good',
      grade_memorization: 'needs_review',
    });
    // A5: «رقم الحلقة» is never a column; the number is derived in the app.
    expect(JSON.stringify(r.body)).not.toContain('الثالثة');
  });

  it('A2: an old row without phone or code matches by name within the teacher', () => {
    const r = ok({
      teacher_slug: null,
      teacher: 'المعلمة: هند',
      student_registry_name: null,
      phone: null,
      student_name: 'هاله',
      lesson_date: '2026-08-15',
    });
    expect(r.student.key).toBe('+966551110002|هاله محمد');
    expect(r.teacher).toBe('hend');
    expect(r.startsAt).toBe('2026-08-15T09:00:00.000Z'); // no booking: noon Riyadh
    expect(r.issues).toMatchObject([
      { code: 'missing_field', severity: 'warn', field: 'start_time' },
    ]);
  });

  it('A3: aliases resolve; a city or unknown name falls back to the registry teacher', () => {
    expect(ok({ teacher_slug: null, teacher: 'أبرار سالم' }).teacher).toBe('abrar');
    const city = ok({ teacher_slug: null, teacher: 'الفيوم' });
    expect(city.teacher).toBe('abrar');
    expect(city.issues[0]).toMatchObject({ code: 'unknown_teacher', severity: 'warn' });
    const lost = { teacher_slug: null, phone: null, student_registry_name: 'سلمى' };
    expect(parse({ ...lost, teacher: 'الفيوم' })).toMatchObject([
      { code: 'unknown_teacher', detail: 'not_a_teacher' },
    ]);
    expect(parse({ ...lost, teacher: 'Ahmed' })).toMatchObject([
      { code: 'unknown_teacher', detail: 'unknown_text' },
    ]);
  });

  it('A4: a report naming two children no single student matches goes to review', () => {
    expect(parse({ student_registry_name: 'ريم وجنى' })).toMatchObject([
      { code: 'sibling_split', severity: 'review', field: 'student' },
    ]);
  });

  it('A6: dates outside 2026-08-01..today and Lorem rows are rejected', () => {
    for (const d of ['2066-08-11', '1996-09-30', '2026-07-31', '2026-10-03'])
      expect(parse({ lesson_date: d })).toMatchObject([{ code: 'bad_date', severity: 'reject' }]);
    expect(parse({ lesson_number_text: 'Laborum Recusandae' })).toMatchObject([
      { code: 'test_row' },
    ]);
    expect(parse({ teacher: 'أ. معلمة (تجربة)' })).toMatchObject([
      { code: 'test_row', detail: 'test_name' },
    ]);
  });

  it('rejects unknown students, attendance and timestamps; flags trials and failed sends', () => {
    expect(parse({ phone: null, student_registry_name: 'سلمى' })).toMatchObject([
      { code: 'missing_ref', detail: 'not_found' },
    ]);
    expect(parse({ attendance: 'غير معروف' })).toMatchObject([
      { code: 'unmapped_value', field: 'attendance' },
    ]);
    expect(parse({ submitted_at: null })).toMatchObject([
      { code: 'missing_field', field: 'submitted_at' },
    ]);
    const t = ok({
      lesson_number_text: 'التجريبيه',
      send_status: 'الملف ما اتبعتش (502)',
      grade_revision: '؟',
    });
    expect(t).toMatchObject({ trial: true, sent: false, attendance: 'on_time' });
    expect(t.issues).toMatchObject([{ code: 'unmapped_value', field: 'grade_revision' }]);
  });
});
