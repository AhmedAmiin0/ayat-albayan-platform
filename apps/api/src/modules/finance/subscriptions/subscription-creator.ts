import type { QuoteResponse, SubscriptionCreate, SubscriptionView } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { PricingService } from '../pricing/pricing.service';
import { notFound } from '../../../common/http/errors';
import { subscriptionRow } from './list/subscription-row';
import { quoteQueryFor, type SubscriptionQuote } from './subscriptions.dto';
import { SubscriptionsQueries } from './subscriptions.queries';
import { SubscriptionsService } from './subscriptions.service';
import { assertUsedBeforeFits } from './used-before';

/**
 * S2: priced from the catalog with the same quote as /pricing; never a typed price. A retry of the
 * same form (clientRequestId, rule 8) returns the package it already created; only a new one is
 * audited and converts the family's lead (MoneyWrites). The callers gate lessonsUsedBefore
 * (assertUsedBefore); its bound needs the quote's size. `price`: only a Stripe payment link's agreed amount
 * (owner 2026-10-28, docs/30, test build), so paying the link in full makes the package paid.
 */
@Injectable()
export class SubscriptionCreator {
  constructor(
    private readonly subs: SubscriptionsQueries,
    private readonly pricing: PricingService,
    private readonly service: SubscriptionsService,
  ) {}

  async create(input: SubscriptionCreate, actorId: string, opts: { price?: number } = {}): Promise<SubscriptionView> {
    const replay = await this.replayOf(input.clientRequestId);
    if (replay) return replay;
    const quote = await this.quote(input);
    assertUsedBeforeFits(input.lessonsUsedBefore, quote.lessons);
    const row = subscriptionRow(input, quote, actorId);
    const created = await this.service.add(opts.price === undefined ? row : { ...row, price: opts.price }, actorId);
    // Lost the race to a retry of the same form: that one created it.
    const view = created ?? (await this.replayOf(input.clientRequestId));
    if (!view) throw notFound('subscription_not_found');
    return view;
  }

  /** The quote S2 stores. An unknown guardian country is quoted in USD (docs/08 §1): 503 fx_unavailable. */
  async quote(input: SubscriptionQuote): Promise<QuoteResponse> {
    const student = await this.subs.studentForQuote(input.studentId);
    if (!student) throw notFound('student_not_found');
    const country = input.pricing.country ?? student.country ?? undefined;
    return this.pricing.quote(quoteQueryFor(input.pricing, country));
  }

  private async replayOf(clientRequestId: string | undefined): Promise<SubscriptionView | null> {
    const row = clientRequestId ? await this.subs.byRequest(clientRequestId) : null;
    return row ? this.service.get(row.id) : null;
  }
}
