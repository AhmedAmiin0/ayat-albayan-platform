import type { SendGateView } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';
import { loadEnv, sendingAllowed, whatsappEnv } from '../../env';
import { SettingsService } from '../../common/settings/settings.service';

/**
 * The one send gate (docs/12 §3.1): env MESSAGING_ENABLED, WhatsApp configured, and the admin's
 * kill switch (settings.messaging_enabled). Closed → rows stay queued; nothing fails, nothing is
 * lost. B2 asks it before an immediate send to tell the admin «inbox.messagingOff».
 */
@Injectable()
export class SendGate {
  private readonly env = loadEnv();

  constructor(
    private readonly settings: SettingsService,
    @Inject(DB) private readonly db: Db,
  ) {}

  async open(): Promise<boolean> {
    if (!sendingAllowed(this.env, true)) return false; // the deployment says no: skip the DB read
    return sendingAllowed(this.env, (await this.settings.all()).messaging_enabled);
  }

  /** settings.auto_messages_enabled: job-made reminders, follow-ups and renewals go out only when ON. */
  async automaticOn(): Promise<boolean> {
    return (await this.settings.all()).auto_messages_enabled;
  }

  /** GET /messages/gate: which gate is closed, and the queue that goes out the moment all are open. */
  async view(): Promise<SendGateView> {
    const [state, queued] = await Promise.all([this.state(), this.queuedCount()]);
    return { ...state, queued };
  }

  /** Which gate is closed, for the admin: the server's env, WhatsApp config, or their own switch. */
  async state(): Promise<Omit<SendGateView, 'queued'>> {
    if (!this.env.MESSAGING_ENABLED) return { open: false, reason: 'env_off' };
    if (!whatsappEnv(this.env)) return { open: false, reason: 'not_configured' };
    const on = (await this.settings.all()).messaging_enabled;
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
