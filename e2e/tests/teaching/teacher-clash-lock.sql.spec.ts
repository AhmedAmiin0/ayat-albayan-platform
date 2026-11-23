import { expect, test } from '@playwright/test';
import { withSql } from '../../support/core/schedule';
import { BASE, edit, HOUR, iso, MIN, rolledBack, seed } from '../../support/edit-time';
import {
  addLesson, bookSlot, dropRules, e2eTeacher, failure, FAR, gate, outcome, slotBooking, waitForLock,
} from '../../support/teaching/teacher-clash';

// Migration 20261123000200 (audit BE-03, R-SCH-04/07/11): the booking and lesson-move RPCs lock
// the teacher and re-read the slot, so two writes that both passed the API's clash read cannot
// both land. The race uses two real sessions (committed, deleted at the end); the rest roll back.

test.describe('teacher clash lock', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'database only: one run'));

  test('two concurrent create_booking calls for one teacher slot: one booked, one teacher_clash', async () => {
    await withSql(async (a) => withSql(async (b) => withSql(async (watch) => {
      const t = await e2eTeacher(a);
      const [me] = await b<{ pid: number }[]>`select pg_backend_pid() as pid`;
      const booked = gate();
      const release = gate();
      const rules: string[] = [];
      try {
        const first = a.begin(async (tx) => {
          rules.push((await bookSlot(tx, t, slotBooking(t, FAR))).rule_id);
          booked.open();
          await release.wait;
        });
        await booked.wait;
        const second = b.begin((tx) => bookSlot(tx, t, slotBooking(t, FAR + 15 * MIN)))
          .then((r) => rules.push(r.rule_id)).then(() => 'ok', failure);
        await waitForLock(watch, me?.pid ?? 0);
        release.open();
        await first;
        expect(await second).toBe('P0001 teacher_clash');
      } finally {
        await dropRules(a, rules);
      }
    })));
  });

  test('a booking over a taken slot is refused unless it carries override_reason', async () => {
    await rolledBack(async (tx) => {
      const t = await e2eTeacher(tx);
      await bookSlot(tx, t, slotBooking(t, FAR));
      expect(await outcome(tx, (sp) => bookSlot(sp, t, slotBooking(t, FAR + 30 * MIN)))).toBe('P0001 teacher_clash');
      expect(await outcome(tx, (sp) => bookSlot(sp, t, slotBooking(t, FAR + 45 * MIN)))).toBe('ok');
      expect(await outcome(tx, (sp) => bookSlot(sp, t, slotBooking(t, FAR, 'حلقة مزدوجة بموافقة الإدارة')))).toBe('ok');
    });
  });

  test('the same client_request_id again replays its booking, never teacher_clash', async () => {
    await rolledBack(async (tx) => {
      const t = await e2eTeacher(tx);
      const payload = slotBooking(t, FAR);
      const first = await bookSlot(tx, t, payload);
      expect((await bookSlot(tx, t, payload)).rule_id).toBe(first.rule_id);
    });
  });

  test('edit_lesson_time onto a taken slot raises teacher_clash, an old override_reason does not count', async () => {
    await rolledBack(async (tx) => {
      const s = await seed(tx);
      await bookSlot(tx, s.teacher, slotBooking(s.teacher, FAR));
      const move = { s, status: 'scheduled', from: BASE, to: FAR + 10 * MIN };
      expect(await outcome(tx, (sp) => edit(sp, move))).toBe('P0001 teacher_clash');
      await tx`update public.lessons set override_reason = 'قديم' where id = ${s.lesson}`;
      expect(await outcome(tx, (sp) => edit(sp, move))).toBe('P0001 teacher_clash');
      await edit(tx, { ...move, to: FAR + 24 * HOUR });
      const [row] = await tx<{ starts_at: Date }[]>`select starts_at from public.lessons where id = ${s.lesson}`;
      expect(row?.starts_at.toISOString()).toBe(iso(FAR + 24 * HOUR));
    });
  });

  test('apply_lesson_changes: a new lesson on a taken slot is refused; a move onto its own old slot is not', async () => {
    await rolledBack(async (tx) => {
      const t = await e2eTeacher(tx);
      const booked = await bookSlot(tx, t, slotBooking(t, FAR));
      expect(await outcome(tx, (sp) => addLesson(sp, t, { at: FAR + 20 * MIN }))).toBe('P0001 teacher_clash');
      const from = booked.lessons[0]?.id ?? '';
      expect(await outcome(tx, (sp) => addLesson(sp, t, { at: FAR + 20 * MIN, from }))).toBe('ok');
    });
  });

  test('apply_lesson_changes with only changes still takes the teacher lock before its row locks', async () => {
    await rolledBack(async (tx) => {
      const s = await seed(tx);
      const p = {
        actor: s.teacher.profile_id,
        changes: [{ id: s.lesson, from_status: 'scheduled', to_status: 'rescheduled', chargeable: false }],
      };
      await tx`select public.apply_lesson_changes(${tx.json(p)})`;
      const key = `teacher:${s.teacher.id}`;
      const [held] = await tx<{ held: boolean }[]>`select exists (select 1 from pg_locks
        where pid = pg_backend_pid() and locktype = 'advisory' and granted and objsubid = 1
          and ((classid::bigint << 32) | objid::bigint) = hashtextextended(${key}, 0)) as held`;
      expect(held?.held).toBe(true);
    });
  });
});
