import { Injectable } from '@nestjs/common';
import { loadEnv, sendingAllowed } from '../../env';
import { SettingsService } from '../../common/settings/settings.service';

/**
 * The one send gate (docs/12 §3.1): env MESSAGING_ENABLED, WhatsApp configured, and the admin's
 * kill switch (settings.messaging_enabled). Closed → rows stay queued; nothing fails, nothing is
 * lost. B2 asks it before an immediate send to tell the admin «inbox.messagingOff».
 */
@Injectable()
export class SendGate {
  private readonly env = loadEnv();

  constructor(private readonly settings: SettingsService) {}

  async open(): Promise<boolean> {
    if (!sendingAllowed(this.env, true)) return false; // the deployment says no: skip the DB read
    return sendingAllowed(this.env, (await this.settings.all()).messaging_enabled);
  }
}
