import type { TablesUpdate } from '@ab/db';
import { crmTemplateName } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { stampDelivered } from '@/modules/messaging/whatsapp';
import { UNCERTAIN_CODES, type TemplateNames, type UncertainRow } from './crm-match';
import { isUniqueViolation } from '@/common/db/errors';

// The crm confirm's compare-and-set write (docs/19), shaped like manual-echo.repo.ts.

/** Postgres unique_violation: the wamid is already on another row (a concurrent store). */
const COLUMNS =
  'id, phone_e164, body, template_key, created_at, line, number_id, lead_id, dedup_key';
const fail = (what: string, message: string): Error => new Error(`${what} failed: ${message}`);

/** The attach: the row, the CRM message's wamid, its status and times (attachPatch). */
export interface ConfirmWrite {
  row: UncertainRow;
  waMessageId: string;
  patch: TablesUpdate<'messages'>;
}

/** Created in the span, at most `limit` (the newest first). */
interface UncertainSpan {
  since: Date;
  until: Date;
  limit: number;
}

@Injectable()
export class CrmConfirmRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /**
   * Failed outbound rows with no wamid and an uncertain code (any line: the caller keeps crm ones).
   */
  async uncertain(span: UncertainSpan): Promise<UncertainRow[]> {
    const { data, error } = await this.db
      .from('messages')
      .select(COLUMNS)
      .eq('direction', 'outbound')
      .eq('status', 'failed')
      .is('wa_message_id', null)
      .in('error_code', [...UNCERTAIN_CODES])
      .gte('created_at', span.since.toISOString())
      .lte('created_at', span.until.toISOString())
      .order('created_at', { ascending: false })
      .limit(span.limit);
    if (error) throw fail('uncertain rows read', error.message);
    return data;
  }

  /** The wamids some row already holds (never attached twice). */
  async held(waMessageIds: readonly string[]): Promise<Set<string>> {
    if (waMessageIds.length === 0) return new Set();
    const { data, error } = await this.db
      .from('messages')
      .select('wa_message_id')
      .in('wa_message_id', [...waMessageIds]);
    if (error) throw fail('held wamids read', error.message);
    return new Set(data.flatMap((r) => r.wa_message_id ?? []));
  }

  /** Each key's names on the CRM: the one crm-body.ts sends (crmTemplateName) and its meta_name. */
  async templateNames(keys: readonly string[]): Promise<TemplateNames> {
    if (keys.length === 0) return new Map();
    const { data, error } = await this.db
      .from('message_templates')
      .select('key, meta_name, language, crm_name, crm_language')
      .in('key', [...new Set(keys)]);
    if (error) throw fail('template names read', error.message);
    return new Map(data.map((t) => [t.key, [crmTemplateName(t), t.meta_name]]));
  }

  /** false = the row moved meanwhile (a retry, a hand mark) or another row took the wamid. */
  async attach(w: ConfirmWrite): Promise<boolean> {
    const { data, error } = await this.db
      .from('messages')
      .update({ ...w.patch, wa_message_id: w.waMessageId, error_code: null, error_text: null })
      .eq('id', w.row.id)
      .eq('status', 'failed')
      .is('wa_message_id', null)
      .in('error_code', [...UNCERTAIN_CODES])
      .select('id');
    if (isUniqueViolation(error)) return false;
    if (error) throw fail('crm confirm attach', error.message);
    if (data.length === 0) return false;
    const at = w.patch.sent_at ?? new Date().toISOString();
    await stampDelivered(this.db, { leadId: w.row.lead_id, dedupKey: w.row.dedup_key, at });
    return true;
  }
}
