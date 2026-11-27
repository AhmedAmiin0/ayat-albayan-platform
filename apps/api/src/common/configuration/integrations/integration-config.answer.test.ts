import { InternalServerErrorException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { AuditService } from '@/common/audit/audit.service';
import { IntegrationConfigController } from './integration-config.controller';
import type { IntegrationConfigService } from './integration-config.service';

const ITEM = {
  key: 'WA_WABA_ID',
  group: 'wa_notifications',
  secret: false,
  value: 'db-waba',
  set: true,
  source: 'db',
  updated_at: '2026-10-12T08:00:00Z',
};

const controllerAnswering = (items: unknown[]) => {
  const config = { items: vi.fn().mockResolvedValue(items) };
  const audit = { record: vi.fn() };
  return new IntegrationConfigController(
    config as unknown as IntegrationConfigService,
    audit as unknown as AuditService,
  );
};

describe('GET /settings/integrations answer', () => {
  it('passes items inside the shared schema through unchanged', async () => {
    await expect(controllerAnswering([ITEM]).list()).resolves.toEqual([ITEM]);
  });

  it('is 500 response_invalid for a source or time outside the schema', async () => {
    for (const bad of [{ source: 'vault' }, { updated_at: '2026-10-12 08:00' }]) {
      const answer = controllerAnswering([{ ...ITEM, ...bad }]).list();
      await expect(answer).rejects.toBeInstanceOf(InternalServerErrorException);
    }
  });
});
