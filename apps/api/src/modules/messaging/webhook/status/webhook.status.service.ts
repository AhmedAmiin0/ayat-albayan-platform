import { ar } from '@/common/infra/i18n/server-text';
import { Injectable } from '@nestjs/common';
import { PushService } from '@/common/push/push.service';
import { ExternalStatus } from '@/modules/messaging/webhook/external/external-status';
import type { EchoEvent, StatusEvent } from '@/modules/messaging/webhook/webhook.events';
import { WebhookRepo, type OutboundRow } from '@/modules/messaging/webhook/webhook.repo';
import { statusPatch } from './webhook.status';

const TEMPLATE_NAMES: Record<string, string> = ar.templates.names;
/** How much of a session text names it in the reminder_failed push. */
const EXCERPT = 40;

/** «{template}» of the reminder_failed push: the template's Arabic name, else the text's start. */
export function failedLabel(row: Pick<OutboundRow, 'template_key' | 'body'>): string {
  if (row.template_key) return TEMPLATE_NAMES[row.template_key] ?? row.template_key;
  return (row.body ?? '').slice(0, EXCERPT);
}

/**
 * Meta delivery statuses → our outbound rows (R-MSG-05), matched by wa_message_id. A status for a
 * wamid we hold no row for is ignored (the CRM's, before cut-over), except on a Kapso number: there
 * staff also send from Kapso's inbox, so the message is read back and stored first (external/), and
 * its later statuses move it forward here. failed → reminder_failed push (only for a row we had).
 */
@Injectable()
export class StatusService {
  constructor(
    private readonly queries: WebhookRepo,
    private readonly push: PushService,
    private readonly external: ExternalStatus,
  ) {}

  async handle(e: StatusEvent): Promise<void> {
    // Two tries: the compare-and-set loses only when another status landed meanwhile.
    for (let attempt = 0; attempt < 2; attempt++) {
      const row = await this.queries.outboundByWaId(e.waMessageId);
      if (row) {
        if (await this.move(row, e)) return;
        continue;
      }
      // Stored (with this status) or found stored: the next pass moves it on if it is behind.
      if (attempt > 0 || !(await this.external.adopt(e))) return;
    }
  }

  /** false = another status landed meanwhile (compare-and-set lost): read the row again. */
  private async move(row: OutboundRow, e: StatusEvent): Promise<boolean> {
    const patch = statusPatch(row, e);
    if (!patch) return true;
    if (!(await this.queries.moveStatus({ id: row.id, from: row.status, patch }))) return false;
    // Only for a message we sent: one sent outside the app (attempts 0) never pushes.
    if (patch.status === 'failed' && row.attempts > 0) await this.pushFailed(row, e.waMessageId);
    return true;
  }

  /** A message sent from the WhatsApp Business app (smb_message_echoes): stored like one from Kapso's inbox. */
  async echo(e: EchoEvent): Promise<void> {
    await this.external.echo(e);
  }

  /** Keyed by the send (wamid), so a row that fails again after the admin's retry pushes again. */
  private async pushFailed(row: OutboundRow, waMessageId: string): Promise<void> {
    const name = row.guardians?.name ?? row.leads?.name ?? row.phone_e164;
    await this.push.notifyAdmins('reminder_failed', {
      subject: `${row.id}:${waMessageId}`,
      vars: { template: failedLabel(row), name },
      data: { phone: row.phone_e164, messageId: row.id },
    });
  }
}
