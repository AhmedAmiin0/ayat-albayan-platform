import type { EvolutionConfig, EvolutionSyncView } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';

// An Evolution number's own columns (migration 20261106000300, docs/19 «Evolution driver»): its
// options, the last push read back, and the restriction switch-off. Never a secret.

/** messages.error_code of a row its Evolution number can no longer send (staff resend it). */
export const EVOLUTION_NUMBER_OFF = 'evolution_number_off';
/** The sender's claim marker (whatsapp sender/send-plan SENDING): a row being sent right now. */
const SENDING_MARK = 'sending';

@Injectable()
export class EvolutionNumbersRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  async saveConfig(id: string, config: EvolutionConfig): Promise<boolean> {
    const { data, error } = await this.db.from('wa_numbers').update({ evolution_config: config })
      .eq('id', id).eq('provider', 'evolution').select('id');
    if (error) throw new Error(`evolution config write failed: ${error.message}`);
    return data.length > 0;
  }

  async saveSync(id: string, view: EvolutionSyncView): Promise<void> {
    const { error } = await this.db.from('wa_numbers').update({ evolution_sync: view })
      .eq('id', id).eq('provider', 'evolution');
    if (error) throw new Error(`evolution sync write failed: ${error.message}`);
  }

  /**
   * WhatsApp restricted the number (463 / 475): off, no longer the default, state `refused`.
   * Only an enabled row last changed before the refused message was sent (`sentAt`): an old
   * webhook replayed after an admin turned it back on changes nothing. true = switched off now.
   */
  async restrict(id: string, at: { now: Date; sentAt: string }): Promise<boolean> {
    const patch = {
      enabled: false, is_default: false, evolution_state: 'refused',
      evolution_state_at: at.now.toISOString(),
    };
    const { data, error } = await this.db.from('wa_numbers').update(patch)
      .eq('id', id).eq('provider', 'evolution').eq('enabled', true).lte('updated_at', at.sentAt)
      .select('id');
    if (error) throw new Error(`evolution restrict failed: ${error.message}`);
    return data.length > 0;
  }

  /** The queued rows pinned to this number fail visibly (its removal): staff can resend them. */
  async failQueued(numberId: string): Promise<number> {
    const { data, error } = await this.db.from('messages')
      .update({
        status: 'failed', error_code: EVOLUTION_NUMBER_OFF, next_attempt_at: null,
        error_text: 'The Evolution number was removed or switched off; resend from another number.',
      })
      .eq('number_id', numberId).eq('direction', 'outbound').eq('status', 'queued')
      // Never a row mid-send (claimed: error_code 'sending'): the sender records its outcome.
      .or(`error_code.is.null,error_code.neq.${SENDING_MARK}`)
      .select('id');
    if (error) throw new Error(`evolution queued rows not failed: ${error.message}`);
    return data.length;
  }
}
