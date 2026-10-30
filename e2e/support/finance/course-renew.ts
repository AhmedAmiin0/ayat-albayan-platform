import { withSql } from '../schedule';

// Helpers of e2e/tests/assistant-course-renew.api.spec.ts (owner 2026-10-18: «تابِع بنفس الأيام»,
// «تغيير أيام الحلقات»).

/** A renewal of the student's plan (8 lessons, 2 a week), unpaid, starting today: the newest subscription. */
export async function renewal(studentId: string): Promise<string> {
  const [row] = await withSql((sql) => sql<{ id: string }[]>`insert into public.subscriptions
      (student_id, duration, lessons_total, price, price_source, starts_on, package, status)
    values (${studentId}, 45, 8, 0, '{}'::jsonb, current_date, '8', 'unpaid') returning id`);
  if (!row) throw new Error('renewal not written');
  return row.id;
}

/** The course's lessons that take a place (the balance views' rule): chargeable, not cancelled nor moved. */
export async function countedLessons(subscriptionId: string): Promise<number> {
  const [row] = await withSql((sql) => sql<{ n: number }[]>`select count(*)::int as n
    from public.lessons l join public.lesson_students ls on ls.lesson_id = l.id
    join public.schedule_rules r on r.id = l.rule_id
    where r.subscription_id = ${subscriptionId} and ls.chargeable
      and l.status in ('scheduled', 'confirmed', 'completed', 'late', 'no_show', 'excused')`);
  return row?.n ?? 0;
}

type CourseRuleFacts = { start: string; byday: number[]; ends_on: string; status: string; created_by: string | null };

/** The rules of a course, oldest first. */
export async function courseRules(subscriptionId: string): Promise<CourseRuleFacts[]> {
  return withSql((sql) => sql<CourseRuleFacts[]>`select to_char(start_time_local, 'HH24:MI') as start, byday,
      ends_on::text as ends_on, status::text as status, created_by
    from public.schedule_rules where subscription_id = ${subscriptionId} order by created_at, start_time_local`);
}

/** The audit rows naming the course (its subscription). */
export async function courseAudit(subscriptionId: string): Promise<{ action: string; actor_id: string | null; by: string | null }[]> {
  return withSql((sql) => sql<{ action: string; actor_id: string | null; by: string | null }[]>`
    select action, actor_id, after ->> 'by' as by from public.audit_log
    where (entity = 'subscriptions' and entity_id = ${subscriptionId}) or after ->> 'subscription_id' = ${subscriptionId}::text
    order by at`);
}
