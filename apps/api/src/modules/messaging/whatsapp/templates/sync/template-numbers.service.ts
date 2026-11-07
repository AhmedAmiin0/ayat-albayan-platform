import type {
  TemplateLineSync, TemplateNumberSetView, TemplateNumberSyncView, WaLine,
} from '@ab/shared';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { AuditService } from '@/common/audit/audit.service';
import {
  activeNumberId, overlayNumbers,
} from '@/common/configuration/integrations/numbers-overlay';
import type { WhatsappEnv } from '@/config/env/env';
import { whatsappClient } from '@/modules/messaging/whatsapp/client-factory';
import { setTemplateNumber, type NumberSetInput } from './template-number-set';
import { rememberSync, syncLine } from './template-line-sync';
import { syncNumber } from './template-number-sync';
import { TemplatesRepo } from '@/modules/messaging/whatsapp/templates/catalog/templates.repo';
import { WHATSAPP_LINES, type WhatsappLines } from '@/modules/messaging/whatsapp/whatsapp.types';

/**
 * Templates per number (docs/23 phase 5, docs/23c decision 9): a template's own number and one number's
 * sync with its WABA. The sync's client is built from that number's overlay entry only (its row + its
 * Vault secrets); it lists templates and never sends, so the allow-list does not apply. Under
 * legacy (and for a crm role number) it is the line's own sync, exactly as «القوالب» runs it.
 */
@Injectable()
export class TemplateNumbers {
  private readonly log = new Logger(TemplateNumbers.name);

  constructor(
    private readonly queries: TemplatesRepo,
    private readonly audit: AuditService,
    @Inject(WHATSAPP_LINES) private readonly lines: WhatsappLines,
  ) {}

  /** PUT /messaging/templates/:key/number (template-number-set.ts). */
  setNumber(input: NumberSetInput, actorId: string): Promise<TemplateNumberSetView> {
    return setTemplateNumber({ queries: this.queries, audit: this.audit }, input, actorId);
  }

  /** POST /admin/numbers/:id/templates/sync (template-number-sync.ts). */
  sync(numberId: string, now: Date = new Date()): Promise<TemplateNumberSyncView> {
    const clientOf = (env: WhatsappEnv) => whatsappClient(env);
    const deps = { queries: this.queries, numbers: overlayNumbers, clientOf, log: this.log };
    const line = (l: WaLine, at: Date) => this.syncLine(l, at);
    return syncNumber({ ...deps, syncLine: line, activeNumberId }, numberId, now);
  }

  /** One line's sync, kept for «القوالب» (lineViews) as POST …/templates/health keeps it. */
  private async syncLine(line: WaLine, now: Date): Promise<TemplateLineSync> {
    const deps = { queries: this.queries, lines: this.lines, log: this.log };
    const result = await syncLine(deps, line, now);
    await rememberSync(deps, result);
    return result;
  }
}
