import { crmWebhookRoutes } from '@ab/shared';
import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { DECORATORS } from '@nestjs/swagger/dist/constants';
import { describe, expect, it, vi } from 'vitest';
import { IS_PUBLIC, PERMISSION } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import type { AuditService } from '@/common/audit/audit.service';
import { routeOf } from '@/common/http/route';
import { CrmWebhookController } from '@/modules/messaging/webhook/crm-register/crm-webhook.controller';
import { FAKE_SECRET, IDS, registrarKit, TARGET } from './crm-webhook.fakes';

// Admin-only, like the secrets PUT; no network.

const ADMIN: AuthUser = { id: 'a0000000-0000-4000-8000-000000000001', email: null, role: 'admin' };

function controllerKit() {
  const kit = registrarKit();
  const record = vi.fn(async () => undefined);
  const audit: Pick<AuditService, 'record'> = { record };
  const controller = new CrmWebhookController(kit.registrar, audit);
  return { ...kit, record, controller };
}

describe('CrmWebhookController', () => {
  it('serves its route object: POST, settings.write on the route, the settings tag', () => {
    const handler = CrmWebhookController.prototype.register;
    expect(routeOf(handler)).toBe(crmWebhookRoutes.register);
    expect(Reflect.getMetadata(PATH_METADATA, CrmWebhookController)).toBe('/');
    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe('/settings/integrations/crm-webhook');
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(RequestMethod.POST);
    expect(Reflect.getMetadata(PERMISSION, CrmWebhookController)).toBeUndefined();
    expect(Reflect.getMetadata(PERMISSION, handler)).toEqual(['settings.write']);
    expect(Reflect.getMetadata(DECORATORS.API_TAGS, handler)).toEqual(['settings']);
    expect(Reflect.getMetadata(IS_PUBLIC, CrmWebhookController)).toBeUndefined();
    expect(Reflect.getMetadata(IS_PUBLIC, handler)).toBeUndefined();
  });

  it('answers {data:{id,url,events,replaced}}, never the secret', async () => {
    const kit = controllerKit();
    const res = await kit.controller.register(ADMIN);
    expect(res).toEqual({
      data: { id: IDS.created, url: TARGET, events: ['message.status_updated', 'message.received'], replaced: 0 },
    });
    expect(JSON.stringify(res)).not.toContain(FAKE_SECRET);
  });

  it('audits the key name and the endpoint id only', async () => {
    const kit = controllerKit();
    await kit.controller.register(ADMIN);
    expect(kit.record).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        actorId: ADMIN.id,
        entity: 'integration_config',
        action: 'secret_set:WACRM_WEBHOOK_SECRET',
      }),
    );
    expect(JSON.stringify(kit.record.mock.calls)).not.toContain(FAKE_SECRET);
  });

  it('a refusal audits nothing', async () => {
    const kit = controllerKit();
    kit.source.line = () => null;
    await expect(kit.controller.register(ADMIN)).rejects.toThrow();
    expect(kit.record).not.toHaveBeenCalled();
  });
});
