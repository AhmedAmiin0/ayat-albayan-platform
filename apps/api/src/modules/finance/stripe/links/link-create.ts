import {
  isLinkCurrency,
  linkAmountProblem,
  minLinkAmount,
  type PaymentLinkCreate,
  type PaymentLinkQuote,
  type PaymentLinkQuoteView,
  type PaymentLinkView,
} from '@ab/shared';
import type { QuoteResponse } from '@ab/money';
import { Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { badRequest, conflict, notFound } from '@/common/http/errors';
import { assertSalesDiscount, salesStartsOn, toSalesQuote } from '@/modules/sales/sales-money';
import { SubscriptionCreator } from '@/modules/finance/subscriptions';
import { loadEnv } from '@/config/env/env';
import { newLinkToken } from './link-ids';
import { LinkCreateDeps, LinkDeps } from './link-deps';
import type { LinkRow } from './payment-links.repo';

/** Package built like a new subscription at the agreed price (docs/30); retries idempotent. */
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
    // Any agreed amount > 0 (owner 2026-11-18, no sales floor): only the admin's cap applies.
    if (problem) throw badRequest(problem, { min: min_amount, currency: quote.currency });
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

  /**
   * The catalog quote, the site's discount pills only (403 discount_not_allowed), in a
   * currency a link can carry (400 currency_not_supported: KWD, OMR). Checked here, so the
   * quote says so and a create never writes the package before payment_links_currency_check
   * refuses the link (2026-11-14: a QAR link did).
   */
  private async quoted(input: PaymentLinkQuote): Promise<QuoteResponse> {
    assertSalesDiscount(input.pricing);
    const quote = await this.creator.quote(input);
    if (!isLinkCurrency(quote.currency)) {
      throw badRequest('currency_not_supported', { currency: quote.currency });
    }
    return quote;
  }

  /** Own student only while SalesOwnershipRule enforces; sales.renew_any never widens it. */
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
