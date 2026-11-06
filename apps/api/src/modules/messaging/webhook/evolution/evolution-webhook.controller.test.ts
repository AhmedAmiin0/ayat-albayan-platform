import { afterEach, describe, expect, it, vi } from 'vitest';
import { setNumbersOverlay } from '@/common/configuration/integrations/numbers-overlay';
import type { InboundService } from '@/modules/messaging/webhook/inbound/webhook.inbound.service';
import type { StatusService } from '@/modules/messaging/webhook/status/webhook.status.service';
import type { InboundEvent } from '@/modules/messaging/webhook/webhook.events';
import { EvolutionWebhookController } from './evolution-webhook.controller';
import type { EvolutionRestriction } from './evolution-restriction';
import type { EvolutionStateRepo } from './evolution-state.repo';
import { EvolutionWebhookService } from './evolution-webhook.service';

// docs/19 «Evolution driver»: POST /webhooks/evolution/:instance. Fakes only: no database,
// no Evolution; the inbound fake keeps one row per message id, as the unique wa_message_id does.

const TOKEN = 'fake-instance-token';
const NUMBER = {
  id: 'num-evo', label: 'ثانوي', purpose: 'chat' as const, phone_number_id: 'secondary-1', waba_id: null,
  enabled: true, is_default: false, fallback_rank: 100, created_at: '2026-11-01T00:00:00Z', env: null,
  appSecret: null, evolutionToken: TOKEN,
};

function harness() {
  const stored = new Set<string>();
  const handle = vi.fn(async (m: InboundEvent) => {
    const fresh = !stored.has(m.waMessageId);
    stored.add(m.waMessageId);
    return Promise.resolve(fresh);
  });
  const statuses = { handle: vi.fn(() => Promise.resolve()) };
  const states = { set: vi.fn(() => Promise.resolve()) };
  const restriction = { check: vi.fn(() => Promise.resolve()) };
  const service = new EvolutionWebhookService(
    { handle } as unknown as InboundService,
    statuses as unknown as StatusService,
    states as unknown as EvolutionStateRepo,
    restriction as unknown as EvolutionRestriction,
  );
  return { controller: new EvolutionWebhookController(service), handle, stored, statuses, states };
}

const text = {
  event: 'messages.upsert',
  instance: 'secondary-1',
  data: { key: { id: 'EVO-IN-1', remoteJid: '966500000001@s.whatsapp.net', fromMe: false }, message: { conversation: 'مرحبا' } },
};
const req = (body: unknown, token: string | null = TOKEN) =>
  ({ body, headers: token === null ? {} : { 'x-evolution-token': token } });
const status = (e: unknown) => (e as { getStatus(): number }).getStatus();

afterEach(() => setNumbersOverlay(null));

describe('EvolutionWebhookController', () => {
  it('the right token: a family message goes into the inbound path, stamped with the number', async () => {
    setNumbersOverlay({ values: {}, numberIds: {}, numbers: [NUMBER] });
    const h = harness();
    await h.controller.receive('secondary-1', req(text));
    const event = expect.objectContaining({ waMessageId: 'EVO-IN-1', numberId: 'num-evo', line: 'chat' });
    expect(h.handle).toHaveBeenCalledWith(event, expect.anything());
  });

  it('a replayed delivery stores the message once', async () => {
    setNumbersOverlay({ values: {}, numberIds: {}, numbers: [NUMBER] });
    const h = harness();
    await h.controller.receive('secondary-1', req(text));
    await h.controller.receive('secondary-1', req(text));
    expect([...h.stored]).toEqual(['EVO-IN-1']);
    expect(await h.handle.mock.results[1]?.value).toBe(false);
  });

  it('a wrong or missing token is 401 and nothing is read', async () => {
    setNumbersOverlay({ values: {}, numberIds: {}, numbers: [NUMBER] });
    const h = harness();
    expect(status(await h.controller.receive('secondary-1', req(text, 'nope')).catch((e: unknown) => e))).toBe(401);
    expect(status(await h.controller.receive('secondary-1', req(text, null)).catch((e: unknown) => e))).toBe(401);
    expect(h.handle).not.toHaveBeenCalled();
  });

  it('an unknown instance (or legacy mode, or a number without a token) is 404', async () => {
    const h = harness();
    expect(status(await h.controller.receive('secondary-1', req(text)).catch((e: unknown) => e))).toBe(404);
    const tokenless = { ...NUMBER, evolutionToken: undefined };
    setNumbersOverlay({ values: {}, numberIds: {}, numbers: [tokenless] });
    expect(status(await h.controller.receive('secondary-1', req(text)).catch((e: unknown) => e))).toBe(404);
    expect(h.handle).not.toHaveBeenCalled();
  });

  it('ticks go to the status path; a connection update is the number\'s state', async () => {
    setNumbersOverlay({ values: {}, numberIds: {}, numbers: [NUMBER] });
    const h = harness();
    await h.controller.receive('secondary-1', req({ event: 'messages.update', data: { keyId: 'EVO-OUT-1', fromMe: true, status: 'READ' } }));
    await h.controller.receive('secondary-1', req({ event: 'connection.update', data: { state: 'close' } }));
    expect(h.statuses.handle).toHaveBeenCalledWith(expect.objectContaining({ waMessageId: 'EVO-OUT-1', status: 'read' }));
    expect(h.states.set).toHaveBeenCalledWith(expect.objectContaining({ numberId: 'num-evo', state: 'close' }));
  });

  it('a failed item answers 500 so Evolution re-sends it', async () => {
    setNumbersOverlay({ values: {}, numberIds: {}, numbers: [NUMBER] });
    const h = harness();
    h.handle.mockRejectedValueOnce(new Error('db down'));
    expect(status(await h.controller.receive('secondary-1', req(text)).catch((e: unknown) => e))).toBe(500);
  });

  it('a flood without the token never starves the real instance (security review)', async () => {
    setNumbersOverlay({ values: {}, numberIds: {}, numbers: [NUMBER] });
    const h = harness();
    const flood = Array.from({ length: 1_300 }, () => h.controller.receive('secondary-1', req(text, 'nope')));
    const codes = await Promise.all(flood.map((p) => p.catch((e: unknown) => status(e))));
    expect(codes).toContain(429);
    await h.controller.receive('secondary-1', req(text));
    expect(h.handle).toHaveBeenCalledTimes(1);
  });

  it('503 (Evolution re-sends) while module mode has no number loaded yet', async () => {
    setNumbersOverlay({ values: {}, numberIds: {}, numbers: [] });
    const h = harness();
    expect(status(await h.controller.receive('secondary-1', req(text)).catch((e: unknown) => e))).toBe(503);
  });
});
