import type { TemplateNumberSetView, TemplateNumberSyncView } from '@ab/shared';
import { Injectable, Logger } from '@nestjs/common';
import { AuditService } from '../../common/audit/audit.service';
import { overlayNumbers } from '../../common/integrations/numbers-overlay';
import type { WhatsappEnv } from '../../env';
import { whatsappClient } from './client-factory';
import { setTemplateNumber, type NumberSetInput } from './template-number-set';
import { syncNumber } from './template-number-sync';
import { TemplatesQueries } from './templates.queries';

/**
 * Templates per number (docs/23 phase 5, docs/23c decision 9): a template's own number and one number's
 * sync with its WABA. The sync's client is built from that number's overlay entry only (its row + its
 * Vault secrets); it lists templates and never sends, so the allow-list does not apply.
 */
@Injectable()
export class TemplateNumbers {
  private readonly log = new Logger(TemplateNumbers.name);

  constructor(
    private readonly queries: TemplatesQueries,
    private readonly audit: AuditService,
  ) {}

  /** PUT /messaging/templates/:key/number (template-number-set.ts). */
  setNumber(input: NumberSetInput, actorId: string): Promise<TemplateNumberSetView> {
    return setTemplateNumber({ queries: this.queries, audit: this.audit }, input, actorId);
  }

  /** POST /admin/numbers/:id/templates/sync (template-number-sync.ts). */
  sync(numberId: string, now: Date = new Date()): Promise<TemplateNumberSyncView> {
    const clientOf = (env: WhatsappEnv) => whatsappClient(env);
    return syncNumber({ queries: this.queries, numbers: overlayNumbers, clientOf, log: this.log }, numberId, now);
  }
}
