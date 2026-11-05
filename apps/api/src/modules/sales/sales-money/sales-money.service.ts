import {
  linkAmountProblem,
  minLinkAmount,
  type SalesFamilyView,
  type SalesMoneySubscriptionView,
  type SalesPaymentCreate,
  type SalesPaymentView,
  type SalesQuote,
  type SalesQuoteView,
  type SalesReceiptUpload,
  type SalesSubscriptionCreate,
  type SignedUpload,
  type SubscriptionView,
} from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../../../common/auth/verify-token';
import { badRequest, conflict } from '../../../common/http/errors';
import { toSalesPayment, toSalesQuote, toSalesSubscription } from './sales-money.mapper';
import {
  assertSalesDiscount,
  assertSalesPrice,
  renewsAny,
  SalesMoneyScope,
} from './sales-money.scope';
import { SalesMoneyServices } from './sales-money.services';
import { SalesMoneyReads } from './reads/sales-money.reads';
import { salesStartsOn } from './sales-start';
import { loadEnv } from '@/config/env/env';

/**
 * The salesperson's money writes from the chat (owner 2026-10-12, R-ASST-01/04, docs/16 row 16): each one
 * checks the student is hers (403 not_your_student; ANY student with sales.renew_any, row 38), then REUSES the admin's services with her as the actor
 * (SubscriptionCreator: catalog quote, replay, audit, lead conversion; PaymentsService: replay, receipt
 * path, audit, recompute, trial → «مشترك»). It counts at once: no admin confirmation. Whitelisted views.
 * Narrower than the admin (owner 2026-10-12): only the site's discount pills, and the transfer in the package
 * currency (fx never runs on her path). She may pick the pricing country, like the admin's calculator.
 */
@Injectable()
export class SalesMoney {
  constructor(
    private readonly scope: SalesMoneyScope,
    private readonly services: SalesMoneyServices,
    private readonly reads: SalesMoneyReads,
  ) {}

  async quote(input: SalesQuote, user: AuthUser): Promise<SalesQuoteView> {
    await this.scope.assertRenews(user, input.studentId);
    assertSalesDiscount(input.pricing);
    return toSalesQuote(await this.services.creator.quote({ studentId: input.studentId, pricing: input.pricing }));
  }

  /**
   * The start day: salesStartsOn (docs/16 row 24). A retry of the same form (clientRequestId)
   * returns the stored package before any re-quote (its custom price is checked once, at creation).
   */
  async subscribe(input: SalesSubscriptionCreate, user: AuthUser, now = new Date()): Promise<SalesMoneySubscriptionView> {
    await this.scope.assertRenews(user, input.studentId);
    assertSalesDiscount(input.pricing);
    const startsOn = salesStartsOn(input, user, now);
    const replay = await this.services.creator.replay(input.clientRequestId);
    const view = replay ?? (await this.create(input, { startsOn, actorId: user.id }));
    // A clientRequestId already used for another student replays that package: never show it here.
    if (view.student.id !== input.studentId) throw conflict('client_request_reused');
    return toSalesSubscription(view);
  }

  private async create(
    input: SalesSubscriptionCreate,
    at: { startsOn: string; actorId: string },
  ): Promise<SubscriptionView> {
    // alreadyStarted is not a column
    const { studentId, pricing, clientRequestId, lessonsUsedBefore, customPrice } = input;
    const { startsOn } = at;
    const create = { studentId, pricing, clientRequestId, startsOn, lessonsUsedBefore };
    if (customPrice === undefined) return this.services.creator.create(create, at.actorId);
    await this.assertCustomPrice(input, customPrice);
    return this.services.creator.create({ ...create, customPrice }, at.actorId);
  }

  /**
   * «مبلغ مخصص» (owner 2026-11-02/05): never below the deepest pill's price (assertSalesPrice,
   * 403 discount_not_allowed), and, when the admin set STRIPE_MAX_DISCOUNT_PCT («التكاملات»),
   * not below that share of the quote either (400 discount_too_large).
   */
  private async assertCustomPrice(input: SalesSubscriptionCreate, amount: number): Promise<void> {
    const quote = await this.services.creator.quote(input);
    assertSalesPrice({ amount, total: quote.total, currency: quote.currency });
    const maxDiscountPct = loadEnv().STRIPE_MAX_DISCOUNT_PCT ?? null;
    const problem = linkAmountProblem({ amount, reference: quote.afterDiscount, maxDiscountPct });
    const min = minLinkAmount(quote.afterDiscount, maxDiscountPct);
    if (problem) throw badRequest(problem, { min, currency: quote.currency });
  }

  /**
   * Kind 'payment' and method 'bank' always; the receipt (optional) and «المرفقات» (0..5) must be this
   * package's, uploaded files; the currency must be the package's (400 currency_mismatch; the field stays).
   */
  async pay(input: SalesPaymentCreate, user: AuthUser): Promise<SalesPaymentView> {
    const { phone, ...payment } = input; // the chat's phone is never a payment column
    const sub = await this.services.receipts.subscription(input.subscriptionId);
    await this.scope.assertRenews(user, sub.student_id);
    if (input.currency !== sub.currency) throw badRequest('currency_mismatch', { currency: sub.currency });
    const view = await this.services.payments.create({ ...payment, kind: 'payment', method: 'bank' }, user.id);
    if (view.subscription_id !== sub.id) throw conflict('client_request_reused');
    return toSalesPayment(view, await this.reads.studentStatus(sub.student_id));
  }

  async uploadUrl(input: SalesReceiptUpload, ctx: { user: AuthUser; maxBytes: number }): Promise<SignedUpload> {
    const { phone, ...upload } = input; // the chat's phone is never an upload field
    const sub = await this.services.receipts.subscription(input.subscriptionId);
    await this.scope.assertRenews(ctx.user, sub.student_id);
    return this.services.receipts.uploadUrl(upload, ctx.maxBytes);
  }

  /** Her students of this chat's family (every child with sales.renew_any) with the packages still owed. */
  async familyOf(phone: string, user: AuthUser): Promise<SalesFamilyView> {
    return this.reads.familyOf(phone, { own: await this.scope.ownership(user), all: renewsAny(user) });
  }
}
