import type { LessonStatus } from '@ab/shared';
import type { Db } from '../../common/db/db.module';
import { dbError } from '../../common/http/http';
import { ownershipOf, type SalesOwnership } from './sales-ownership';

/** Lessons that are still to come or were held; cancelled / rescheduled / no-show ones are not meetings. */
export const MEETING_STATUSES: readonly LessonStatus[] = ['scheduled', 'confirmed', 'completed', 'late'];

export interface SalesLessonRow {
  id: string;
  starts_at: string;
  ends_at: string;
  /** «افتح الحلقة الآن» (migration 190): widens joinable_window. */
  room_opened_at?: string | null;
  status: LessonStatus;
  teacher: { display_name_ar: string } | null;
  rule: { created_from_lead_id: string | null; package: string | null; lead: { name: string | null } | null } | null;
  lesson_students: { student_id: string; student: { name: string } | null }[];
}

const RULE = 'rule:schedule_rules!lessons_rule_id_fkey(created_from_lead_id, package, lead:leads!schedule_rules_created_from_lead_id_fkey(name))';
const select = (inner: boolean) =>
  `id, starts_at, ends_at, room_opened_at, status, teacher:teachers(display_name_ar), ${RULE}, lesson_students${inner ? '!inner' : ''}(student_id, student:students(name))`;

/**
 * THE rule of the sales scope, for the meetings list and the classroom alike: a lesson is theirs when
 * it was booked from one of their leads (the rule's created_from_lead_id), or is a trial lesson of
 * one of their students.
 */
export function inSalesScope(row: SalesLessonRow, own: SalesOwnership): boolean {
  const leadId = row.rule?.created_from_lead_id;
  if (leadId && own.leadIds.includes(leadId)) return true;
  return row.rule?.package === 'trial' && row.lesson_students.some((s) => own.studentIds.includes(s.student_id));
}

type Range = { from: string; to: string };
/** Their meetings starting in [from, to], by start time. */
export async function salesLessonsBetween(db: Db, input: { own: SalesOwnership } & Range): Promise<SalesLessonRow[]> {
  const [booked, trials] = await Promise.all([bookedFromLeads(db, input), trialsOfStudents(db, input)]);
  const byId = new Map([...booked, ...trials].map((r) => [r.id, r]));
  return [...byId.values()].filter((r) => inSalesScope(r, input.own)).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
}

async function bookedFromLeads(db: Db, input: { own: SalesOwnership } & Range): Promise<SalesLessonRow[]> {
  if (input.own.leadIds.length === 0) return [];
  const rules = await db.from('schedule_rules').select('id').in('created_from_lead_id', input.own.leadIds);
  if (rules.error) throw dbError(rules.error);
  if (rules.data.length === 0) return [];
  const { data, error } = await db
    .from('lessons')
    .select(select(false))
    .in('rule_id', rules.data.map((r) => r.id))
    .gte('starts_at', input.from)
    .lte('starts_at', input.to)
    .in('status', [...MEETING_STATUSES])
    .overrideTypes<SalesLessonRow[], { merge: false }>();
  if (error) throw dbError(error);
  return data;
}

async function trialsOfStudents(db: Db, input: { own: SalesOwnership } & Range): Promise<SalesLessonRow[]> {
  if (input.own.studentIds.length === 0) return [];
  const { data, error } = await db
    .from('lessons')
    .select(select(true))
    .in('lesson_students.student_id', input.own.studentIds)
    .gte('starts_at', input.from)
    .lte('starts_at', input.to)
    .in('status', [...MEETING_STATUSES])
    .overrideTypes<SalesLessonRow[], { merge: false }>();
  if (error) throw dbError(error);
  return data;
}

/** Is this lesson one of the salesperson's (room join)? Same rule as the list; any status. */
export async function isSalesLesson(db: Db, input: { profileId: string; lessonId: string }): Promise<boolean> {
  const { data, error } = await db
    .from('lessons')
    .select(select(false))
    .eq('id', input.lessonId)
    .maybeSingle<SalesLessonRow>();
  if (error) throw dbError(error);
  return data !== null && inSalesScope(data, await ownershipOf(db, input.profileId));
}
