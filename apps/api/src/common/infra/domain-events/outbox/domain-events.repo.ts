import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { done, pgError } from '@/common/db/errors';
import { type OutboxRow, outboxRows } from './outbox.schemas';
import type { ClaimRequest, OutboxStore, Settled } from './outbox.types';

/** The outbox RPCs (migration 20261123000100); producers write rows in SQL, never here. */
@Injectable()
export class DomainEventsRepo implements OutboxStore {
  constructor(@Inject(DB) private readonly db: Db) {}

  async claim(req: ClaimRequest): Promise<OutboxRow[]> {
    const { data, error } = await this.db.rpc('claim_domain_events', {
      p_limit: req.limit,
      p_token: req.token,
      p_stale_before: req.staleBefore.toISOString(),
    });
    if (error) throw pgError(error);
    return outboxRows.parse(data);
  }

  async finish(token: string, results: readonly Settled[]): Promise<void> {
    const p_results = results.map((r) => ({ ...r, at: r.at?.toISOString() ?? null }));
    done(await this.db.rpc('finish_domain_events', { p_token: token, p_results }));
  }
}
