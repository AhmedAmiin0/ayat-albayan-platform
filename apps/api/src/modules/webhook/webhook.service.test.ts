import { Logger } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CHAT_PHONE_NUMBER_ID, envelope, inboundValue, PHONE_NUMBER_ID, statusValue, textPart } from './meta.fakes';
import type { InboundService } from './webhook.inbound.service';
import { RESPONSE_BUDGET_MS, WebhookService, within } from './webhook.service';
import type { StatusService } from './webhook.status.service';

function service(phoneNumberId: string | undefined = PHONE_NUMBER_ID, chat?: string) {
  const inbound = { handle: vi.fn().mockResolvedValue(undefined) };
  const statuses = { handle: vi.fn().mockResolvedValue(undefined) };
  const config = { appSecrets: ['s'], verifyToken: 't', numbers: phoneNumberId ? { notifications: phoneNumberId } : {} };
  const lines = chat ? { ...config, numbers: { ...config.numbers, chat } } : config;
  const svc = new WebhookService(lines, inbound as unknown as InboundService, statuses as unknown as StatusService);
  return { svc, inbound, statuses };
}

const both = {
  ...inboundValue(textPart('one')),
  messages: [
    { from: '966501234567', id: 'wamid.A', timestamp: '1', type: 'text', text: { body: 'a' } },
    { from: '966501234567', id: 'wamid.B', timestamp: '2', type: 'text', text: { body: 'b' } },
  ],
  ...statusValue({ status: 'read' }),
};

describe('WebhookService', () => {
  it('hands every message and every status to its handler', async () => {
    const { svc, inbound, statuses } = service();
    await svc.handle(envelope(both));
    expect(inbound.handle.mock.calls.map(([m]) => m.waMessageId)).toEqual(['wamid.A', 'wamid.B']);
    expect(statuses.handle).toHaveBeenCalledWith(expect.objectContaining({ waMessageId: 'wamid.OUT1', status: 'read' }));
  });

  it('tells each message when the controller stops waiting (now + RESPONSE_BUDGET_MS)', async () => {
    const { svc, inbound } = service();
    const before = Date.now();
    await svc.handle(envelope(both));
    const deadline = inbound.handle.mock.calls[0]?.[1]?.deadline;
    expect(deadline).toBeGreaterThanOrEqual(before + RESPONSE_BUDGET_MS);
    expect(deadline).toBeLessThanOrEqual(Date.now() + RESPONSE_BUDGET_MS);
  });

  it('one failing item does not stop the others, then the batch fails so Meta re-sends it', async () => {
    const { svc, inbound, statuses } = service();
    inbound.handle.mockRejectedValueOnce(new Error('db down'));
    await expect(svc.handle(envelope(both))).rejects.toMatchObject({ status: 500 });
    expect(inbound.handle).toHaveBeenCalledTimes(2);
    expect(statuses.handle).toHaveBeenCalledTimes(1);
  });

  it('an unparseable body is not a failure (nothing to retry)', async () => {
    const { svc, inbound } = service();
    await expect(svc.handle({ object: 'whatsapp_business_account', entry: 'nope' })).resolves.toBeUndefined();
    expect(inbound.handle).not.toHaveBeenCalled();
  });

  it('skips changes for another phone number id', async () => {
    const { svc, inbound } = service();
    await svc.handle(envelope(both, 'other-number'));
    expect(inbound.handle).not.toHaveBeenCalled();
  });
});

describe('WebhookService — two lines (docs/12 §13.6)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('hands a notifications change and a chat change to inbound.handle with their line', async () => {
    const { svc, inbound } = service(PHONE_NUMBER_ID, CHAT_PHONE_NUMBER_ID);
    const chat = envelope(inboundValue(textPart('b'), { id: 'wamid.CHAT' }), CHAT_PHONE_NUMBER_ID) as { entry: object[] };
    const notif = envelope(inboundValue(textPart('a'), { id: 'wamid.NOTIF' })) as { entry: object[] };
    await svc.handle({ object: 'whatsapp_business_account', entry: [...notif.entry, ...chat.entry] });
    const seen = inbound.handle.mock.calls.map(([m]) => [m.waMessageId, m.line]);
    expect(seen).toEqual([['wamid.NOTIF', 'notifications'], ['wamid.CHAT', 'chat']]);
  });

  it('warns once per distinct ignored phone_number_id per process', async () => {
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const { svc, inbound } = service();
    await svc.handle(envelope(both, 'other-number'));
    await svc.handle(envelope(both, 'other-number'));
    await svc.handle(envelope(both, 'third-number'));
    expect(inbound.handle).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(2);
    expect(warn.mock.calls.map(([msg]) => String(msg))).toEqual([
      expect.stringContaining('other-number'),
      expect.stringContaining('third-number'),
    ]);
  });
});

describe('within', () => {
  it('true when the work finishes inside the budget', async () => {
    await expect(within(Promise.resolve('x'), 50)).resolves.toBe(true);
  });

  it('false once the budget passes; the work keeps running', async () => {
    vi.useFakeTimers();
    let done = false;
    const work = new Promise<void>((resolve) => setTimeout(() => resolve(void (done = true)), 1_000));
    const result = within(work, 100);
    await vi.advanceTimersByTimeAsync(100);
    await expect(result).resolves.toBe(false);
    await vi.advanceTimersByTimeAsync(900);
    expect(done).toBe(true);
    vi.useRealTimers();
  });
});
