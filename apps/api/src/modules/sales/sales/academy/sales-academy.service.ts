import type { AssistantLessonView, SalesStudentsQuery, SalesStudentView, SalesSubscriptionHistory } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../../../../common/auth/verify-token';
import { notFound } from '../../../../common/http/errors';
import type { Page } from '../../../../common/http/http';
import { toSalesLive, toSalesStudent } from './sales-academy.mapper';
import { SalesAcademyQueries } from './sales-academy.queries';
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
  ) {}

  /** Every student; `mine` on hers (the ownership of «الاشتراكات»): those rows open «تفاصيل الطالب» (docs/16 row 36). */
  async students(q: SalesStudentsQuery, user: AuthUser): Promise<Page<SalesStudentView>> {
    const [{ rows, total }, own] = await Promise.all([this.academy.students(q), this.ownStudents(user)]);
    const items = rows.map((row) => ({ ...toSalesStudent(row), ...(own.has(row.id) ? { mine: true } : {}) }));
    return { items, total, page: q.page, pageSize: q.pageSize };
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
