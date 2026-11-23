import { randomUUID } from 'node:crypto';
import type postgres from 'postgres';
import { USERS } from '../core/users';
import { BASE, iso, MIN, type Tx } from '../edit-time';

// Helpers of e2e/tests/teaching/teacher-clash-lock.sql.spec.ts (migration 20261123000200). The
// slots sit 300 days ahead at 03:07Z, far past every journey's booking horizon, so committed rows
// of the race test never meet another spec's lessons of the e2e teacher.

type Sql = ReturnType<typeof postgres>;
type Db = Sql | Tx;
export interface Teacher { id: string; profile_id: string }
export interface Failure { code?: string; message?: string }

export const FAR = Math.floor(BASE / 86_400_000) * 86_400_000 + 300 * 86_400_000 + 187 * MIN;

export async function e2eTeacher(db: Db): Promise<Teacher> {
  const [t] = await db<Teacher[]>`select t.id, t.profile_id from public.teachers t
    join auth.users u on u.id = t.profile_id where u.email = ${USERS.teacher.email}`;
  if (!t) throw new Error('e2e teacher missing (global setup)');
  return t;
}

/** A one-lesson booking of the teacher at `at` with no students and no messages. */
export function slotBooking(t: Teacher, at: number, overrideReason: string | null = null) {
  return {
    rule: {
      teacher_id: t.id, duration_min: 45, start_time_local: '06:07', tz: 'Asia/Riyadh',
      byday: [new Date(at).getUTCDay()], starts_on: iso(at).slice(0, 10), ends_on: null,
      meeting_link: null, package: null, client_request_id: randomUUID(),
    },
    student_ids: [],
    lead: null,
    new_guardian: null,
    new_student: null,
    lessons: [{
      starts_at: iso(at), ends_at: iso(at + 45 * MIN), meeting_link: null,
      override_reason: overrideReason,
    }],
    messages: [],
    makeup_of: null,
    invoice: null,
    audit: { after: { kind: 'teacher_clash_test' } },
  };
}

interface Booked { rule_id: string; lessons: { id: string }[] }

type Booking = ReturnType<typeof slotBooking>;

export async function bookSlot(db: Db, t: Teacher, payload: Booking): Promise<Booked> {
  const [row] = await db<{ r: Booked }[]>`select public.create_booking(${db.json(payload)},
    ${t.profile_id}) as r`;
  if (!row) throw new Error('create_booking returned nothing');
  return row.r;
}

export const failure = (e: Failure) => `${e.code ?? ''} ${e.message ?? ''}`;

/** The outcome of a write inside a savepoint: 'ok' or '<sqlstate> <message>'. */
export function outcome(tx: Tx, run: (sp: Tx) => Promise<unknown>): Promise<string> {
  return tx.savepoint((sp) => run(sp)).then(() => 'ok', failure);
}

/** apply_lesson_changes adding one lesson of the teacher (an optional reschedule of `from`). */
export function addLesson(sp: Tx, t: Teacher, move: { at: number; from?: string }) {
  const p = {
    actor: t.profile_id,
    changes: move.from
      ? [{ id: move.from, from_status: 'scheduled', to_status: 'rescheduled', chargeable: false }]
      : [],
    lessons: [{
      id: randomUUID(), rule_id: null, teacher_id: t.id, starts_at: iso(move.at),
      ends_at: iso(move.at + 45 * MIN), meeting_link: null, override_reason: null,
      rescheduled_from_id: move.from ?? null, student_ids: [],
    }],
  };
  return sp`select public.apply_lesson_changes(${sp.json(p)})`;
}

/** Deletes the committed bookings of the race test. */
export async function dropRules(sql: Sql, ruleIds: string[]): Promise<void> {
  if (ruleIds.length === 0) return;
  await sql`delete from public.lessons where rule_id in ${sql(ruleIds)}`;
  await sql`delete from public.schedule_rules where id in ${sql(ruleIds)}`;
}

/** Polls until the backend `pid` waits on an advisory lock (5 s at most). */
export async function waitForLock(watch: Sql, pid: number): Promise<void> {
  for (let i = 0; i < 200; i += 1) {
    const [w] = await watch<{ blocked: boolean }[]>`select exists (select 1 from pg_locks
      where pid = ${pid} and locktype = 'advisory' and not granted) as blocked`;
    if (w?.blocked) return;
    await new Promise((r) => setTimeout(r, 25));
  }
}

/** A promise and its resolver, to order two sessions. */
export function gate(): { wait: Promise<void>; open: () => void } {
  let open = (): void => undefined;
  const wait = new Promise<void>((resolve) => {
    open = resolve;
  });
  return { wait, open };
}
