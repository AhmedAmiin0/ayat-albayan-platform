import { expect, test } from '@playwright/test';
import { BASE, edit, HOUR, rolledBack, seed, type Tx } from '../../support/edit-time';

// teacher_confirm_lesson + edit_lesson_time (migration 20261111000200, docs/46 C4 «سأحضر»)
// against the real database, each case in a transaction that is rolled back.

type Seeded = Awaited<ReturnType<typeof seed>>;

const confirm = async (tx: Tx, s: Seeded, teacher = s.teacher.id): Promise<string | undefined> => {
  const [r] = await tx<{ r: string }[]>`select public.teacher_confirm_lesson(
    ${s.lesson}, ${teacher}, ${s.teacher.profile_id}) as r`;
  return r?.r;
};

const lessonOf = async (tx: Tx, id: string) => {
  const [row] = await tx<{ status: string; teacher_confirmed_at: Date | null; teacher_confirmed_by: string | null }[]>`
    select status, teacher_confirmed_at, teacher_confirmed_by from public.lessons where id = ${id}`;
  return row;
};

const audits = async (tx: Tx, id: string) =>
  tx<{ action: string }[]>`select action from public.audit_log
    where entity = 'lessons' and entity_id = ${id} and action = 'teacher_confirm'`;

test.describe('teacher_confirm_lesson (docs/46 C4, D1)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'database only: one run'));

  test("another teacher's lesson → not_owner, nothing changes", async () => {
    await rolledBack(async (tx) => {
      const s = await seed(tx);
      const [other] = await tx<{ id: string }[]>`insert into public.teachers (display_name_ar, gender)
        values ('معلم آخر SQL', 'male') returning id`;
      expect(await confirm(tx, s, other?.id ?? '')).toBe('not_owner');
      expect((await lessonOf(tx, s.lesson))?.teacher_confirmed_at).toBeNull();
      expect(await audits(tx, s.lesson)).toHaveLength(0);
    });
  });

  test('a started lesson → started; a cancelled one → closed', async () => {
    await rolledBack(async (tx) => {
      const s = await seed(tx);
      await tx`update public.lessons set starts_at = now() - interval '10 minutes',
        ends_at = now() + interval '35 minutes' where id = ${s.lesson}`;
      expect(await confirm(tx, s)).toBe('started');
      await tx`update public.lessons set status = 'cancelled_by_admin' where id = ${s.lesson}`;
      expect(await confirm(tx, s)).toBe('closed');
      expect((await lessonOf(tx, s.lesson))?.teacher_confirmed_at).toBeNull();
    });
  });

  test('ok: teacher_confirmed_at/by set, status unchanged, one audit row (idempotent)', async () => {
    await rolledBack(async (tx) => {
      const s = await seed(tx);
      expect(await confirm(tx, s)).toBe('ok');
      expect(await confirm(tx, s)).toBe('ok');
      const row = await lessonOf(tx, s.lesson);
      expect(row?.status).toBe('scheduled');
      expect(row?.teacher_confirmed_at).not.toBeNull();
      expect(row?.teacher_confirmed_by).toBe(s.teacher.profile_id);
      expect(await audits(tx, s.lesson)).toHaveLength(1);
    });
  });

  test('edit_lesson_time with a new start clears teacher_confirmed_at/by; a resize in place keeps it', async () => {
    await rolledBack(async (tx) => {
      const s = await seed(tx);
      expect(await confirm(tx, s)).toBe('ok');
      await edit(tx, { s, status: 'scheduled', from: BASE, to: BASE, durationMin: 60 });
      expect((await lessonOf(tx, s.lesson))?.teacher_confirmed_at).not.toBeNull();
      await tx`update public.lessons set ends_at = starts_at + interval '45 minutes' where id = ${s.lesson}`;
      await edit(tx, { s, status: 'scheduled', from: BASE, to: BASE + 24 * HOUR });
      const row = await lessonOf(tx, s.lesson);
      expect(row?.teacher_confirmed_at).toBeNull();
      expect(row?.teacher_confirmed_by).toBeNull();
    });
  });
});
