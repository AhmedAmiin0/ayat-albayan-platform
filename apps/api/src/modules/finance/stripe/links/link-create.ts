import { linkAmountProblem, minLinkAmount, type PaymentLinkCreate, type PaymentLinkQuote, type PaymentLinkQuoteView, type PaymentLinkView, type QuoteResponse } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { badRequest, conflict, notFound } from '@/common/http/errors';
import {
  assertSalesDiscount,
  assertSalesPrice,
  salesStartsOn,
  toSalesQuote,
} from '@/modules/sales/sales-money';
import { SubscriptionCreator } from '@/modules/finance/subscriptions';
import { loadEnv } from '@/config/env/env';
import { newLinkToken } from './link-ids';
import { LinkCreateDeps, LinkDeps } from './link-deps';
import type { LinkRow } from './payment-links.repo';

/**
 * «رابط دفع» (owner 2026-10-28, docs/30): ANY student (the 2026-10-28 any-student decision). The package is
 * created now exactly like «اشتراك جديد» (catalog quote, the site's discount pills, the start-day rules and
 * used lessons, unpaid) except its price, which is the agreed amount, so paying the link in full makes it paid
 * and the commission triggers run on what the family paid. The agreed amount is free (> 0) unless the admin set
 * STRIPE_MAX_DISCOUNT_PCT («التكاملات»). A retry of the same form (clientRequestId) returns the link it already made. The kind is the
 * server's (owner 2026-10-29): 'renewal' once the student has a priced package, else 'new'. «المعلم/ة» (teacherId,
 * «اشتراك جديد» → «دفع إلكتروني») as POST /sales/subscriptions saves it: her own student only while the ownership rule enforces, checked active
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
    const quote = await this.quoted(input);
    const max_discount_pct = loadEnv().STRIPE_MAX_DISCOUNT_PCT ?? null;
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
    const quote = await this.quoted(input);
    const maxDiscountPct = loadEnv().STRIPE_MAX_DISCOUNT_PCT ?? null;
    const min_amount = minLinkAmount(quote.afterDiscount, maxDiscountPct);
    if (input.currency !== quote.currency) throw badRequest('currency_mismatch', { currency: quote.currency });
    const reference = quote.afterDiscount;
    const problem = linkAmountProblem({ amount: input.amount, reference, maxDiscountPct });
    if (problem) throw badRequest(problem, { min: min_amount, currency: quote.currency });
    // The pills' floor (review 2026-11-05): never a 1 SAR package she then marks paid herself.
    assertSalesPrice({ amount: input.amount, total: quote.total, currency: quote.currency });
    const { studentId, pricing, clientRequestId, lessonsUsedBefore, teacherId } = input;
    if (teacherId) await this.extra.sales.teachers.ensureActive(teacherId);
    const create = { studentId, pricing, clientRequestId, startsOn, lessonsUsedBefore };
    const sub = await this.creator.create(create, user.id, { price: input.amount });
    if (sub.student.id !== input.studentId) throw conflict('client_request_reused');
    // After create: a retry that replays its own orphan package (the link insert failed) must not count it as a renewal.
    const kind = student.priced.some((id) => id !== sub.id) ? 'renewal' : 'new';
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

  /** The catalog quote, the site's discount pills only (403 discount_not_allowed). */
  private async quoted(input: PaymentLinkQuote): Promise<QuoteResponse> {
    assertSalesDiscount(input.pricing);
    return this.creator.quote(input);
  }

  /**
   * «المعلم/ة» writes students.teacher_id and opens the teacher-student chat: her own student only
   * while SalesOwnershipRule enforces it (SalesMoneyScope.assertOwns; unlike the bank path, sales.renew_any never widens a link),
   * any student otherwise. The link alone stays any student.
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
