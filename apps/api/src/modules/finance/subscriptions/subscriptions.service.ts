import type { TablesInsert, TablesUpdate } from '@ab/db';
import type { SubscriptionUpdate, SubscriptionView } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { conflict, notFound } from '../../../common/http/errors';
import type { Page } from '../../../common/http/http';
import { MoneyWrites } from './money/money-writes';
import { PackagesService } from './money/packages.service';
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

  /** null: the row's client_request_id is already taken (the caller replays that package). */
  async add(row: TablesInsert<'subscriptions'>, actorId: string): Promise<SubscriptionView | null> {
    const created = await this.subs.insert(row);
    if (!created) return null;
    const audit = { actorId, entity: 'subscriptions', entityId: created.id, action: 'create', after: created };
    await this.writes.done(audit, created.student_id);
    return this.get(created.id);
  }

  /**
   * renews_on and notes. A pause is never set here: it is the course pause (docs/11 §7b, CoursePauseService), so
   * 'paused' has one meaning. A cancelled package never changes: 409.
   */
  async update(id: string, patch: Partial<SubscriptionUpdate>, actorId: string): Promise<SubscriptionView> {
    const before = await this.row(id);
    if (before.status === 'cancelled') throw conflict('already_cancelled');
    const write: TablesUpdate<'subscriptions'> = {};
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
