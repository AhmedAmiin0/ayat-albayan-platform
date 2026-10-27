import { Injectable } from '@nestjs/common';
import { AuditService } from '../../../../../common/audit/audit.service';
import { SINGLETON_ENTITY_ID } from '../../../../../common/audit/singleton-entity';
import { CrmMediaCopyQueries, type CrmCopyCounts } from './crm-media-copy.queries';
import { CrmMediaCopySettings } from './crm-media-copy.settings';

/**
 * The end of a copy-all run (no row left to copy): the switch back off, then ONE audit row with the
 * totals. Switch first: if it fails the next tick tries again and no audit row was written yet.
 */
@Injectable()
export class CrmMediaCopyDone {
  constructor(
    private readonly queries: CrmMediaCopyQueries,
    private readonly settings: CrmMediaCopySettings,
    private readonly audit: AuditService,
  ) {}

  async finish(host: string): Promise<CrmCopyCounts> {
    const counts = await this.queries.counts(host);
    await this.settings.turnOff();
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
