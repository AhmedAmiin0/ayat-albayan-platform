import { Controller, HttpCode, Inject, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuditService } from '@/common/audit/audit.service';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import type { CrmWebhookResult } from './crm-webhook.schemas';
import { CrmWebhookRegistrar } from './crm-webhook.service';

/** audit_log.entity_id of the integration config, as the «التكاملات» secret writes use it. */
const INTEGRATIONS_ENTITY_ID = '00000000-0000-0000-0000-000000000000';

/**
 * «ربط علامات التسليم من CRM تلقائيًا» in «التكاملات» (docs/19 «crm driver»): same permission as
 * PUT /settings/integrations/secrets/:key. Registers the CRM's delivery-ticks webhook and stores
 * its secret; the answer and the audit row hold the endpoint id and key name, never the secret.
 */
@ApiTags('settings')
@ApiBearerAuth()
@Permissions('settings.write')
@Controller('settings/integrations/crm-webhook')
export class CrmWebhookController {
  constructor(
    private readonly registrar: CrmWebhookRegistrar,
    @Inject(AuditService) private readonly audit: Pick<AuditService, 'record'>,
  ) {}

  @Post()
  @HttpCode(200)
  async register(@CurrentUser() user: AuthUser): Promise<{ data: CrmWebhookResult }> {
    const data = await this.registrar.register();
    await this.audit.record({
      actorId: user.id,
      entity: 'integration_config',
      entityId: INTEGRATIONS_ENTITY_ID,
      action: 'secret_set:WACRM_WEBHOOK_SECRET',
      before: null,
      after: { keys: ['WACRM_WEBHOOK_SECRET'], crm_webhook: data.id, replaced: data.replaced },
    });
    return { data };
  }
}
