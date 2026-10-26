import type { MyEarnings, MyPaymentRow, MyStudentRow } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../../../../common/auth/verify-token';
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

  /** The students I brought, newest first: when, whether the first subscription is paid, my commission. No price. */
  async students(user: AuthUser): Promise<MyStudentRow[]> {
    return (await this.queries.students(user.id)).flatMap((r) => toMyStudent(r) ?? []);
  }

  /** Only the payments I recorded. */
  async payments(user: AuthUser): Promise<MyPaymentRow[]> {
    return (await this.queries.payments(user.id)).map(toMyPayment);
  }

  async earnings(user: AuthUser, now = new Date()): Promise<MyEarnings> {
    const [terms, share, tz, commissions, adjustments, statements] = await Promise.all([
      this.terms.get(user.id),
      this.terms.renewalShare(),
      this.queries.tz(user.id),
      this.queries.commissions(user.id),
      this.queries.adjustments(user.id),
      this.statements.list({ assistantId: user.id, hideDrafts: true }),
    ]);
    return buildEarnings({
      now: now.toISOString(),
      tz,
      terms: terms ? toTermsView(user.id, terms, share) : null,
      commissions,
      adjustments,
      statements: statements.map(toStatementView),
    });
  }
}
