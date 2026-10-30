import { expect, test } from '@playwright/test';
import { begin, codeOf, day, generate, groupOf, lessonsOf, pauseOf, resume, seedPause, setUntil, start, statuses } from '../../support/finance/course-pause';
import { rolledBack } from '../../support/teaching/edit-time';

// «إيقاف الدورة مؤقتًا» (owner 2026-10-28, migrations 20261028000955–957, docs/11 §7b) against the real database,
// rolled back. The student is alone on a daily rule (days 1–10) and shares a group rule (days 2 and 4).

test.describe('course pause RPCs (docs/11 §7b)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'database only: one run'));

  test('a pause cancels only the window\'s open lessons, by the academy, not chargeable, and drops their queued reminders', async () => {
    await rolledBack(async (tx) => {
      const s = await seedPause(tx);
      const [l3] = await tx<{ id: string; guardian_id: string }[]>`select l.id, st.guardian_id from public.lessons l, public.students st
        where l.rule_id = ${s.solo} and st.id = ${s.student} and (l.starts_at at time zone 'Asia/Riyadh')::date = ${day(s.today, 3)}::date`;
      await tx`insert into public.messages (direction, phone_e164, body, status, guardian_id, lesson_id)
        values ('outbound', '+966500000001', 'تذكير', 'queued', ${l3?.guardian_id ?? ''}, ${l3?.id ?? ''})`;
      const out = await start(tx, pauseOf(s, 3, 5));
      expect((out['cancelled'] as string[]).length).toBe(3);
      const rows = await lessonsOf(tx, { rule: s.solo, student: s.student });
      const cancelled = rows.filter((r) => r.status === 'cancelled_by_admin');
      expect(cancelled.map((r) => r.day)).toEqual([3, 4, 5]);
      expect(cancelled.every((r) => r.cancel_reason === 'إيقاف مؤقت' && r.chargeable === false)).toBe(true);
      expect(rows.filter((r) => r.status === 'scheduled').map((r) => r.day)).toEqual([1, 2, 6, 7, 8, 9, 10]);
      const [queued] = await tx<{ n: number }[]>`select count(*)::int as n from public.messages where lesson_id = ${l3?.id ?? ''}`;
      expect(queued?.n).toBe(0);
      const [used] = await tx<{ n: number }[]>`select count(*)::int as n from public.v_package_lessons where student_id = ${s.student}`;
      expect(used?.n).toBe(0);
    });
  });

  test('a pause from a later day waits for its from day: statuses kept, no lesson booked for nobody; begin pauses them', async () => {
    await rolledBack(async (tx) => {
      const s = await seedPause(tx);
      const { id, started } = (await start(tx, pauseOf(s, 3, 5))) as { id: string; started: boolean };
      expect(started).toBe(false);
      expect(await statuses(tx, s)).toMatchObject({ student: 'active', sub: 'active', rule: 'active' });
      // The solo rule is still active: an occurrence inside the window (the only student paused) makes no row.
      expect(await generate(tx, { rule: s.solo, today: s.today, days: [4, 12], hourZ: 16 })).toHaveLength(1);
      expect((await begin(tx, id))['started']).toBe(true);
      expect(await statuses(tx, s)).toMatchObject({ student: 'paused', sub: 'paused', rule: 'paused' });
      expect((await begin(tx, id))['started']).toBe(false);
      const from = await tx<{ id: string }[]>`select id from public.course_pauses where student_id = ${s.student} and started_at is not null`;
      expect(from).toHaveLength(1);
      const today = await start(tx, { ...pauseOf(s, 0, null), student_id: s.other });
      expect(today['started']).toBe(true);
    });
  });

  test('a group lesson keeps the other student; only this student leaves it', async () => {
    await rolledBack(async (tx) => {
      const s = await seedPause(tx);
      await start(tx, pauseOf(s, 3, 5));
      const group = await groupOf(tx, s.group);
      expect(group.find((g) => g.day === 4)?.students).toEqual([s.other]);
      expect(group.find((g) => g.day === 2)?.students.sort()).toEqual([s.student, s.other].sort());
      const [shared] = await tx<{ status: string }[]>`select status::text from public.schedule_rules where id = ${s.group}`;
      expect(shared?.status).toBe('active');
    });
  });

  test('generation skips: the paused rule refuses, the group rule books without the paused student', async () => {
    await rolledBack(async (tx) => {
      const s = await seedPause(tx);
      const { id } = (await start(tx, pauseOf(s, 3, 5))) as { id: string };
      await begin(tx, id);
      expect(await codeOf(tx, (sp) => generate(sp, { rule: s.solo, today: s.today, days: [12] }))).toBe('rule_not_active');
      await generate(tx, { rule: s.group, today: s.today, days: [5, 7], hourZ: 10 });
      const group = await groupOf(tx, s.group);
      expect(group.find((g) => g.day === 5)?.students).toEqual([s.other]);
      expect(group.find((g) => g.day === 7)?.students.sort()).toEqual([s.student, s.other].sort());
    });
  });

  test('a second open pause is refused; a past start too', async () => {
    await rolledBack(async (tx) => {
      const s = await seedPause(tx);
      expect(await codeOf(tx, (sp) => start(sp, pauseOf(s, -1, null)))).toBe('date_in_past');
      await start(tx, pauseOf(s, 3, null));
      expect(await codeOf(tx, (sp) => start(sp, pauseOf(s, 4, null)))).toBe('already_paused');
    });
  });

  test('an early resume books the rest back, rejoins the group, moves the dates by the paused days once', async () => {
    await rolledBack(async (tx) => {
      const s = await seedPause(tx);
      const { id } = (await start(tx, pauseOf(s, 3, 5))) as { id: string };
      await begin(tx, id);
      await generate(tx, { rule: s.group, today: s.today, days: [5], hourZ: 10 });
      const out = await resume(tx, { pause_id: id, actor: s.actor, on: day(s.today, 4) });
      expect([out['resumed'], out['days']]).toEqual([true, 1]);
      const rows = await lessonsOf(tx, { rule: s.solo, student: s.student });
      expect(rows.filter((r) => r.status === 'cancelled_by_admin').map((r) => r.day)).toEqual([3]);
      expect(rows.find((r) => r.day === 4)).toMatchObject({ status: 'scheduled', cancel_reason: null, chargeable: true });
      const group = await groupOf(tx, s.group);
      for (const d of [4, 5]) expect(group.find((g) => g.day === d)?.students.sort()).toEqual([s.student, s.other].sort());
      expect(await statuses(tx, s)).toEqual({ student: 'active', sub: 'unpaid', renews: day(s.today, 31), rule: 'active', ends: day(s.today, 31) });
    });
  });

  test('extending a pause cancels the new days; shortening books them back', async () => {
    await rolledBack(async (tx) => {
      const s = await seedPause(tx);
      const { id } = (await start(tx, pauseOf(s, 3, 4))) as { id: string };
      await setUntil(tx, { pause_id: id, until_date: day(s.today, 7), actor: s.actor });
      const cancelledDays = async () => (await lessonsOf(tx, { rule: s.solo, student: s.student })).filter((r) => r.status === 'cancelled_by_admin').map((r) => r.day);
      expect(await cancelledDays()).toEqual([3, 4, 5, 6, 7]);
      await setUntil(tx, { pause_id: id, until_date: day(s.today, 5), actor: s.actor });
      expect(await cancelledDays()).toEqual([3, 4, 5]);
    });
  });

  test('the automatic resume is idempotent: the dates move exactly once', async () => {
    await rolledBack(async (tx) => {
      const s = await seedPause(tx);
      const { id } = (await start(tx, pauseOf(s, 3, 5))) as { id: string };
      await begin(tx, id);
      // As if the pause ran from 10 days ago to 3 days ago and the job wakes today: resume day = until + 1.
      await tx`update public.course_pauses set from_date = ${day(s.today, -10)}, until_date = ${day(s.today, -3)} where id = ${id}`;
      await tx`update public.subscriptions set starts_on = ${day(s.today, -20)} where id = ${s.sub}`;
      const first = await resume(tx, { pause_id: id, actor: null });
      const second = await resume(tx, { pause_id: id, actor: null });
      expect([first['resumed'], first['days'], second['resumed'], second['days']]).toEqual([true, 8, false, 8]);
      // The package (started before the pause) moves by the 8 days; the rule starts after the resume day: its end stays.
      expect(await statuses(tx, s)).toMatchObject({ renews: day(s.today, 38), ends: day(s.today, 30), rule: 'active' });
      const [row] = await tx<{ n: number }[]>`select count(*)::int as n from public.course_pauses where student_id = ${s.student} and resumed_at is null`;
      expect(row?.n).toBe(0);
    });
  });

  test('RLS is on and no client may write; anon reads nothing', async () => {
    await rolledBack(async (tx) => {
      const rows = await tx<{ t: string; rls: boolean; anon: boolean; ins: boolean }[]>`
        select c.relname as t, c.relrowsecurity as rls, has_table_privilege('anon', c.oid, 'select') as anon,
               has_table_privilege('authenticated', c.oid, 'insert') as ins
        from pg_class c where c.relname in ('course_pauses', 'course_pause_lessons') order by c.relname`;
      expect(rows).toEqual([
        { t: 'course_pause_lessons', rls: true, anon: false, ins: false },
        { t: 'course_pauses', rls: true, anon: false, ins: false },
      ]);
    });
  });
});
