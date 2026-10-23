import type { LineCheckView } from '@ab/shared';
import { Injectable, Logger } from '@nestjs/common';
import { healthFromCheck, healthJson } from './numbers.mapper';
import { NumbersQueries } from './numbers.queries';

/**
 * «افحص الخطوط» per number (#134 item 9): each configured line's result is kept on the rows of the
 * phone_number_id that was checked, so a swapped number never shows the old phone. A failed call keeps
 * the last display number (only the health changes). A failed write never fails the check.
 */
@Injectable()
export class NumbersHealth {
  private readonly log = new Logger(NumbersHealth.name);

  constructor(private readonly queries: NumbersQueries) {}

  async save(views: readonly LineCheckView[]): Promise<void> {
    for (const v of views) {
      if (!v.configured || !v.phone_number_id) continue;
      const { health, ...rest } = healthFromCheck(v);
      try {
        await this.queries.saveHealth(v.phone_number_id, { ...rest, health: healthJson(health) });
      } catch (e) {
        this.log.warn(`number health not saved: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }
}
