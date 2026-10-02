import ar from '@ab/shared/i18n/ar.json';
import { Injectable } from '@nestjs/common';
import { PushService } from '../../common/push/push.service';
import type { StatusEvent } from './webhook.events';
import { WebhookQueries, type OutboundRow } from './webhook.queries';
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
 * wamid we never sent (the CRM's, before cut-over) is ignored. failed → reminder_failed push.
 */
@Injectable()
export class StatusService {
  constructor(
    private readonly queries: WebhookQueries,
    private readonly push: PushService,
  ) {}

  async handle(e: StatusEvent): Promise<void> {
    // Two tries: the compare-and-set loses only when another status landed meanwhile.
    for (let attempt = 0; attempt < 2; attempt++) {
      const row = await this.queries.outboundByWaId(e.waMessageId);
      const patch = row && statusPatch(row, e);
      if (!row || !patch) return;
      if (await this.queries.moveStatus({ id: row.id, from: row.status, patch })) {
        if (patch.status === 'failed') await this.pushFailed(row);
        return;
      }
    }
  }

  private async pushFailed(row: OutboundRow): Promise<void> {
    const name = row.guardians?.name ?? row.leads?.name ?? row.phone_e164;
    await this.push.notifyAdmins('reminder_failed', {
      subject: row.id,
      vars: { template: failedLabel(row), name },
      data: { phone: row.phone_e164, messageId: row.id },
    });
  }
}
