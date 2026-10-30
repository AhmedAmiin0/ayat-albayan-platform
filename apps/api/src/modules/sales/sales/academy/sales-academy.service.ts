import type { AssistantLessonView, SalesStudentsQuery, SalesStudentView, SalesSubscriptionHistory } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { chatPhone } from '../../../../common/auth/chat-phone';
import type { AuthUser } from '../../../../common/auth/verify-token';
import { notFound } from '../../../../common/http/errors';
import type { Page } from '../../../../common/http/http';
import { toSalesLive, toSalesStudent } from './sales-academy.mapper';
import { SalesAcademyQueries } from './sales-academy.queries';
import { packageSummaries } from './sales-package.mapper';
import { packageStarts, rosterFrom, toRoster, type RosterFacts } from './sales-roster.mapper';
import { SalesRosterRepo } from './sales-roster.repo';
import { toSalesHistory } from '../history/sales-history.mapper';
import { SalesHistoryQueries } from '../history/sales-history.queries';
import { SalesQueries } from '../sales.queries';

/**
 * The salesperson's assistant side and a subscription's history (docs/16). Read-only. Students and
 * running lessons are the academy's (teachers and the schedule: SalesScheduleService); the history is
 * only for a subscription she made, by the SAME ownership rule as «الاشتراكات» (SalesService.subscriptions).
 */
@Injectable()
export class SalesAcademyService {
  constructor(
    private readonly academy: SalesAcademyQueries,
    private readonly histories: SalesHistoryQueries,
    private readonly sales: SalesQueries,
    private readonly roster: SalesRosterRepo,
  ) {}

  /**
   * Every student; `mine` on hers (the ownership of «الاشتراكات»): those rows open «تفاصيل الطالب»
   * (docs/16 row 36). Each row also carries its weekly slots, attendance count and current package
   * (owner 2026-10-30; no price), read for the whole page at once.
   */
  async students(
    q: SalesStudentsQuery,
    user: AuthUser,
    now = new Date(),
  ): Promise<Page<SalesStudentView>> {
    const [{ rows, total }, own] = await Promise.all([
      this.academy.students(q),
      this.ownStudents(user),
    ]);
    const facts = await this.rosterOf(rows.map((row) => row.id), now);
    const items = rows.map((row) => ({
      ...toSalesStudent(row),
      guardian_phone: chatPhone(user, row.guardian?.phone_e164),
      ...(own.has(row.id) ? { mine: true } : {}),
      ...facts.get(row.id),
    }));
    return { items, total, page: q.page, pageSize: q.pageSize };
  }

  /** Rules and packages, then the lessons since the earliest start and the balances: 4 reads a page. */
  private async rosterOf(ids: readonly string[], now: Date): Promise<Map<string, RosterFacts>> {
    const [rules, packages] = await Promise.all([
      this.roster.rules(ids),
      this.roster.packages(ids),
    ]);
    const starts = packageStarts(packages);
    const [lessons, summaries] = await Promise.all([
      this.roster.lessons(ids, { from: rosterFrom(starts, now), to: now }),
      packageSummaries(this.roster, packages),
    ]);
    return toRoster(ids, { rules, starts, lessons, packages: summaries }, now);
  }

  /** The ids of her own students (SalesQueries.ownership). */
  async ownStudents(user: AuthUser): Promise<ReadonlySet<string>> {
    return new Set((await this.sales.ownership(user.id)).studentIds);
  }

  async live(now = new Date()): Promise<AssistantLessonView[]> {
    return (await this.academy.live(now)).map(toSalesLive);
  }

  /** 404 subscription_not_found for an unknown id AND for one she did not make (no existence leak). */
  async history(user: AuthUser, subscriptionId: string): Promise<SalesSubscriptionHistory> {
    const studentId = await this.histories.studentOf(subscriptionId);
    const own = studentId ? await this.sales.ownership(user.id) : null;
    if (!studentId || !own?.studentIds.includes(studentId)) throw notFound('subscription_not_found');
    const bundle = await this.histories.history(studentId);
    if (!bundle) throw notFound('subscription_not_found');
    return toSalesHistory(subscriptionId, bundle);
  }
}
