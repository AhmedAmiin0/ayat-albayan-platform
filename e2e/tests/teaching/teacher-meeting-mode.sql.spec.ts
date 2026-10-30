import { expect, test } from '@playwright/test';
import type { TransactionSql } from 'postgres';
import { rolledBack } from '../../support/rls';

// Migration 490 against the real database, in a transaction that is rolled back:
// teachers.meeting_mode (null | 'static' | 'platform') and the relink trigger that carries a new
// fixed link to the teacher's future open lessons that had the old one (or none).

type Tx = TransactionSql;
const DAY = 86_400_000;
const OLD = 'https://meet.google.com/old-link-abc';
const NEW = 'https://meet.google.com/new-link-xyz';
const OWN = 'https://zoom.us/j/student-override';

async function teacher(tx: Tx, link: string | null = OLD): Promise<string> {
  const [row] = await tx<{ id: string }[]>`insert into public.teachers (display_name_ar, gender, programs, tz, meeting_link)
    values ('معلمة الرابط', 'female', '{quran}', 'Asia/Riyadh', ${link}) returning id`;
  if (!row) throw new Error('teacher not inserted');
  return row.id;
}

type Lesson = { teacherId: string; inDays: number; status?: string; link: string | null };
async function lesson(tx: Tx, l: Lesson): Promise<string> {
  const starts = new Date(Date.now() + l.inDays * DAY);
  const ends = new Date(starts.getTime() + 45 * 60_000);
  const [row] = await tx<{ id: string }[]>`insert into public.lessons (teacher_id, starts_at, ends_at, status, meeting_link)
    values (${l.teacherId}, ${starts}, ${ends}, ${l.status ?? 'scheduled'}::public.lesson_status, ${l.link}) returning id`;
  if (!row) throw new Error('lesson not inserted');
  return row.id;
}

const linkOf = async (tx: Tx, id: string) =>
  (await tx<{ meeting_link: string | null }[]>`select meeting_link from public.lessons where id = ${id}`)[0]?.meeting_link;

test.describe('teachers.meeting_mode (migration 490)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'database only: one run'));

  test('null (the academy default), static and platform are accepted; anything else is refused', async () => {
    await rolledBack(async (tx) => {
      const id = await teacher(tx);
      const [row] = await tx<{ meeting_mode: string | null }[]>`select meeting_mode from public.teachers where id = ${id}`;
      expect(row?.meeting_mode).toBeNull();
      for (const mode of ['static', 'platform', null]) {
        await tx`update public.teachers set meeting_mode = ${mode} where id = ${id}`;
      }
      const bad = await tx.savepoint((sp) => sp`update public.teachers set meeting_mode = 'zoom' where id = ${id}`)
        .then(() => 'ok', (e: { code?: string; constraint_name?: string }) => `${e.code}:${e.constraint_name}`);
      expect(bad).toBe('23514:teachers_meeting_mode_check');
    });
  });

  test('a new fixed link reaches future open lessons with the old link or none, nothing else', async () => {
    await rolledBack(async (tx) => {
      const id = await teacher(tx);
      const other = await teacher(tx);
      const ids = {
        old: await lesson(tx, { teacherId: id, inDays: 3, link: OLD }),
        none: await lesson(tx, { teacherId: id, inDays: 4, link: null }),
        confirmed: await lesson(tx, { teacherId: id, inDays: 5, status: 'confirmed', link: OLD }),
        override: await lesson(tx, { teacherId: id, inDays: 6, link: OWN }),
        past: await lesson(tx, { teacherId: id, inDays: -2, link: OLD }),
        held: await lesson(tx, { teacherId: id, inDays: 2, status: 'completed', link: OLD }),
        cancelled: await lesson(tx, { teacherId: id, inDays: 7, status: 'cancelled_by_admin', link: OLD }),
        otherTeacher: await lesson(tx, { teacherId: other, inDays: 3, link: OLD }),
      };
      await tx`update public.teachers set meeting_link = ${NEW} where id = ${id}`;
      for (const key of ['old', 'none', 'confirmed'] as const) expect(await linkOf(tx, ids[key])).toBe(NEW);
      expect(await linkOf(tx, ids.override)).toBe(OWN);
      for (const key of ['past', 'held', 'cancelled', 'otherTeacher'] as const) expect(await linkOf(tx, ids[key])).toBe(OLD);
    });
  });

  test('an update that leaves the link as it is changes no lesson', async () => {
    await rolledBack(async (tx) => {
      const id = await teacher(tx);
      const none = await lesson(tx, { teacherId: id, inDays: 3, link: null });
      await tx`update public.teachers set meeting_link = ${OLD}, meeting_mode = 'platform' where id = ${id}`;
      await tx`update public.teachers set display_name_ar = 'اسم آخر' where id = ${id}`;
      expect(await linkOf(tx, none)).toBeNull();
    });
  });

  test('schedule_rules keep their own link', async () => {
    await rolledBack(async (tx) => {
      const id = await teacher(tx);
      const [rule] = await tx<{ id: string }[]>`insert into public.schedule_rules
        (teacher_id, duration_min, start_time_local, tz, byday, starts_on, meeting_link)
        values (${id}, 45, '17:00', 'Asia/Riyadh', '{0}', current_date, ${OLD}) returning id`;
      await tx`update public.teachers set meeting_link = ${NEW} where id = ${id}`;
      const [after] = await tx<{ meeting_link: string | null }[]>`select meeting_link from public.schedule_rules where id = ${rule?.id ?? ''}`;
      expect(after?.meeting_link).toBe(OLD);
    });
  });
});
