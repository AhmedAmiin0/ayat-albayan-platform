import { withSql } from '../core/schedule';

// Seed/read helpers for the admin-web profile, teachers and search specs (B6, B7, A14).

interface TeacherSeed {
  name: string;
  meetingLink?: string;
  phone?: string;
  programs?: string[];
}

/** A teacher row without a login (so it never touches the e2e «أبرار»); returns its id. */
export async function insertTeacher(seed: TeacherSeed): Promise<string> {
  return withSql(async (sql) => {
    const programs = `{${(seed.programs ?? ['quran']).join(',')}}`;
    const [row] = await sql<{ id: string }[]>`
      insert into public.teachers (display_name_ar, gender, programs, tz, meeting_link, phone_e164)
      values (${seed.name}, 'female', ${programs}::public.program[], 'Asia/Riyadh',
        ${seed.meetingLink ?? null}, ${seed.phone ?? null}) returning id`;
    if (!row) throw new Error('teacher not written');
    return row.id;
  });
}

/** Removes a seeded teacher together with what hangs off it (availability, time off, rates, links). */
export async function dropTeacher(teacherId: string): Promise<void> {
  await withSql(async (sql) => {
    await sql`update public.students set teacher_id = null where teacher_id = ${teacherId}`;
    await sql`delete from public.lessons where teacher_id = ${teacherId}`;
    await sql`delete from public.schedule_rules where teacher_id = ${teacherId}`;
    await sql`delete from public.teacher_availability where teacher_id = ${teacherId}`;
    await sql`delete from public.teacher_time_off where teacher_id = ${teacherId}`;
    await sql`delete from public.teachers where id = ${teacherId}`;
  });
}

export interface StudentRow {
  name: string;
  age: number | null;
  gender: string | null;
  program: string;
  status: string;
  teacher_id: string | null;
  tz: string;
  level: string | null;
  memorized: string | null;
  goal: string | null;
  riwaya: string | null;
  meeting_link_override: string | null;
  notes: string | null;
}

export async function studentRow(id: string): Promise<StudentRow | undefined> {
  return withSql(async (sql) => {
    const rows = await sql<StudentRow[]>`
      select name, age, gender, program, status, teacher_id, tz, level, memorized, goal, riwaya,
        meeting_link_override, notes from public.students where id = ${id}`;
    return rows[0];
  });
}

/** The after-status of every status_change audit row of a student, oldest first. */
export async function statusAudits(studentId: string): Promise<string[]> {
  return withSql(async (sql) => {
    const rows = await sql<{ status: string }[]>`
      select after->>'status' as status from public.audit_log
      where entity = 'students' and entity_id = ${studentId} and action = 'status_change' order by at`;
    return rows.map((r) => r.status);
  });
}

export async function studentIdsOf(guardianId: string): Promise<string[]> {
  return withSql(async (sql) => {
    const rows = await sql<{ id: string }[]>`select id from public.students where guardian_id = ${guardianId}`;
    return rows.map((r) => r.id);
  });
}

interface ScheduledLesson {
  teacherId: string;
  studentId: string;
  startsAt: Date;
  status: string;
  link: string;
}

/** One 45-minute lesson with a given status (confirmed, cancelled_by_admin, …) and meeting link. */
export async function insertLesson(l: ScheduledLesson): Promise<string> {
  return withSql(async (sql) => {
    const endsAt = new Date(l.startsAt.getTime() + 45 * 60_000);
    const [row] = await sql<{ id: string }[]>`
      insert into public.lessons (teacher_id, starts_at, ends_at, status, meeting_link)
      values (${l.teacherId}, ${l.startsAt}, ${endsAt}, ${l.status}::public.lesson_status, ${l.link})
      returning id`;
    if (!row) throw new Error('lesson not written');
    await sql`insert into public.lesson_students (lesson_id, student_id) values (${row.id}, ${l.studentId})`;
    return row.id;
  });
}

export async function setStudentTz(studentId: string, tz: string): Promise<void> {
  await withSql((sql) => sql`update public.students set tz = ${tz} where id = ${studentId}`);
}
