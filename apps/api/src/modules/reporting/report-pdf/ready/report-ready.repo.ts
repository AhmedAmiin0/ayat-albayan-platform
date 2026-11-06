import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { dbError } from '@/common/http/http';
import type { ReportLinkKey } from './report-link-message';

const LINK_KEYS: readonly ReportLinkKey[] = ['report_ready_family', 'report_ready_teacher'];

/**
 * Which link templates the CRM / Meta approved (message_templates.status), read per render. Read
 * here, not through the reminders module: that module imports the reports module (a load cycle).
 */
@Injectable()
export class ReportReadyRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  async approved(): Promise<Set<string>> {
    const { data, error } = await this.db
      .from('message_templates')
      .select('key')
      .in('key', [...LINK_KEYS])
      .eq('status', 'approved');
    if (error) throw dbError(error);
    return new Set(data.map((r) => r.key));
  }
}
