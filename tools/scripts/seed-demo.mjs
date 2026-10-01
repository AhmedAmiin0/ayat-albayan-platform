// pnpm seed:demo — idempotent, clearly-marked DEMO data for local visual checks (R-NFR-04).
// Reads DATABASE_URL from e2e/.env (`pnpm env:local`); refuses anything but a local database.
// Re-runs upsert by phone (teachers, guardians, leads, applicants) and by guardian+name
// (students), so codes stay stable. Availability and time-off of demo teachers are replaced.
import { normalizeArabic } from '@ab/shared';
import postgres from 'postgres';
import { APPLICANTS, DEMO_NOTE, FAMILIES, LEADS, TEACHERS } from './seed-demo.data.mjs';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL missing: run `pnpm env:local` (writes e2e/.env)');
if (!/@(localhost|127\.0\.0\.1)[:/]/.test(url)) throw new Error(`refusing to seed a non-local DB: ${url}`);

const sql = postgres(url, { max: 1, onnotice: () => undefined });
const ago = (minutes) => (minutes === undefined ? null : new Date(Date.now() - minutes * 60_000));

async function seedTeacher(tx, t) {
  const [row] = await tx`
    insert into public.teachers (display_name_ar, display_name_en, gender, programs, phone_e164, meeting_link,
      rate_30, rate_45, rate_60, rate_90, max_students, status, tz)
    values (${t.ar}, ${`${t.en} (DEMO)`}, ${t.gender}, ${tx.array(t.programs)}::public.program[], ${t.phone},
      ${t.link}, ${t.rate_30}, ${t.rate_45}, ${t.rate_60}, ${t.rate_90}, ${t.max}, ${t.status}, ${t.tz})
    on conflict (phone_e164) do update set display_name_ar = excluded.display_name_ar,
      display_name_en = excluded.display_name_en, programs = excluded.programs, status = excluded.status,
      meeting_link = excluded.meeting_link, tz = excluded.tz
    returning id`;
  await tx`delete from public.teacher_availability where teacher_id = ${row.id}`;
  for (const [weekday, start, end] of t.availability) {
    await tx`insert into public.teacher_availability (teacher_id, weekday, start_time, end_time, tz)
      values (${row.id}, ${weekday}, ${start}, ${end}, ${t.tz})`;
  }
  await tx`delete from public.teacher_time_off where teacher_id = ${row.id}`;
  if (t.timeOff) {
    await tx`insert into public.teacher_time_off (teacher_id, starts_at, ends_at, reason)
      values (${row.id}, ${t.timeOff.from}, ${t.timeOff.to}, ${t.timeOff.reason})`;
  }
  return row.id;
}

async function seedFamily(tx, { family, teacherIds }) {
  const [g] = await tx`
    insert into public.guardians (name, phone_e164, country, tz, source, notes)
    values (${family.name}, ${family.phone}, ${family.country}, ${family.tz}, ${family.source}, ${DEMO_NOTE})
    on conflict (phone_e164) do update set name = excluded.name, notes = excluded.notes
    returning id`;
  for (const s of family.students) {
    const teacherId = s.teacher === null ? null : teacherIds[s.teacher];
    const riwaya = s.program === 'quran' ? 'حفص عن عاصم' : null;
    const updated = await tx`
      update public.students set age = ${s.age}, gender = ${s.gender}, program = ${s.program}, status = ${s.status},
        teacher_id = ${teacherId}, tz = ${family.tz}, riwaya = ${riwaya}, notes = ${DEMO_NOTE}
      where guardian_id = ${g.id} and name = ${s.name} returning id`;
    if (updated.length > 0) continue;
    await tx`
      insert into public.students (guardian_id, name, name_normalized, age, gender, program, tz, status, teacher_id, riwaya, notes)
      values (${g.id}, ${s.name}, ${normalizeArabic(s.name)}, ${s.age}, ${s.gender}, ${s.program}, ${family.tz},
        ${s.status}, ${teacherId}, ${riwaya}, ${DEMO_NOTE})`;
  }
}

async function seedLead(tx, l) {
  const followUp = l.followUpHours ? new Date(Date.now() + l.followUpHours * 3_600_000) : null;
  await tx`
    insert into public.leads (phone_e164, name, source, status, qualification, last_inbound_at, last_outbound_at,
      next_follow_up_at, created_at)
    values (${l.phone}, ${l.name}, ${l.source}, ${l.status}, ${tx.json({ demo: true })}, ${ago(l.inbound)},
      ${ago(l.outbound)}, ${followUp}, ${ago(l.inbound + 5)})
    on conflict (phone_e164) do update set name = excluded.name, source = excluded.source, status = excluded.status,
      created_at = excluded.created_at,
      qualification = excluded.qualification, last_inbound_at = excluded.last_inbound_at,
      last_outbound_at = excluded.last_outbound_at, next_follow_up_at = excluded.next_follow_up_at`;
}

async function seedApplicant(tx, a) {
  await tx`
    insert into public.job_applicants (phone_e164, name, status, notes)
    values (${a.phone}, ${a.name}, ${a.status}, ${DEMO_NOTE})
    on conflict (phone_e164) do update set name = excluded.name, status = excluded.status, notes = excluded.notes`;
}

try {
  await sql.begin(async (tx) => {
    const teacherIds = [];
    for (const t of TEACHERS) teacherIds.push(await seedTeacher(tx, t));
    for (const family of FAMILIES) await seedFamily(tx, { family, teacherIds });
    for (const l of LEADS) await seedLead(tx, l);
    for (const a of APPLICANTS) await seedApplicant(tx, a);
  });
  const students = FAMILIES.reduce((n, f) => n + f.students.length, 0);
  console.log(
    `DEMO data ready: ${TEACHERS.length} teachers, ${FAMILIES.length} guardians, ${students} students, ` +
      `${LEADS.length} leads, ${APPLICANTS.length} job applicants (marked "${DEMO_NOTE}" / "(DEMO)").`,
  );
} finally {
  await sql.end();
}
