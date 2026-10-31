import { crmTemplateName, type WaLine } from '@ab/shared';
import { Injectable, Logger } from '@nestjs/common';
import { AuditService } from '@/common/audit/audit.service';
import { REGISTRY_ENTITY_ID } from '@/modules/messaging/whatsapp/templates/catalog/template.mapper';
import { TemplatesQueries } from '@/modules/messaging/whatsapp/templates/catalog/templates.queries';
import { WaError } from '@/modules/messaging/whatsapp/whatsapp.types';

// «تحقق من القالب» (owner 2026-10-31). The CRM's public API cannot list its templates (docs/19), so
// a crm line's statuses are set by hand and can go stale: a teacher reminder failed with Meta
// #132001 while our row said approved. The first send Meta refuses that way marks the row missing
// at once, so the sender stops reading its rows (sender.queries.ts due()) and «القوالب» shows which
// ones to fix.

/** Meta's «template name does not exist in the translation» (#132001), as the CRM passes it on. */
const ABSENT = /\b132001\b|does not exist in the translation/i;
const ERROR_MAX = 300;

/**
 * A crm send refused because the template (name + language) is not on the CRM's WhatsApp account.
 */
export function absentOnCrm(error: unknown): error is WaError {
  if (!(error instanceof WaError) || error.info.crmCode !== 'meta_error') return false;
  return ABSENT.test(`${error.info.details ?? ''} ${error.message}`);
}

interface FailedSend {
  /** messages.template_key; null for a session message. */
  key: string | null;
  /** The line it went from (module mode: its number's role). */
  line: WaLine;
  error: unknown;
  now: Date;
}

interface Absent {
  key: string;
  line: WaLine;
  error: WaError;
  now: Date;
}

/** MessageWorker calls check() after it records a failed send. */
@Injectable()
export class TemplateMissing {
  private readonly log = new Logger(TemplateMissing.name);

  constructor(
    private readonly queries: TemplatesQueries,
    private readonly audit: AuditService,
  ) {}

  /** Never throws: the send's own failure is already recorded, this is the registry's follow-up. */
  async check(send: FailedSend): Promise<void> {
    const { key, line, error, now } = send;
    if (!key || !absentOnCrm(error)) return;
    try {
      await this.mark({ key, line, error, now });
    } catch (e) {
      this.log.warn(`template ${key} not marked missing: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  /**
   * An approved row of the line it went from → missing, compare-and-set: one write and one audit
   * row however many sends fail at once. A row on another line (moved meanwhile) or already not
   * approved stays as it is. The admin marks it approved again once the CRM holds it («علِّمه
   * معتمدًا»). Only the key's own CRM name (crmTemplateName) counts: a row that went by a fallback
   * (crm-body.ts crmRowName: meta_name teacher_lesson_reminder_meet, not the CRM's
   * teacher_lesson_reminder) fails alone, or every later row of that key would stop.
   */
  private async mark(m: Absent): Promise<void> {
    const row = await this.queries.get(m.key);
    if (row?.status !== 'approved' || row.line !== m.line) return;
    const own = crmTemplateName(row);
    if (m.error.info.template !== own) {
      this.log.warn(`template ${m.key} kept: #132001 for ${m.error.info.template ?? '?'}, not ${own}`);
      return;
    }
    const last_error = (m.error.info.details ?? m.error.message).slice(0, ERROR_MAX);
    const patch = { status: 'missing' as const, last_error, last_checked_at: m.now.toISOString() };
    if (!(await this.queries.update(m.key, patch, 'approved'))) return;
    this.log.warn(`template ${m.key} marked missing on ${m.line}: Meta #132001 through the CRM`);
    await this.audit.record({
      actorId: null,
      entity: 'message_templates',
      entityId: REGISTRY_ENTITY_ID,
      action: 'template_marked_missing',
      before: { key: m.key, status: 'approved', line: m.line },
      after: { key: m.key, status: 'missing', line: m.line, error: last_error },
    });
  }
}
