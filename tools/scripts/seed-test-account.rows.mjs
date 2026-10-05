// The test teacher / guardian / student rows (seed-test-account.mjs). Upserts are keyed like
// seed-demo.mjs (teacher: its login OR its fixed phone; guardian: phone; student: guardian + name)
// and deletes match those keys AND the DEMO markers, so a real row is never selected.
import { normalizeArabic } from '@ab/shared';
import { TEST_FAMILY, TEST_TEACHER } from './seed-test-account.data.mjs';

const T = TEST_TEACHER;
const F = TEST_FAMILY;

/** Teacher row linked to the login; availability replaced. Returns the teacher id. */
export async function upsertTeacher(tx, profileId) {
  const { rate_30, rate_45, rate_60, rate_90 } = T.rates;
  const found = await tx`
    select id, display_name_en from public.teachers
    where profile_id = ${profileId} or phone_e164 = ${T.phone}`;
  if (found.length > 1 || (found[0] && found[0].display_name_en !== T.en)) {
    throw new Error(
      'a teacher row that this script did not create holds the login or the test phone',
    );
  }
  const [row] = found[0]
    ? await tx`
      update public.teachers set profile_id = ${profileId}, display_name_ar = ${T.ar}, gender = ${T.gender},
        programs = ${tx.array(T.programs)}::public.program[], phone_e164 = ${T.phone}, rate_30 = ${rate_30},
        rate_45 = ${rate_45}, rate_60 = ${rate_60}, rate_90 = ${rate_90}, max_students = ${T.max},
        status = ${T.status}, tz = ${T.tz}
      where id = ${found[0].id} returning id`
    : await tx`
      insert into public.teachers (profile_id, display_name_ar, display_name_en, gender, programs,
        phone_e164, rate_30, rate_45, rate_60, rate_90, max_students, status, tz)
      values (${profileId}, ${T.ar}, ${T.en}, ${T.gender}, ${tx.array(T.programs)}::public.program[],
        ${T.phone}, ${rate_30}, ${rate_45}, ${rate_60}, ${rate_90}, ${T.max}, ${T.status}, ${T.tz})
      returning id`;
  await tx`delete from public.teacher_availability where teacher_id = ${row.id}`;
  for (const [weekday, start, end] of T.availability) {
    await tx`insert into public.teacher_availability (teacher_id, weekday, start_time, end_time, tz)
      values (${row.id}, ${weekday}, ${start}, ${end}, ${T.tz})`;
  }
  return row.id;
}

/** Guardian + one student assigned to the teacher. The student code comes from the DB. */
export async function upsertFamily(tx, teacherId) {
  const s = F.student;
  const [g] = await tx`
    insert into public.guardians (name, phone_e164, country, tz, source, notes)
    values (${F.name}, ${F.phone}, ${F.country}, ${F.tz}, ${F.source}, ${F.note})
    on conflict (phone_e164) do update set name = excluded.name, notes = excluded.notes
    returning id`;
  const [updated] = await tx`
    update public.students set age = ${s.age}, gender = ${s.gender}, program = ${s.program},
      status = ${s.status}, teacher_id = ${teacherId}, tz = ${F.tz}, riwaya = 'حفص عن عاصم', notes = ${F.note}
    where guardian_id = ${g.id} and name = ${s.name} returning id, code`;
  if (updated) return { guardianId: g.id, student: updated };
  const [student] = await tx`
    insert into public.students (guardian_id, name, name_normalized, age, gender, program, tz, status,
      teacher_id, riwaya, notes)
    values (${g.id}, ${s.name}, ${normalizeArabic(s.name)}, ${s.age}, ${s.gender}, ${s.program}, ${F.tz},
      ${s.status}, ${teacherId}, 'حفص عن عاصم', ${F.note})
    returning id, code`;
  return { guardianId: g.id, student };
}

/** Deletes exactly the test rows; returns per-table counts. Lessons etc. on them make it fail. */
export async function deleteRows(tx) {
  const students = await tx`
    delete from public.students st using public.guardians g
    where g.id = st.guardian_id and g.phone_e164 = ${F.phone} and st.name = ${F.student.name}
      and st.notes = ${F.note} returning st.id`;
  const guardians = await tx`
    delete from public.guardians where phone_e164 = ${F.phone} and notes = ${F.note}
      and not exists (select 1 from public.students s where s.guardian_id = guardians.id)
    returning id`;
  const teachers = await tx`
    delete from public.teachers where phone_e164 = ${T.phone} and display_name_en = ${T.en}
    returning id`;
  return { students: students.length, guardians: guardians.length, teachers: teachers.length };
}
