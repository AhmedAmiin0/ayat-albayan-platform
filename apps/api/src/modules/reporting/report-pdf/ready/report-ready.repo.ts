import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { approvedTemplates } from '@/modules/messaging/reminders';
import type { ReportLinkKey } from './report-link-message';

const LINK_KEYS: readonly ReportLinkKey[] = ['report_ready_family', 'report_ready_teacher'];

/** Which link templates the CRM / Meta approved (message_templates.status), read per render. */
@Injectable()
export class ReportReadyRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  approved(): Promise<Set<string>> {
    return approvedTemplates(this.db, LINK_KEYS);
  }
}
