import { linkAmountProblem, minLinkAmount, type PaymentLinkCreate, type PaymentLinkQuote, type PaymentLinkQuoteView, type PaymentLinkView } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../../../../common/auth/verify-token';
import { badRequest, conflict, notFound } from '../../../../common/http/errors';
import { assertSalesDiscount, salesStartsOn, toSalesQuote } from '../../../sales/sales-money';
import { SubscriptionCreator } from '../../subscriptions';
import { newLinkToken } from './link-ids';
import { LinkCreateDeps, LinkDeps } from './link-deps';
import type { LinkRow } from './payment-links.queries';

/**
 * «رابط دفع» (owner 2026-10-28, docs/30): ANY student (the 2026-10-28 any-student decision). The package is
 * created now exactly like «اشتراك جديد» (catalog quote, the site's discount pills, the start-day rules and
 * used lessons, unpaid) except its price, which is the agreed amount, so paying the link in full makes it paid
 * and the commission triggers run on what the family paid. The agreed amount is free (> 0) unless the admin set
 * max_discount_pct. A retry of the same form (clientRequestId) returns the link it already made. The kind is the
 * server's (owner 2026-10-29): 'renewal' once the student has a priced package, else 'new'. «المعلم/ة» (teacherId,
 * «اشتراك جديد» → «دفع إلكتروني») as POST /sales/subscriptions saves it: her own student only, checked active
 * before the package is made, assigned once the link exists and again on a retry (a no-op once done).
 */
@Injectable()
export class LinkCreate {
  constructor(
    private readonly deps: LinkDeps,
    private readonly creator: SubscriptionCreator,
    private readonly extra: LinkCreateDeps,
  ) {}

  async quote(input: PaymentLinkQuote): Promise<PaymentLinkQuoteView> {
    assertSalesDiscount(input.pricing);
    const [quote, { max_discount_pct }] = await Promise.all([this.creator.quote(input), this.extra.settings.read()]);
    return { quote: toSalesQuote(quote), max_discount_pct, min_amount: minLinkAmount(quote.afterDiscount, max_discount_pct) };
  }

  async create(input: PaymentLinkCreate, user: AuthUser, now = new Date()): Promise<PaymentLinkView> {
    await this.mayAssign(input, user);
    const replay = await this.deps.links.byRequest(input.clientRequestId);
    if (replay) return this.replayed(replay, input, user);
    const startsOn = salesStartsOn(input, user, now);
    await this.extra.packages.releaseStale(input.studentId, user.id, now);
    // Read after the release: a stale link's package never makes this one a renewal (the attribution's own rule).
    const student = await this.deps.links.student(input.studentId);
    if (!student) throw notFound('student_not_found');
    if (input.kind === 'renewal' && student.priced.length === 0) throw badRequest('not_a_renewal');
    const kind = student.priced.length > 0 ? 'renewal' : 'new';
    const { quote, min_amount } = await this.quote(input);
    if (input.currency !== quote.currency) throw badRequest('currency_mismatch', { currency: quote.currency });
    const reference = quote.afterDiscount;
    const problem = linkAmountProblem({ amount: input.amount, reference, maxDiscountPct: (await this.extra.settings.read()).max_discount_pct });
    if (problem) throw badRequest(problem, { min: min_amount, currency: quote.currency });
    const { studentId, pricing, clientRequestId, lessonsUsedBefore, teacherId } = input;
    if (teacherId) await this.extra.sales.teachers.ensureActive(teacherId);
    const create = { studentId, pricing, clientRequestId, startsOn, lessonsUsedBefore };
    const sub = await this.creator.create(create, user.id, { price: input.amount });
    if (sub.student.id !== input.studentId) throw conflict('client_request_reused');
    const row = await this.deps.links.insert({
      token: newLinkToken(),
      student_id: input.studentId,
      subscription_id: sub.id,
      kind,
      package: sub.package,
      lessons: sub.lessons_total,
      duration: sub.duration,
      amount: input.amount,
      reference_price: reference,
      currency: sub.currency,
      created_by: user.id,
      client_request_id: input.clientRequestId,
    });
    const after = { student_id: row.student_id, subscription_id: row.subscription_id, kind: row.kind, amount: row.amount, reference_price: reference, currency: row.currency };
    await this.deps.audit.record({ actorId: user.id, entity: 'payment_links', entityId: row.id, action: 'create', after });
    await this.assign(input, user);
    return this.deps.views.one(row, now);
  }

  /**
   * «المعلم/ة» writes students.teacher_id and opens the teacher-student chat: her own student only, as the bank
   * path (SalesMoneyScope; no chat phone, so a sales.renew_any child is refused too). The link alone stays any student.
   */
  private async mayAssign(input: PaymentLinkCreate, user: AuthUser): Promise<void> {
    if (input.teacherId && user.role !== 'admin') await this.extra.sales.scope.assertOwns(user, input.studentId);
  }

  private async assign(input: PaymentLinkCreate, user: AuthUser): Promise<void> {
    const { studentId, teacherId } = input;
    if (teacherId) await this.extra.sales.teachers.assign({ studentId, teacherId, actorId: user.id });
  }

  /** Someone else's form id (or another student's) is never replayed to her; a retry after a failed assignment assigns now. */
  private async replayed(replay: LinkRow, input: PaymentLinkCreate, user: AuthUser): Promise<PaymentLinkView> {
    if (replay.created_by !== user.id || replay.student_id !== input.studentId) throw conflict('client_request_reused');
    const row = await this.deps.links.get(replay.id);
    if (!row) throw notFound('link_not_found');
    await this.assign(input, user);
    return this.deps.views.one(row);
  }
}
