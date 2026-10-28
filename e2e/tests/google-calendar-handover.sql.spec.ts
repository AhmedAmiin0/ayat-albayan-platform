import { expect, test } from '@playwright/test';
import { as, rolledBack, userId, type Tx } from '../support/rls';
import { USERS } from '../support/users';

// Migration 20261028000943 (docs/24 §7) against the real database, rolled back: teachers.calendar_owner,
// the calendar-managed predicate, the switch's producer, the admin-only guard and the audit row.

async function seed(tx: Tx) {
  const [t] = await tx<{ id: string }[]>`select t.id from public.teachers t join auth.users u on u.id = t.profile_id where u.email = ${USERS.teacher.email}`;
  if (!t) throw new Error('e2e teacher missing');
  const [run] = await tx<{ id: string }[]>`insert into public.import_runs (target) values ('local') returning id`;
  const [rule] = await tx<{ id: string }[]>`insert into public.schedule_rules (teacher_id, duration_min, start_time_local, tz, byday, starts_on)
    values (${t.id}, 45, '17:00', 'Asia/Riyadh', '{0}', current_date) returning id`;
  await tx`insert into public.import_items (entity, natural_key, target_table, target_id, payload_hash, first_run_id, last_run_id)
    values ('schedule_rules', ${`e2e:${rule?.id ?? ''}`}, 'schedule_rules', ${rule?.id ?? ''}, 'h', ${run?.id ?? ''}, ${run?.id ?? ''})`;
  const [l] = await tx<{ id: string }[]>`insert into public.lessons (rule_id, teacher_id, starts_at, ends_at)
    values (${rule?.id ?? ''}, ${t.id}, now() + interval '2 days', now() + interval '2 days 45 minutes') returning id`;
  await tx`insert into public.settings (key, value) values ('google_sync_enabled', 'true') on conflict (key) do update set value = 'true'`;
  return { teacherId: t.id, lessonId: l?.id ?? '' };
}
const items = (tx: Tx, id: string) => tx<{ kind: string; state: string }[]>`
  select kind, state from public.google_sync_items where subject_id = ${id} order by kind`;
const owner = async (tx: Tx, id: string) => (await tx<{ calendar_owner: string }[]>`select calendar_owner from public.teachers where id = ${id}`)[0]?.calendar_owner;

test.describe('Google calendar handover (migration 20261028000942)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'database only: one run'));

  test("'script' by default: an imported lesson is not queued; «من المنصة» queues it, stamped and audited", async () => {
    await rolledBack(async (tx) => {
      const s = await seed(tx);
      expect(await owner(tx, s.teacherId)).toBe('script');
      expect(await items(tx, s.lessonId)).toEqual([]);
      expect(await tx`select id from public.v_calendar_managed_lessons where id = ${s.lessonId}`).toEqual([]);
      await tx`update public.teachers set calendar_owner = 'platform' where id = ${s.teacherId}`;
      expect(await items(tx, s.lessonId)).toEqual([{ kind: 'teacher_event', state: 'pending' }, { kind: 'main_event', state: 'pending' }]);
      expect(await tx`select platform_origin from public.v_calendar_managed_lessons where id = ${s.lessonId}`).toEqual([{ platform_origin: false }]);
      const [t] = await tx<{ at: Date | null }[]>`select calendar_owner_changed_at as at from public.teachers where id = ${s.teacherId}`;
      expect(t?.at).toBeTruthy();
      const audit = await tx`select after from public.audit_log where entity = 'teachers' and entity_id = ${s.teacherId} and action = 'calendar_owner'`;
      expect(audit).toEqual([{ after: { calendar_owner: 'platform' } }]);
    });
  });

  test('back to «من الشيت»: only lessons with one of our events are queued again (to drop them)', async () => {
    await rolledBack(async (tx) => {
      const s = await seed(tx);
      await tx`update public.teachers set calendar_owner = 'platform' where id = ${s.teacherId}`;
      await tx`update public.google_sync_items set state = 'synced', google_id = 'ev-ours' where subject_id = ${s.lessonId} and kind = 'teacher_event'`;
      await tx`update public.google_sync_items set state = 'skipped', skip_reason = 'script_event_present' where subject_id = ${s.lessonId} and kind = 'main_event'`;
      await tx`update public.teachers set calendar_owner = 'script' where id = ${s.teacherId}`;
      expect(await items(tx, s.lessonId)).toEqual([{ kind: 'teacher_event', state: 'pending' }, { kind: 'main_event', state: 'pending' }]);
      const [c] = await tx<{ managed: number; script_event_present: number }[]>`select * from public.google_teacher_calendar_counts(${s.teacherId})`;
      expect(c).toEqual({ managed: 0, script_event_present: 0 });
    });
  });

  test('only an admin changes the owner; the teacher cannot, and nobody writes a third value', async () => {
    await rolledBack(async (tx) => {
      const s = await seed(tx);
      const teacher = await userId(tx, USERS.teacher.email);
      const admin = await userId(tx, USERS.admin.email);
      await as(tx, teacher, () => tx`update public.teachers set calendar_owner = 'platform' where id = ${s.teacherId}`);
      expect(await owner(tx, s.teacherId)).toBe('script');
      await as(tx, admin, () => tx`update public.teachers set calendar_owner = 'platform' where id = ${s.teacherId}`);
      expect(await owner(tx, s.teacherId)).toBe('platform');
      const [by] = await tx<{ by: string }[]>`select calendar_owner_changed_by as by from public.teachers where id = ${s.teacherId}`;
      expect(by?.by).toBe(admin);
      const bad = await tx.savepoint(() => tx`update public.teachers set calendar_owner = 'both' where id = ${s.teacherId}`).then(() => 'ok', (e: { code?: string }) => e.code);
      expect(bad).toBe('23514');
    });
  });
});
