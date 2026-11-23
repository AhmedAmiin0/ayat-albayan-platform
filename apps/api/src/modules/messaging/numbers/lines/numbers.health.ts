import type { LineCheckView } from '@ab/shared';
import { Injectable, Logger, Optional } from '@nestjs/common';
import { activeNumberId } from '@/common/configuration/integrations/numbers-overlay';
import { healthFromCheck, healthJson } from '@/modules/messaging/numbers/numbers.mapper';
import { NumbersRepo } from '@/modules/messaging/numbers/numbers.repo';
import { OwnNumbers } from '@/modules/messaging/numbers/own/own-numbers';
import { healthTarget } from './numbers.health-target';

/** Results kept per checked phone_number_id, so a swapped number never shows the old phone. */
@Injectable()
export class NumbersHealth {
  private readonly log = new Logger(NumbersHealth.name);

  constructor(
    private readonly queries: NumbersRepo,
    @Optional() private readonly own?: OwnNumbers,
  ) {}

  async save(views: readonly LineCheckView[]): Promise<void> {
    for (const v of views) {
      const target = healthTarget(v, activeNumberId(v.line));
      if (!target) continue;
      const { health, ...rest } = healthFromCheck(v);
      try {
        await this.queries.saveHealth(target, { ...rest, health: healthJson(health) });
      } catch (e) {
        this.log.warn(`number health not saved: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    this.own?.forget();
  }
}
