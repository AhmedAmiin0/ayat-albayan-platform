import type { TablesInsert } from '@ab/db';
import { Injectable, Logger } from '@nestjs/common';
import { AuditService } from '@/common/audit/audit.service';

const last4 = (phone: string): string => `…${phone.slice(-4)}`;
const messageOf = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/**
 * The starter template a send queued after the window (owner 2026-11-07: only a send queues it),
 * audited as `thread_reopen_template` under the staff member who pressed send (the row's
 * created_by), as the old on-open path audited it. Never throws: the template is queued, so a
 * lost audit line never fails the held message.
 */
@Injectable()
export class ReopenAudit {
  private readonly log = new Logger('ReopenAudit');

  constructor(private readonly audit: AuditService) {}

  async record(row: TablesInsert<'messages'>, id: string): Promise<void> {
    try {
      await this.audit.record({
        actorId: row.created_by ?? null,
        entity: 'messages',
        entityId: id,
        action: 'thread_reopen_template',
        before: null,
        after: { phone: row.phone_e164, template_key: row.template_key ?? null, status: 'queued' },
      });
    } catch (e) {
      this.log.warn(`reopen audit failed for ${last4(row.phone_e164)}: ${messageOf(e)}`);
    }
  }
}
