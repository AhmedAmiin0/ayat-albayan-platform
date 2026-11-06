import { evolutionConfigOf, type EvolutionConfig, type EvolutionSyncView } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';

// An Evolution number's own columns (migration 20261106000700, docs/19 «Evolution driver»): its
// options, the last push read back, and the restriction switch-off. Never a secret.

/** messages.error_code of a row its Evolution number can no longer send (staff resend it). */
export const EVOLUTION_NUMBER_OFF = 'evolution_number_off';
/** messages.error_code of one of our sends WhatsApp answered ERROR (MESSAGES_UPDATE). */
export const EVOLUTION_SEND_ERROR = 'evolution_error';
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

  /** An enabled Evolution number's ERROR trip and when it was last enabled; null otherwise. */
  async errorWindow(id: string): Promise<{ trip: number; enabledAt: string } | null> {
    const { data, error } = await this.db.from('wa_numbers')
      .select('evolution_config, evolution_enabled_at')
      .eq('id', id).eq('provider', 'evolution').eq('enabled', true).maybeSingle();
    if (error) throw new Error(`evolution error window read failed: ${error.message}`);
    const enabledAt = data?.evolution_enabled_at;
    if (!data || !enabledAt) return null;
    return { trip: evolutionConfigOf(data.evolution_config).limits.error_trip, enabledAt };
  }

  /** Our sends from this number since `since` that WhatsApp answered ERROR. */
  async countErrors(numberId: string, since: Date): Promise<number> {
    const { count, error } = await this.db.from('messages').select('id', { count: 'exact', head: true })
      .eq('number_id', numberId).eq('direction', 'outbound').eq('error_code', EVOLUTION_SEND_ERROR)
      .gte('sent_at', since.toISOString());
    if (error) throw new Error(`evolution error count failed: ${error.message}`);
    return count ?? 0;
  }

  /**
   * Too many ERRORs: off, no longer the default, state `refused`. Only an enabled row last
   * ENABLED (evolution_enabled_at: never bumped by a state, sync or health write) before the
   * failed send (`sentAt`): a webhook replayed after an admin re-enabled it changes nothing.
   */
  async restrict(id: string, at: { now: Date; sentAt: string }): Promise<boolean> {
    const patch = {
      enabled: false, is_default: false, evolution_state: 'refused',
      evolution_state_at: at.now.toISOString(),
    };
    const { data, error } = await this.db.from('wa_numbers').update(patch)
      .eq('id', id).eq('provider', 'evolution').eq('enabled', true)
      .lte('evolution_enabled_at', at.sentAt)
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
