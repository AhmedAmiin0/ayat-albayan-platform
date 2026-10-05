import { normalizeArabic } from '@ab/shared';
import { dropTeacher, insertTeacher } from './admin-extra';
import { withSql } from './schedule';

// Seed for the students-filters spec (R-STU-01, R-TCH-03): one teacher with an active, a trial
// and a paused student, plus an active student without a teacher. Names carry a clock stamp so
// desktop, mobile and earlier runs never share them.

export interface FilterSeed {
  teacherId: string;
  teacherName: string;
  guardianPhone: string;
  names: { active: string; trial: string; paused: string; unassigned: string };
}

export function filterSeed(stamp: string): Omit<FilterSeed, 'teacherId'> {
  const n = (k: string) => `فلتر ${k} ${stamp}`;
  return {
    teacherName: `معلمة الفلاتر ${stamp}`,
    guardianPhone: `+9665${stamp}99`,
    names: { active: n('مشترك'), trial: n('تجريبي'), paused: n('متوقف'), unassigned: n('بدون') },
  };
}

export async function seedFilterStudents(seed: Omit<FilterSeed, 'teacherId'>): Promise<FilterSeed> {
  const teacherId = await insertTeacher({ name: seed.teacherName });
  await withSql(async (sql) => {
    const [g] = await sql<{ id: string }[]>`
      insert into public.guardians (name, phone_e164, country, tz)
      values (${`ولي ${seed.teacherName}`}, ${seed.guardianPhone}, 'SA', 'Asia/Riyadh') returning id`;
    const rows: [string, string, string | null][] = [
      [seed.names.active, 'active', teacherId],
      [seed.names.trial, 'trial', teacherId],
      [seed.names.paused, 'paused', teacherId],
      [seed.names.unassigned, 'active', null],
    ];
    for (const [name, status, teacher] of rows) {
      await sql`insert into public.students (guardian_id, name, name_normalized, tz, status, teacher_id)
        values (${g?.id ?? ''}, ${name}, ${normalizeArabic(name)}, 'Asia/Riyadh',
          ${status}::public.student_status, ${teacher})`;
    }
  });
  return { ...seed, teacherId };
}

export async function dropFilterStudents(seed: FilterSeed): Promise<void> {
  await dropTeacher(seed.teacherId);
  await withSql(async (sql) => {
    await sql`delete from public.students where guardian_id in
      (select id from public.guardians where phone_e164 = ${seed.guardianPhone})`;
    await sql`delete from public.guardians where phone_e164 = ${seed.guardianPhone}`;
  });
}
