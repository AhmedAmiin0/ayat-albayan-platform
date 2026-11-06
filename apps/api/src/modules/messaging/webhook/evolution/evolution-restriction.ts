import { Injectable, Logger } from '@nestjs/common';
import { PushService } from '@/common/push/push.service';
import { overlayNumbers } from '@/common/configuration/integrations/numbers-overlay';
import { NumbersEvolution } from '@/modules/messaging/numbers';
import type { StatusEvent } from '@/modules/messaging/webhook/webhook.events';
import { EVOLUTION_RESTRICTED } from '@/modules/messaging/webhook/parse/webhook.evolution';

// WhatsApp restricted an Evolution number (a late 463 / 475 ERROR, docs/19 «Evolution driver»):
// the number is switched off at once (only an admin turns it back on), its queued rows fail so
// staff resend them, and the admins' bell rings once. A 401 / 403 from Evolution is an auth
// problem and never lands here.

const WORDS = 'قيّد واتساب هذا الرقم (463/475) فأُوقف تلقائيًا. لا يُعاد تشغيله إلا يدويًا';

const restricted = (e: StatusEvent): boolean => e.errorCode === EVOLUTION_RESTRICTED;

@Injectable()
export class EvolutionRestriction {
  private readonly log = new Logger(EvolutionRestriction.name);

  constructor(
    private readonly numbers: NumbersEvolution,
    private readonly push: PushService,
  ) {}

  /** Switches the number off when any of these statuses says it was restricted. */
  async check(events: readonly StatusEvent[], at: { numberId: string; now: Date }): Promise<void> {
    if (!events.some(restricted)) return;
    if (!(await this.numbers.restrict(at.numberId, at.now))) return;
    const label = overlayNumbers()?.find((n) => n.id === at.numberId)?.label ?? 'Evolution';
    this.log.error(`evolution number ${at.numberId} restricted by WhatsApp: switched off`);
    await this.push.notifyAdmins('reminder_failed', {
      subject: `evolution_restricted:${at.numberId}:${at.now.toISOString().slice(0, 10)}`,
      vars: { template: WORDS, name: label },
      data: { numberId: at.numberId },
    });
  }
}
