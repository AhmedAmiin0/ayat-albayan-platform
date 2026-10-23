import type { SendGateView } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';
import { allowedRecipients, loadEnv, sendingAllowed, whatsappEnv, type Env } from '../../env';
import { WhatsappSettings } from './whatsapp.settings';

/**
 * The one send gate (docs/12 §3.1): WhatsApp configured and the admin's kill switch
 * (settings.messaging_enabled, fail-closed: only a stored true). No env fuse (docs/23 owner answer 2).
 * Closed → rows stay queued; nothing fails, nothing is lost. B2 asks it before an immediate send to
 * tell the admin «inbox.messagingOff».
 */
@Injectable()
export class SendGate {
  constructor(
    private readonly settings: WhatsappSettings,
    @Inject(DB) private readonly db: Db,
  ) {}

  /** Read per call: the integration config may change at runtime. */
  private get env(): Env {
    return loadEnv();
  }

  async open(): Promise<boolean> {
    if (!sendingAllowed(this.env, true)) return false; // WhatsApp not configured: skip the DB read
    return sendingAllowed(this.env, (await this.settings.read()).messaging_enabled);
  }

  /** settings.auto_messages_enabled: job-made reminders, follow-ups and renewals go out only when ON. */
  async automaticOn(): Promise<boolean> {
    return (await this.settings.read()).auto_messages_enabled;
  }

  /**
   * GET /messages/gate: which gate is closed, and the queue that goes out the moment all are open.
   * `restricted` only when WA_ALLOWED_RECIPIENTS is set (docs/12 §13.5): absent otherwise.
   */
  async view(): Promise<SendGateView> {
    const [state, queued] = await Promise.all([this.state(), this.queuedCount()]);
    return { ...state, queued, ...(allowedRecipients(this.env) ? { restricted: true } : {}) };
  }

  /** Which gate is closed, for the admin: WhatsApp config, or their own switch. */
  async state(): Promise<Omit<SendGateView, 'queued'>> {
    if (!whatsappEnv(this.env)) return { open: false, reason: 'not_configured' };
    const on = (await this.settings.read()).messaging_enabled === true;
    return on ? { open: true, reason: null } : { open: false, reason: 'switch_off' };
  }

  private async queuedCount(): Promise<number> {
    const { count, error } = await this.db
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('direction', 'outbound')
      .eq('status', 'queued');
    if (error) throw new Error(`queue count failed: ${error.message}`);
    return count ?? 0;
  }
}
