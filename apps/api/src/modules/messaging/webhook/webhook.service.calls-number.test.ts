import { describe, expect, it, vi } from 'vitest';
import { envelope, inboundValue, PHONE_NUMBER_ID, textPart } from './meta.fakes';
import type { InboundService } from './inbound/webhook.inbound.service';
import type { StatusService } from './status/webhook.status.service';
import { WebhookService } from './webhook.service';

// The calls number (docs/28 §10): a family's message to it is stored (line calls); its permission
// replies go to the calls port; nothing here sends.

const CALLS = { id: 'n-calls', purpose: 'calls' as const, phone_number_id: 'pid-calls' };
const reply = {
  type: 'interactive',
  interactive: { type: 'call_permission_reply', call_permission_reply: { response: 'accept' } },
};

function service() {
  const inbound = { handle: vi.fn().mockResolvedValue(undefined) };
  const statuses = { handle: vi.fn().mockResolvedValue(undefined) };
  const calls = { handle: vi.fn(), permissionReply: vi.fn().mockResolvedValue(undefined) };
  const config = {
    appSecrets: ['s'],
    verifyToken: 't',
    numbers: { notifications: PHONE_NUMBER_ID },
    calls: CALLS,
  };
  const svc = new WebhookService(
    config,
    inbound as unknown as InboundService,
    statuses as unknown as StatusService,
  );
  Object.assign(svc, { calls });
  return { svc, inbound, calls };
}

describe('WebhookService and the calls number', () => {
  it('a text to the calls number is stored stamped line calls', async () => {
    const { svc, inbound } = service();
    await svc.handle(envelope(inboundValue(textPart('سلام')), 'pid-calls'));
    expect(inbound.handle).toHaveBeenCalledWith(
      expect.objectContaining({ line: 'calls', numberId: 'n-calls' }),
      expect.anything(),
    );
  });

  it('a call_permission_reply reaches the calls port beside the stored message', async () => {
    const { svc, inbound, calls } = service();
    await svc.handle(envelope(inboundValue(reply), 'pid-calls'));
    expect(calls.permissionReply).toHaveBeenCalledWith(
      expect.objectContaining({ phoneNumberId: 'pid-calls', response: 'accepted' }),
    );
    expect(inbound.handle).toHaveBeenCalledTimes(1);
  });
});
