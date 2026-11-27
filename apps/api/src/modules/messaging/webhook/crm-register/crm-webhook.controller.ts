import { crmWebhookRoutes as routes, type CrmWebhookAnswer } from '@ab/shared';
import { Controller, HttpCode, Inject } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AuditService } from '@/common/audit/audit.service';
import { CurrentUser } from '@/common/auth/decorators';
import { INTEGRATIONS_ENTITY_ID } from '@/common/configuration/integrations/integration-config.service';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route } from '@/common/http/route';
import { CrmWebhookRegistrar } from './crm-webhook.service';

/** settings.write, like the secrets PUT (docs/19); answer and audit never hold the secret. */
@ApiBearerAuth()
@Controller()
export class CrmWebhookController {
  constructor(
    private readonly registrar: CrmWebhookRegistrar,
    @Inject(AuditService) private readonly audit: Pick<AuditService, 'record'>,
  ) {}

  @Route(routes.register)
  @HttpCode(200)
  async register(@CurrentUser() user: AuthUser): Promise<CrmWebhookAnswer> {
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
