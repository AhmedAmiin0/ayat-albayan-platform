import type {
  TemplateLineSync, TemplateNumberSetView, TemplateNumberSyncView, WaLine,
} from '@ab/shared';
import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { CrmCopiesRepo } from '@/modules/messaging/whatsapp/messages/crm-sent/crm-copies.repo';
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

/** docs/23c decision 9: the client uses only that number's overlay; lists, never sends. */
@Injectable()
export class TemplateNumbers {
  private readonly log = new Logger(TemplateNumbers.name);

  constructor(
    private readonly queries: TemplatesRepo,
    private readonly audit: AuditService,
    @Inject(WHATSAPP_LINES) private readonly lines: WhatsappLines,
    @Optional() @Inject(CrmCopiesRepo) private readonly copies?: CrmCopiesRepo,
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

  /** Kept like POST .../templates/health keeps it. */
  private async syncLine(line: WaLine, now: Date): Promise<TemplateLineSync> {
    const deps = { queries: this.queries, lines: this.lines, log: this.log, copies: this.copies };
    const result = await syncLine(deps, line, now);
    await rememberSync(deps, result);
    return result;
  }
}
