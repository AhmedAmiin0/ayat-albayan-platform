import { Inject, Injectable, Optional } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { financeCardKey } from '@/common/infra/cache/cache-keys';
import { SharedCache } from '@/common/infra/cache/shared-cache';
import { type FinanceTotalsRow, financeTotalsRows } from './finance.schemas';
import type { FinanceCardQuery } from './finance.types';

/** Shared between the API copies for a minute (Redis only): a dashboard total may lag that long. */
const FINANCE_CARD_TTL_MS = 60_000;

/** The dashboard's finance card (service role; the controller is admin-only). */
@Injectable()
export class FinanceRepo {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Optional() private readonly shared?: SharedCache,
  ) {}

  totals(card: FinanceCardQuery): Promise<FinanceTotalsRow[]> {
    const load = (): Promise<FinanceTotalsRow[]> => this.read(card);
    const key = financeCardKey(card.window);
    return this.shared ? this.shared.read({ key, ttlMs: FINANCE_CARD_TTL_MS, load }) : load();
  }

  private async read({ window, first, last }: FinanceCardQuery): Promise<FinanceTotalsRow[]> {
    const { data, error } = await this.db.rpc('finance_card_totals', {
      p_from: window.from.toISOString(),
      p_to: window.to.toISOString(),
      p_first: `${first}-01`,
      p_last: `${last}-01`,
    });
    if (error) throw new Error(`finance_card_totals failed: ${error.message}`);
    return financeTotalsRows.parse(data);
  }
}
