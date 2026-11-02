import type { ModuleRef } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { IntegrationConfigService } from '@/common/configuration/integrations/integration-config.service';
import { NumbersConfig } from '@/modules/messaging/numbers';
import { RELOAD_GAP_MS, WebhookConfigReload } from './webhook.reload';

function setup(fail = false) {
  const integration = { reloadHere: vi.fn(async () => (fail ? Promise.reject(new Error('db down')) : undefined)) };
  const numbers = { reload: vi.fn(async () => true) };
  const get = (token: unknown) => (token === IntegrationConfigService ? integration : token === NumbersConfig ? numbers : null);
  return { integration, numbers, reload: new WebhookConfigReload({ get } as unknown as ModuleRef) };
}

describe('WebhookConfigReload.once', () => {
  it('reloads the integration overlay, then the numbers config; at most once per RELOAD_GAP_MS', async () => {
    const { integration, numbers, reload } = setup();
    expect(await reload.once(0)).toBe(true);
    expect(await reload.once(RELOAD_GAP_MS - 1)).toBe(false);
    expect(await reload.once(RELOAD_GAP_MS)).toBe(true);
    expect([integration.reloadHere.mock.calls.length, numbers.reload.mock.calls.length]).toEqual([2, 2]);
  });

  it('concurrent callers share one reload; a failed step never stops the next', async () => {
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const { numbers, reload } = setup(true);
    expect(await Promise.all([reload.once(0), reload.once(0)])).toEqual([true, true]);
    expect(numbers.reload).toHaveBeenCalledTimes(1);
  });
});
