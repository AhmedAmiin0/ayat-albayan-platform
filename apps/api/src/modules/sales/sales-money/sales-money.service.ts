import {
  daysBefore,
  salesStartDate,
  type ReceiptUpload,
  type SalesFamilyView,
  type SalesMoneySubscriptionView,
  type SalesPaymentCreate,
  type SalesPaymentView,
  type SalesQuote,
  type SalesQuoteView,
  type SalesSubscriptionCreate,
  type SignedUpload,
} from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../../../common/auth/verify-token';
import { riyadhToday } from '../sales/schedule/sales-schedule.mapper';
import { assertUsedBefore } from '../../finance/subscriptions';
import { badRequest, conflict, forbidden } from '../../../common/http/errors';
import { toSalesPayment, toSalesQuote, toSalesSubscription } from './sales-money.mapper';
import { assertSalesDiscount, SalesMoneyScope } from './sales-money.scope';
import { SalesMoneyServices } from './sales-money.services';
import { SalesMoneyReads } from './reads/sales-money.reads';

/**
 * The salesperson's money writes from the chat (owner 2026-10-12, R-ASST-01/04, docs/16 row 16): each one
 * checks the student is hers (403 not_your_student), then REUSES the admin's services with her as the actor
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
    await this.scope.assertOwns(user, input.studentId);
    assertSalesDiscount(input.pricing);
    return toSalesQuote(await this.services.creator.quote(input));
  }

  /**
   * The start day (docs/16 row 24): today in Riyadh unless she holds subscriptions.set_start_date (403
   * start_date_not_allowed); a past day only with alreadyStarted, at most a year back (400). Before pricing.
   * Old apps sent the family's local day: without alreadyStarted, Riyadh's yesterday is read as today.
   */
  async subscribe(input: SalesSubscriptionCreate, user: AuthUser, now = new Date()): Promise<SalesMoneySubscriptionView> {
    await this.scope.assertOwns(user, input.studentId);
    assertSalesDiscount(input.pricing);
    const canSet = user.permissions?.includes('subscriptions.set_start_date') ?? false;
    const today = riyadhToday(now);
    const startsOn = input.alreadyStarted === undefined && input.startsOn === daysBefore(today, 1) ? today : input.startsOn;
    const start = salesStartDate({ startsOn, alreadyStarted: input.alreadyStarted, canSet, today });
    if (!start.ok) throw start.code === 'start_date_not_allowed' ? forbidden(start.code) : badRequest(start.code);
    // «حلقات مستخدمة من الباقة» (owner 2026-10-28): only with a past start, i.e. alreadyStarted.
    assertUsedBefore({ lessonsUsedBefore: input.lessonsUsedBefore, startsOn: start.startsOn }, user, now);
    const { studentId, pricing, clientRequestId, lessonsUsedBefore } = input; // alreadyStarted is not a column
    const create = { studentId, pricing, clientRequestId, startsOn: start.startsOn, lessonsUsedBefore };
    const view = await this.services.creator.create(create, user.id);
    // A clientRequestId already used for another student replays that package: never show it here.
    if (view.student.id !== input.studentId) throw conflict('client_request_reused');
    return toSalesSubscription(view);
  }

  /**
   * Kind 'payment' and method 'bank' always; the receipt (optional) and «المرفقات» (0..5) must be this
   * package's, uploaded files; the currency must be the package's (400 currency_mismatch; the field stays).
   */
  async pay(input: SalesPaymentCreate, user: AuthUser): Promise<SalesPaymentView> {
    const sub = await this.services.receipts.subscription(input.subscriptionId);
    await this.scope.assertOwns(user, sub.student_id);
    if (input.currency !== sub.currency) throw badRequest('currency_mismatch', { currency: sub.currency });
    const view = await this.services.payments.create({ ...input, kind: 'payment', method: 'bank' }, user.id);
    if (view.subscription_id !== sub.id) throw conflict('client_request_reused');
    return toSalesPayment(view, await this.reads.studentStatus(sub.student_id));
  }

  async uploadUrl(input: ReceiptUpload, ctx: { user: AuthUser; maxBytes: number }): Promise<SignedUpload> {
    const sub = await this.services.receipts.subscription(input.subscriptionId);
    await this.scope.assertOwns(ctx.user, sub.student_id);
    return this.services.receipts.uploadUrl(input, ctx.maxBytes);
  }

  /** Her students of this chat's family (none of the family's other children) with the packages still owed. */
  async familyOf(phone: string, user: AuthUser): Promise<SalesFamilyView> {
    return this.reads.familyOf(phone, await this.scope.ownership(user));
  }
}
