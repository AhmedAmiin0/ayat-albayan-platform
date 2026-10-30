import { startedToday } from '../finance/money';
import { seedFamily, seedLesson, withSql } from '../core/schedule';

// A second, login-less teacher «هبة» with her own family, lesson, sent report, chat and payout:
// everything «أبرار» must never reach (R-NFR-02, rule 9). dropHiba removes it again.

export const HIBA_MONTH = '2031-03-01';
export const HIBA_AMOUNT = 987;

export interface HibaSeed {
  teacherId: string;
  studentId: string;
  studentName: string;
  phone: string;
  lessonId: string;
  reportId: string;
  payoutId: string;
}

export async function seedHiba(tag: string): Promise<HibaSeed> {
  const studentName = `تسنيم ${tag}`;
  const family = await seedFamily('أم تسنيم', [studentName]);
  const studentId = family.studentIds[0] ?? '';
  const ids = await withSql(async (sql) => {
    const [t] = await sql<{ id: string }[]>`
      insert into public.teachers (display_name_ar, gender, programs, tz)
      values (${`هبة ${tag}`}, 'female', '{quran}', 'Asia/Riyadh') returning id`;
    const [g] = await sql<{ phone: string }[]>`select phone_e164 as phone from public.guardians where id = ${family.guardianId}`;
    if (!t || !g) throw new Error('second teacher not written');
    await sql`update public.students set teacher_id = ${t.id} where id = ${studentId}`;
    await sql`insert into public.messages (direction, phone_e164, body) values ('inbound', ${g.phone}, 'رسالة سرية لهبة')`;
    return { teacherId: t.id, phone: g.phone };
  });
  const lessonId = await seedLesson({ teacherId: ids.teacherId, studentId, startsAt: startedToday(), minutes: 45 });
  return withSql(async (sql) => {
    const [r] = await sql<{ id: string }[]>`
      insert into public.lesson_reports (lesson_id, student_id, teacher_id, attendance, notes, status, version, submitted_at)
      values (${lessonId}, ${studentId}, ${ids.teacherId}, 'on_time', 'سر هبة', 'submitted', 1, now()) returning id`;
    await sql`delete from public.teacher_payouts where month = ${HIBA_MONTH}`;
    const [p] = await sql<{ id: string }[]>`
      insert into public.teacher_payouts (teacher_id, month, lessons_count, amount, status, approved_at)
      values (${ids.teacherId}, ${HIBA_MONTH}, 4, ${HIBA_AMOUNT}, 'approved', now()) returning id`;
    if (!r || !p) throw new Error('report or payout not written');
    return { ...ids, studentId, studentName, lessonId, reportId: r.id, payoutId: p.id };
  });
}

export async function dropHiba(hiba: HibaSeed): Promise<void> {
  await withSql(async (sql) => {
    await sql`delete from public.teacher_payouts where month = ${HIBA_MONTH}`;
    await sql`delete from public.lessons where teacher_id = ${hiba.teacherId}`;
    await sql`delete from public.messages where phone_e164 = ${hiba.phone}`;
    await sql`update public.students set teacher_id = null where teacher_id = ${hiba.teacherId}`;
    await sql`delete from public.teachers where id = ${hiba.teacherId}`;
  });
}

/** An approved payout of «أبرار» for the same month (one row per teacher and month). */
export async function seedAbrarPayout(input: { teacherId: string; amount: number }): Promise<void> {
  await withSql((sql) => sql`
    insert into public.teacher_payouts (teacher_id, month, lessons_count, amount, status, approved_at)
    values (${input.teacherId}, ${HIBA_MONTH}, 2, ${input.amount}, 'approved', now())
    on conflict (teacher_id, month) do update set amount = excluded.amount, status = 'approved', approved_at = now()`);
}
