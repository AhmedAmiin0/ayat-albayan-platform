import type { SalesStudentsQuery, SalesStudentView, SalesSubscriptionHistory } from '@ab/shared';
import type { Page } from '@ab/core';
import type { AssistantLessonView } from '@ab/schedule';
import { Injectable } from '@nestjs/common';
import { chatPhone } from '@/common/auth/chat-phone';
import type { AuthUser } from '@/common/auth/verify-token';
import { notFound } from '@/common/http/errors';
import { toSalesLive, toSalesStudent } from './sales-academy.mapper';
import { SalesAcademyRepo } from './sales-academy.repo';
import { packageSummaries } from './sales-package.mapper';
import { packageStarts, rosterFrom, toRoster, type RosterFacts } from './sales-roster.mapper';
import { SalesRosterRepo } from './sales-roster.repo';
import { toSalesHistory } from '@/modules/sales/sales/history/sales-history.mapper';
import { SalesHistoryRepo } from '@/modules/sales/sales/history/sales-history.repo';
import { SalesRepo } from '@/modules/sales/sales/sales.repo';

/** docs/16: read-only; students and running lessons are academy-wide, subscriptions hers only. */
@Injectable()
export class SalesAcademyService {
  constructor(
    private readonly academy: SalesAcademyRepo,
    private readonly histories: SalesHistoryRepo,
    private readonly sales: SalesRepo,
    private readonly roster: SalesRosterRepo,
  ) {}

  /** docs/16 row 36: per-row extras read for the whole page at once, no price. */
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
    const starts = packageStarts(packages, now);
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

  /** Any student's subscription (owner 2026-10-30: «Make all assistants see all»); 404 for an unknown id. */
  async history(subscriptionId: string): Promise<SalesSubscriptionHistory> {
    const studentId = await this.histories.studentOf(subscriptionId);
    if (!studentId) throw notFound('subscription_not_found');
    const bundle = await this.histories.history(studentId);
    if (!bundle) throw notFound('subscription_not_found');
    return toSalesHistory(subscriptionId, bundle);
  }
}
