import type { EvolutionState } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';

/** wa_numbers.evolution_state (migration 20261106000300): the last state Evolution reported. */
@Injectable()
export class EvolutionStateRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** An older report never overwrites a newer one (Evolution may deliver out of order). */
  async set(input: { numberId: string; state: EvolutionState; at: Date }): Promise<void> {
    const at = input.at.toISOString();
    const { error } = await this.db
      .from('wa_numbers')
      .update({ evolution_state: input.state, evolution_state_at: at })
      .eq('id', input.numberId)
      .eq('provider', 'evolution')
      .or(`evolution_state_at.is.null,evolution_state_at.lte.${at}`);
    if (error) throw new Error(`evolution state write failed: ${error.message}`);
  }
}
