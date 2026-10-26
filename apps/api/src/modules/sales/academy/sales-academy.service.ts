import type { AssistantLessonView, SalesStudentsQuery, SalesStudentView, SalesSubscriptionHistory } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../../../common/auth/verify-token';
import { notFound } from '../../../common/http/errors';
import type { Page } from '../../../common/http/http';
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

  async students(q: SalesStudentsQuery): Promise<Page<SalesStudentView>> {
    const { rows, total } = await this.academy.students(q);
    return { items: rows.map(toSalesStudent), total, page: q.page, pageSize: q.pageSize };
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
