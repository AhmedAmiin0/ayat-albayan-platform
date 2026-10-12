import type { TemplateView } from '@ab/shared';
import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../../common/audit/audit.service';
import { REGISTRY_ENTITY_ID, toTemplateView } from './template.mapper';
import { TemplatesQueries } from './templates.queries';

/**
 * The restricted allow-list (owner 2026-10-12, docs/16): the admin offers a template to every role
 * without templates.send_all (teachers, sales, the classroom assistant, custom roles), or stops
 * offering it. Those roles list and send only these (restrictedMay). Audited.
 */
@Injectable()
export class TemplateStarters {
  constructor(
    private readonly queries: TemplatesQueries,
    private readonly audit: AuditService,
  ) {}

  /** PATCH /messaging/templates/:key/starter. 404 template_not_found for an unknown key. */
  async set(key: string, on: boolean, actorId: string): Promise<TemplateView> {
    const row = await this.queries.get(key);
    if (!row) throw new NotFoundException({ code: 'template_not_found', message: 'template_not_found' });
    const updated = await this.queries.update(key, { sales_starter: on });
    await this.audit.record({
      actorId,
      entity: 'message_templates',
      entityId: REGISTRY_ENTITY_ID,
      action: 'template_starter_set',
      before: { key, sales_starter: row.sales_starter },
      after: { key, sales_starter: on },
    });
    return toTemplateView(updated ?? { ...row, sales_starter: on });
  }
}
