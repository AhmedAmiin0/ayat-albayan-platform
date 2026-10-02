import type { TablesInsert, TablesUpdate } from '@ab/db';
import type { QuoteResponse, SubscriptionCreate, SubscriptionUpdate, SubscriptionView } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { PricingService } from '../pricing/pricing.service';
import { conflict, notFound } from '../scheduling/errors';
import type { Page } from '../teachers/http';
import { MoneyWrites } from './money-writes';
import { PackagesService } from './packages.service';
import { subscriptionRow } from './subscription-row';
import { quoteQueryFor, type SubscriptionQuote } from './subscriptions.dto';
import { SubscriptionsQueries, type SubListQuery, type SubRow } from './subscriptions.queries';

/**
 * Packages (S1, S3–S5, R-SUB-01). Every write is audited and recomputes the student's statuses
 * and alerts (R-SUB-02) through MoneyWrites.
 */
@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly subs: SubscriptionsQueries,
    private readonly packages: PackagesService,
    private readonly writes: MoneyWrites,
  ) {}

  async list(q: SubListQuery): Promise<Page<SubscriptionView>> {
    const page = await this.subs.list(q);
    return { ...page, items: await this.packages.views(page.items) };
  }

  async get(id: string): Promise<SubscriptionView> {
    const [view] = await this.packages.views([await this.row(id)]);
    if (!view) throw notFound('subscription_not_found');
    return view;
  }

  async add(row: TablesInsert<'subscriptions'>, actorId: string): Promise<SubscriptionView> {
    const created = await this.subs.insert(row);
    const audit = { actorId, entity: 'subscriptions', entityId: created.id, action: 'create', after: created };
    await this.writes.done(audit, created.student_id);
    return this.get(created.id);
  }

  /** `paused: false` resumes to the derived status (subscriptionStatusFor). */
  async update(id: string, patch: Partial<SubscriptionUpdate>, actorId: string): Promise<SubscriptionView> {
    const before = await this.row(id);
    const write: TablesUpdate<'subscriptions'> = {};
    if (patch.paused === true) write.status = 'paused';
    // 'unpaid' is the neutral start: the recompute right after derives the real status.
    if (patch.paused === false && before.status === 'paused') write.status = 'unpaid';
    if (patch.renewsOn !== undefined) write.renews_on = patch.renewsOn;
    if (patch.notes !== undefined) write.notes = patch.notes;
    const after = Object.keys(write).length > 0 ? await this.subs.update(id, write) : before;
    await this.writes.done({ actorId, entity: 'subscriptions', entityId: id, action: 'update', before, after }, before.student_id);
    return this.get(id);
  }

  /** Only a package without payments (a typo); 409 has_payments otherwise. */
  async remove(id: string, actorId: string): Promise<void> {
    const before = await this.row(id);
    if (await this.subs.hasPayments(id)) throw conflict('has_payments');
    await this.subs.remove(id);
    await this.writes.done({ actorId, entity: 'subscriptions', entityId: id, action: 'delete', before }, before.student_id);
  }

  private async row(id: string): Promise<SubRow> {
    const row = await this.subs.get(id);
    if (!row) throw notFound('subscription_not_found');
    return row;
  }
}

/** S2: priced from the catalog with the same quote as /pricing; never a typed price. */
@Injectable()
export class SubscriptionCreator {
  constructor(
    private readonly subs: SubscriptionsQueries,
    private readonly pricing: PricingService,
    private readonly service: SubscriptionsService,
  ) {}

  async create(input: SubscriptionCreate, actorId: string): Promise<SubscriptionView> {
    return this.service.add(subscriptionRow(input, await this.quote(input), actorId), actorId);
  }

  /** The quote S2 stores. An unknown guardian country is quoted in USD (docs/08 §1): 503 fx_unavailable. */
  async quote(input: SubscriptionQuote): Promise<QuoteResponse> {
    const student = await this.subs.studentForQuote(input.studentId);
    if (!student) throw notFound('student_not_found');
    const country = input.pricing.country ?? student.country ?? undefined;
    return this.pricing.quote(quoteQueryFor(input.pricing, country));
  }
}
