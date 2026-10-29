import type { MyCommissionRow, MyEarnings, MyPaymentRow, MyStudentRow } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { can } from '../../../../common/auth/permissions';
import type { AuthUser } from '../../../../common/auth/verify-token';
import type { Page, PageQuery } from '../../../../common/http/http';
import { toMyCommission } from './my.commissions.mapper';
import { buildEarnings } from './my.earnings';
import { toMyPayment, toMyStudent } from './my.mapper';
import { MyQueries } from './my.queries';
import { StatementsQueries } from '../statements/statements.queries';
import { toStatementView } from '../statements/statements.mapper';
import { toTermsView } from '../terms/terms.mapper';
import { TermsQueries } from '../terms/terms.queries';

/** The assistant's own pages (R-ASST-04, R-ASST-06). The profile id comes from the login, never from a parameter. */
@Injectable()
export class MyService {
  constructor(
    private readonly queries: MyQueries,
    private readonly terms: TermsQueries,
    private readonly statements: StatementsQueries,
  ) {}

  /** The students I brought, newest first: when, the guardian's phone, whether the first subscription is paid, my commission. No price. */
  async students(user: AuthUser): Promise<MyStudentRow[]> {
    // The phone only for a holder of inbox.read (chatPhone): she sees it in the chats anyway.
    const phones = can(user, 'inbox.read') ? this.queries.guardianPhones(user.id) : Promise.resolve(new Map<string, string>());
    const [rows, byStudent] = await Promise.all([this.queries.students(user.id), phones]);
    return rows.flatMap((r) => toMyStudent(r, byStudent) ?? []);
  }

  /** Only the payments I recorded. */
  async payments(user: AuthUser): Promise<MyPaymentRow[]> {
    return (await this.queries.payments(user.id)).map(toMyPayment);
  }

  /** «عمولاتي» (owner 2026-10-29): one page of my own commissions, newest first, each with its wallet state. */
  async commissions(user: AuthUser, q: PageQuery): Promise<Page<MyCommissionRow>> {
    const { rows, total } = await this.queries.commissionPage(user.id, q);
    return { items: rows.map(toMyCommission), total, page: q.page, pageSize: q.pageSize };
  }

  async earnings(user: AuthUser, now = new Date()): Promise<MyEarnings> {
    const [terms, share, tz, commissions, wallet, adjustments, statements] = await Promise.all([
      this.terms.get(user.id),
      this.terms.renewalShare(),
      this.queries.tz(user.id),
      this.queries.commissions(user.id),
      this.queries.walletRows(user.id),
      this.queries.adjustments(user.id),
      this.statements.list({ assistantId: user.id, hideDrafts: true }),
    ]);
    return buildEarnings({
      now: now.toISOString(),
      tz,
      terms: terms ? toTermsView(user.id, terms, share) : null,
      commissions,
      wallet,
      adjustments,
      statements: statements.map(toStatementView),
    });
  }
}
