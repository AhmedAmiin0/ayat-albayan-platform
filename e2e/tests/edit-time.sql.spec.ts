import { expect, test } from '@playwright/test';
import { BASE, edit, HOUR, iso, MIN, rolledBack, seed } from '../support/edit-time';

// edit_lesson_time (migration 174, «عدّل الوقت» R-SCH-11) against the real database, in a
// transaction that is rolled back. The payloads have the shape the API's LessonTimeService builds.

test.describe('edit_lesson_time (R-SCH-11)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'database only: one run'));

  test('a stale `from` raises stale_time and changes nothing', async () => {
    await rolledBack(async (tx) => {
      const s = await seed(tx);
      await expect(edit(tx, { s, status: 'scheduled', from: BASE + MIN, to: BASE + 24 * HOUR })).rejects.toThrow('stale_time');
    });
  });

  test('moving a generated lesson to another day: its old date is never regenerated', async () => {
    await rolledBack(async (tx) => {
      const s = await seed(tx);
      await edit(tx, { s, status: 'scheduled', from: BASE, to: BASE + 24 * HOUR });
      const [row] = await tx<{ starts_at: Date; time_edit_was: { starts_at: string } }[]>`
        select starts_at, time_edit_was from public.lessons where id = ${s.lesson}`;
      expect(row?.starts_at.toISOString()).toBe(iso(BASE + 24 * HOUR));
      expect(row?.time_edit_was.starts_at).toBe(iso(BASE));
      const again = await tx`select id from public.generate_rule_lessons(
        ${s.rule}, ${tx.json([{ starts_at: iso(BASE), ends_at: iso(BASE + 45 * MIN) }])}, null)`;
      expect(again).toHaveLength(0);
    });
  });

  test('retime_open: queued old-time messages expire, reminder and push keys are freed, the new notice is queued', async () => {
    await rolledBack(async (tx) => {
      const s = await seed(tx);
      const key = (k: string) => `${k}:${s.lesson}:${s.guardian}`;
      for (const [k, status] of [['lesson_reminder', 'queued'], ['booking_confirmation', 'sent']] as const) {
        await tx`insert into public.messages (direction, phone_e164, guardian_id, lesson_id, template_key, template_params, status, dedup_key)
          values ('outbound', '+966500000997', ${s.guardian}, ${s.lesson}, ${k}, '{}', ${status}, ${key(k)})`;
      }
      const notice = {
        phone_e164: '+966500000997', guardian_id: s.guardian, lesson_id: s.lesson,
        template_key: 'booking_confirmation', template_params: {}, dedup_key: `${key('booking_confirmation')}:${BASE + 24 * HOUR}`,
      };
      await edit(tx, { s, status: 'scheduled', from: BASE, to: BASE + 24 * HOUR, flags: { retime_open: true }, messages: [notice] });
      const rows = await tx<{ dedup_key: string; expires_at: Date | null }[]>`
        select dedup_key, expires_at from public.messages where lesson_id = ${s.lesson}`;
      const old = rows.filter((r) => r.dedup_key.includes(':old:'));
      expect(old).toHaveLength(2);
      expect(old.find((r) => r.dedup_key.startsWith('lesson_reminder'))?.expires_at).not.toBeNull();
      const fresh = rows.find((r) => r.dedup_key === notice.dedup_key);
      expect(fresh?.expires_at).toBeNull();
      // the keys the jobs use are free again
      expect(rows.some((r) => r.dedup_key === key('lesson_reminder'))).toBe(false);
    });
  });

  test('a confirmed lesson that moves goes back to scheduled; a resize in place stays confirmed', async () => {
    await rolledBack(async (tx) => {
      const s = await seed(tx);
      await tx`update public.lessons set status = 'confirmed', confirmed_at = now() where id = ${s.lesson}`;
      await edit(tx, { s, status: 'confirmed', from: BASE, to: BASE, durationMin: 60 });
      const [kept] = await tx<{ status: string }[]>`select status from public.lessons where id = ${s.lesson}`;
      expect(kept?.status).toBe('confirmed');
      await tx`update public.lessons set ends_at = ${iso(BASE + 45 * MIN)} where id = ${s.lesson}`;
      await edit(tx, { s, status: 'confirmed', from: BASE, to: BASE + 24 * HOUR });
      const [moved] = await tx<{ status: string; confirmed_at: Date | null }[]>`
        select status, confirmed_at from public.lessons where id = ${s.lesson}`;
      expect(moved).toMatchObject({ status: 'scheduled', confirmed_at: null });
    });
  });

  test('refresh_pdf: a ready report of a held lesson goes back to pending, an audit row is written', async () => {
    await rolledBack(async (tx) => {
      const s = await seed(tx);
      await tx`update public.lessons set status = 'completed' where id = ${s.lesson}`;
      await tx`insert into public.lesson_reports (lesson_id, student_id, teacher_id, attendance, status, version, submitted_at, pdf_status)
        values (${s.lesson}, ${s.student}, ${s.teacher.id}, 'on_time', 'submitted', 1, now(), 'ready')`;
      await edit(tx, { s, status: 'completed', from: BASE, to: BASE, durationMin: 60, flags: { refresh_pdf: true } });
      const [report] = await tx<{ pdf_status: string }[]>`select pdf_status from public.lesson_reports where lesson_id = ${s.lesson}`;
      expect(report?.pdf_status).toBe('pending');
      const audits = await tx`select id from public.audit_log where entity_id = ${s.lesson} and action = 'time_edit'`;
      expect(audits).toHaveLength(1);
    });
  });

  test('a pending proposal for exactly the new start is approved; another stays pending', async () => {
    await rolledBack(async (tx) => {
      const s = await seed(tx);
      const [match] = await tx<{ id: string }[]>`insert into public.lesson_proposals (lesson_id, teacher_id, proposed_starts_at)
        values (${s.lesson}, ${s.teacher.id}, ${iso(BASE + 24 * HOUR)}) returning id`;
      await edit(tx, { s, status: 'scheduled', from: BASE, to: BASE + 24 * HOUR });
      const [row] = await tx<{ status: string; new_lesson_id: string }[]>`
        select status, new_lesson_id from public.lesson_proposals where id = ${match?.id ?? ''}`;
      expect(row).toMatchObject({ status: 'approved', new_lesson_id: s.lesson });
      const [other] = await tx<{ id: string }[]>`insert into public.lesson_proposals (lesson_id, teacher_id, proposed_starts_at)
        values (${s.lesson}, ${s.teacher.id}, ${iso(BASE + 72 * HOUR)}) returning id`;
      await edit(tx, { s, status: 'scheduled', from: BASE + 24 * HOUR, to: BASE + 48 * HOUR });
      const [left] = await tx<{ status: string }[]>`select status from public.lesson_proposals where id = ${other?.id ?? ''}`;
      expect(left?.status).toBe('pending');
    });
  });
});
