import { InternalServerErrorException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { AuditService } from '@/common/audit/audit.service';
import { CustomConfigController } from './custom-config.controller';
import type { CustomConfigService } from './custom-config.service';

const VIEW = {
  key: 'promo',
  value: 'hi',
  description: null,
  isPublic: true,
  updatedAt: '2026-10-05T00:00:00+00:00',
  updatedBy: null,
};

const controllerAnswering = (views: unknown[]) => {
  const custom = { list: vi.fn().mockResolvedValue(views) };
  const audit = { record: vi.fn() };
  return new CustomConfigController(
    custom as unknown as CustomConfigService,
    audit as unknown as AuditService,
  );
};

describe('GET /config/custom answer', () => {
  it('passes entries inside the shared schema through unchanged', async () => {
    await expect(controllerAnswering([VIEW]).list()).resolves.toEqual([VIEW]);
  });

  it('is 500 response_invalid for a time or saver outside the schema', async () => {
    for (const bad of [{ updatedAt: '2026-10-05 00:00' }, { updatedBy: 'someone' }]) {
      const answer = controllerAnswering([{ ...VIEW, ...bad }]).list();
      await expect(answer).rejects.toBeInstanceOf(InternalServerErrorException);
    }
  });
});
