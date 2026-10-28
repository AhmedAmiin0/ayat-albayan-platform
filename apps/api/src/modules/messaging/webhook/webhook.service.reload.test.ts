import { Logger } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { envelope, inboundValue, textPart } from './meta.fakes';
import type { InboundService } from './inbound/webhook.inbound.service';
import type { WebhookConfigReload } from './lines/webhook.reload';
import type { StatusService } from './status/webhook.status.service';
import { WebhookService } from './webhook.service';

/** A copy that knows only `known`; its reload (when given) learns `learns`, as a save on the other copy would. */
function copy(opts: { learns?: string; reloads?: boolean } = {}) {
  const inbound = { handle: vi.fn().mockResolvedValue(undefined) };
  const config = { appSecrets: ['s'], verifyToken: 't', numbers: { notifications: 'known' } as Record<string, string> };
  const svc = new WebhookService(config, inbound as unknown as InboundService, {} as StatusService);
  const once = vi.fn(async () => {
    if (opts.learns) config.numbers = { ...config.numbers, chat: opts.learns };
    return opts.reloads ?? true;
  });
  Object.assign(svc, { reload: { once } as unknown as WebhookConfigReload });
  return { svc, inbound, once };
}

afterEach(() => vi.restoreAllMocks());

describe('WebhookService: a phone_number_id this copy does not know yet (docs/09)', () => {
  it('reloads the config once and handles the message when the reload knows the number', async () => {
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const { svc, inbound, once } = copy({ learns: 'new-number' });
    await svc.handle(envelope(inboundValue(textPart('hi')), 'new-number'));
    expect(once).toHaveBeenCalledTimes(1);
    expect(inbound.handle).toHaveBeenCalledTimes(1);
    expect(warn).not.toHaveBeenCalled();
  });

  it('still unknown after the reload: ignored and warned about; a known number never reloads', async () => {
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const { svc, inbound, once } = copy();
    await svc.handle(envelope(inboundValue(textPart('hi')), 'someone-else'));
    expect(inbound.handle).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
    await svc.handle(envelope(inboundValue(textPart('hi')), 'known'));
    expect(once).toHaveBeenCalledTimes(1);
    expect(inbound.handle).toHaveBeenCalledTimes(1);
  });
});
