// Shared invented «تقويم الحجوزات» rows for the booking tests (never real export rows).
import { keys } from '../../keys.ts';
import { bundleOf, pipeline, row, studentRow } from '../../sources/sheets/fixtures.ts';
import type { Cell, SourceRow } from '../../types.ts';
import { lessonStudentsModule, lessonsModule } from '../lessons/lessons.ts';
import { guardiansModule } from '../people/guardians.ts';
import { studentsModule } from '../people/students.ts';
import { teachersModule } from '../teachers/teachers.ts';
import { scheduleRuleStudentsModule, scheduleRulesModule } from './rules.ts';

export const MODULES = [
  teachersModule,
  guardiansModule,
  studentsModule,
  scheduleRulesModule,
  scheduleRuleStudentsModule,
  lessonsModule,
  lessonStudentsModule,
];

/** The run's local date; --from defaults to it. */
export const TODAY = '2026-10-26';

export const booking = (fields: Record<string, Cell>) =>
  row({
    name: 'ليان',
    phone: '966551110001',
    date: '2026-09-01',
    start_time: '18:00',
    duration_min: 30,
    recurrence: 'أسبوعي: الأحد,الثلاثاء',
    status: 'يحتاج تأكيد',
    package_text: '8 حلقات في الشهر',
    teacher: null,
    ...fields,
  });

export const runBookings = (o: {
  bookings: SourceRow[];
  from?: string;
  students?: SourceRow[];
}) => {
  const bundle = bundleOf(
    { hub_students: o.students ?? [studentRow({})], book_bookings: o.bookings },
    TODAY,
  );
  return pipeline({ ...bundle, from: o.from }, MODULES);
};

export const LAYAN = keys.student({ guardianPhone: '+966551110001', name: 'ليان' });
