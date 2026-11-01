import { Injectable } from '@nestjs/common';
import { AuditService } from '@/common/audit/audit.service';
import { SINGLETON_ENTITY_ID } from '@/common/audit/singleton-entity';
import { CrmMediaCopyRepo, type CrmCopyCounts } from './crm-media-copy.repo';
import { CrmMediaCopySettings } from './crm-media-copy.settings';

/**
 * The end of a copy-all run (no row left to copy): ONE audit row with the totals, then the switch back
 * off. Audit first, so a run never ends without its row; if the switch-off then fails, the next tick
 * retries only the switch-off (`audited`), so the row is not written twice (one process).
 */
@Injectable()
export class CrmMediaCopyDone {
  constructor(
    private readonly queries: CrmMediaCopyRepo,
    private readonly settings: CrmMediaCopySettings,
    private readonly audit: AuditService,
  ) {}

  private audited: CrmCopyCounts | null = null;

  async finish(host: string): Promise<CrmCopyCounts> {
    const counts = this.audited ?? (await this.record(host));
    this.audited = counts;
    await this.settings.turnOff();
    this.audited = null;
    return counts;
  }

  private async record(host: string): Promise<CrmCopyCounts> {
    const counts = await this.queries.counts(host);
    await this.audit.record({
      actorId: null,
      entity: 'settings',
      entityId: SINGLETON_ENTITY_ID,
      action: 'crm_media_copy_done',
      after: { ...counts },
    });
    return counts;
  }
}
