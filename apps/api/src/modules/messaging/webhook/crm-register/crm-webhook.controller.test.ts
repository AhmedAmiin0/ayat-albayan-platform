import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { describe, expect, it, vi } from 'vitest';
import { IS_PUBLIC, PERMISSION } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import type { AuditService } from '@/common/audit/audit.service';
import { CrmWebhookController } from './crm-webhook.controller';
import { FAKE_SECRET, registrarKit, TARGET } from './crm-webhook.fakes';

// «التكاملات» › the CRM's delivery-ticks webhook: admin-only, like the secrets PUT. No network.

const ADMIN: AuthUser = { id: 'a0000000-0000-4000-8000-000000000001', email: null, role: 'admin' };

function controllerKit() {
  const kit = registrarKit();
  const record = vi.fn(async () => undefined);
  const audit: Pick<AuditService, 'record'> = { record };
  const controller = new CrmWebhookController(kit.registrar, audit);
  return { ...kit, record, controller };
}

describe('CrmWebhookController', () => {
  it('is POST /settings/integrations/crm-webhook with settings.write (the secrets PUT’s permission)', () => {
    const handler = CrmWebhookController.prototype.register;
    expect(Reflect.getMetadata(PATH_METADATA, CrmWebhookController)).toBe(
      'settings/integrations/crm-webhook',
    );
    expect(Reflect.getMetadata(PERMISSION, CrmWebhookController)).toBe('settings.write');
    expect(Reflect.getMetadata(IS_PUBLIC, CrmWebhookController)).toBeUndefined();
    expect(Reflect.getMetadata(IS_PUBLIC, handler)).toBeUndefined();
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(RequestMethod.POST);
  });

  it('answers {data:{id,url,events,replaced}}, never the secret', async () => {
    const kit = controllerKit();
    const res = await kit.controller.register(ADMIN);
    expect(res).toEqual({
      data: { id: 'new-1', url: TARGET, events: ['message.status_updated'], replaced: 0 },
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
