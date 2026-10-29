import { linkAmountProblem, minLinkAmount, type PaymentLinkCreate, type PaymentLinkQuote, type PaymentLinkQuoteView, type PaymentLinkView } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../../../../common/auth/verify-token';
import { badRequest, conflict, notFound } from '../../../../common/http/errors';
import { assertSalesDiscount, salesStartsOn, toSalesQuote } from '../../../sales/sales-money';
import { SubscriptionCreator } from '../../subscriptions';
import { newLinkToken } from './link-ids';
import { LinkCreateDeps, LinkDeps } from './link-deps';

/**
 * «رابط دفع» (owner 2026-10-28, docs/30): ANY student (the 2026-10-28 any-student decision). The package is
 * created now exactly like «اشتراك جديد» (catalog quote, the site's discount pills, the start-day rules and
 * used lessons, unpaid) except its price, which is the agreed amount, so paying the link in full makes it paid
 * and the commission triggers run on what the family paid. The agreed amount is free (> 0) unless the admin set
 * max_discount_pct. A retry of the same form (clientRequestId) returns the link it already made.
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
    const replay = await this.deps.links.byRequest(input.clientRequestId);
    if (replay) return this.replayed(replay.created_by, replay.id, user);
    const student = await this.deps.links.student(input.studentId);
    if (!student) throw notFound('student_not_found');
    if (input.kind === 'renewal' && student.priced.length === 0) throw badRequest('not_a_renewal');
    const startsOn = salesStartsOn(input, user, now);
    await this.extra.packages.releaseStale(input.studentId, user.id, now);
    const { quote, min_amount } = await this.quote(input);
    if (input.currency !== quote.currency) throw badRequest('currency_mismatch', { currency: quote.currency });
    const reference = quote.afterDiscount;
    const problem = linkAmountProblem({ amount: input.amount, reference, maxDiscountPct: (await this.extra.settings.read()).max_discount_pct });
    if (problem) throw badRequest(problem, { min: min_amount, currency: quote.currency });
    const { studentId, pricing, clientRequestId, lessonsUsedBefore } = input;
    const create = { studentId, pricing, clientRequestId, startsOn, lessonsUsedBefore };
    const sub = await this.creator.create(create, user.id, { price: input.amount });
    if (sub.student.id !== input.studentId) throw conflict('client_request_reused');
    const row = await this.deps.links.insert({
      token: newLinkToken(),
      student_id: input.studentId,
      subscription_id: sub.id,
      kind: input.kind,
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
    return this.deps.views.one(row, now);
  }

  /** Someone else's form id is never replayed to her. */
  private async replayed(createdBy: string, id: string, user: AuthUser): Promise<PaymentLinkView> {
    if (createdBy !== user.id) throw conflict('client_request_reused');
    const row = await this.deps.links.get(id);
    if (!row) throw notFound('link_not_found');
    return this.deps.views.one(row);
  }
}
