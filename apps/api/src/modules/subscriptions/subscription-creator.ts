import type { QuoteResponse, SubscriptionCreate, SubscriptionView } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { PricingService } from '../pricing/pricing.service';
import { notFound } from '../../common/http/errors';
import { subscriptionRow } from './subscription-row';
import { quoteQueryFor, type SubscriptionQuote } from './subscriptions.dto';
import { SubscriptionsQueries } from './subscriptions.queries';
import { SubscriptionsService } from './subscriptions.service';

/**
 * S2: priced from the catalog with the same quote as /pricing; never a typed price. A retry of the
 * same form (clientRequestId, rule 8) returns the package it already created; only a new one is
 * audited and converts the family's lead (MoneyWrites).
 */
@Injectable()
export class SubscriptionCreator {
  constructor(
    private readonly subs: SubscriptionsQueries,
    private readonly pricing: PricingService,
    private readonly service: SubscriptionsService,
  ) {}

  async create(input: SubscriptionCreate, actorId: string): Promise<SubscriptionView> {
    const replay = await this.replayOf(input.clientRequestId);
    if (replay) return replay;
    const created = await this.service.add(subscriptionRow(input, await this.quote(input), actorId), actorId);
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
