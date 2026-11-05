import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { dbError } from '@/common/http/http';
import { COURSE_DUE_LOOKBACK_MS, dueActivations, legacyStudents } from './course-due.rules';

/** A paid package with no weekly course, and whom it concerns. */
export interface UnbookedPackage {
  subscriptionId: string;
  studentId: string;
  student: string;
  /** The family's number (the web opens its chat), when known. */
  phone: string | null;
  /** Who sold it (subscriptions.created_by): the package's assistant. */
  soldBy: string | null;
}

/** The package with its course rules (any status) and the student's name and family number. */
const PACKAGE_SELECT =
  'id, student_id, created_by, rules:schedule_rules(id), student:students(name, guardian:guardians(phone_e164))' as const;

interface PackageRow {
  id: string;
  student_id: string;
  created_by: string | null;
  rules: { id: string }[];
  student: { name: string; guardian: { phone_e164: string } | null } | null;
}

const toUnbooked = (r: PackageRow): UnbookedPackage => ({
  subscriptionId: r.id,
  studentId: r.student_id,
  student: r.student?.name ?? '',
  phone: r.student?.guardian?.phone_e164 ?? null,
  soldBy: r.created_by,
});

const unbooked = (rows: readonly PackageRow[]): UnbookedPackage[] =>
  rows.filter((r) => r.rules.length === 0).map(toUnbooked);

/**
 * The reads of «احجز أيام الحلقات» (owner 2026-11-06; service role, never a write): a package's
 * course (any schedule_rules row with its subscription_id, as SalesCourseRepo.subscriptionBooked)
 * and the active packages still without one.
 */
@Injectable()
export class CourseDueRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** The package when it has no weekly course yet; null when booked or unknown. */
  async unbooked(subscriptionId: string): Promise<UnbookedPackage | null> {
    const { data, error } = await this.db
      .from('subscriptions')
      .select(PACKAGE_SELECT)
      .eq('id', subscriptionId)
      .maybeSingle();
    if (error) throw dbError(error);
    return unbooked(data ? [data] : [])[0] ?? null;
  }

  /**
   * The ACTIVE packages that became active (audit_log status_change → active) in the last week
   * and at least 2 hours ago, with no course of their own, minus students on an imported weekly
   * course still running (legacyStudents).
   */
  async overdue(now: Date): Promise<UnbookedPackage[]> {
    const ids = dueActivations(await this.activations(now), now);
    if (ids.length === 0) return [];
    const { data, error } = await this.db
      .from('subscriptions')
      .select(PACKAGE_SELECT)
      .in('id', ids)
      .eq('status', 'active');
    if (error) throw dbError(error);
    const due = unbooked(data);
    const legacy = await this.legacy(due.map((p) => p.studentId), now);
    return due.filter((p) => !legacy.has(p.studentId));
  }

  private async activations(now: Date): Promise<{ entity_id: string; at: string }[]> {
    const { data, error } = await this.db
      .from('audit_log')
      .select('entity_id, at')
      .eq('entity', 'subscriptions')
      .eq('action', 'status_change')
      .eq('after->>status', 'active')
      .gte('at', new Date(now.getTime() - COURSE_DUE_LOOKBACK_MS).toISOString());
    if (error) throw dbError(error);
    return data;
  }

  /** The students among `studentIds` with an imported weekly course still running. */
  private async legacy(studentIds: readonly string[], now: Date): Promise<Set<string>> {
    if (studentIds.length === 0) return new Set();
    const { data, error } = await this.db
      .from('schedule_rule_students')
      .select('student_id, rule:schedule_rules!inner(starts_on, ends_on, package, status, subscription_id)')
      .in('student_id', [...studentIds])
      .eq('rule.status', 'active')
      .is('rule.subscription_id', null);
    if (error) throw dbError(error);
    const rules = data.map(({ student_id, rule }) => ({ student_id, ...rule }));
    return legacyStudents(rules, now.toISOString().slice(0, 10));
  }
}
