import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setNumbersOverlay, type OverlayNumber } from '@/common/configuration/integrations/numbers-overlay';
import type { WhatsappEnv } from '@/config/env/env';
import type { SendGate } from '@/modules/messaging/whatsapp/gate/send-gate';
import type { MessageDispatch } from '@/modules/messaging/whatsapp/sender/message.dispatch';
import type { SenderQueries } from '@/modules/messaging/whatsapp/sender/sender.queries';
import { messagingNumbers, routable } from '@/modules/messaging/whatsapp/numbers/number-route';
import type { NumberRoutes } from '@/modules/messaging/whatsapp/numbers/number-routes';
import { templateRow } from '@/modules/messaging/whatsapp/whatsapp.fakes';
import { CodeSend } from './code-send';

// Owner 2026-10-29 («For login make it with chat number»): codes leave from the CHAT line only. A crm
// chat line stays refused (its inbox would show the code); no chat line = unavailable, never notifications.

const ACCOUNT_CODE = templateRow({ key: 'account_code', category: 'authentication', status: 'approved', line: 'chat' });
const gate = { open: vi.fn() };
const queries = { approvedTemplates: vi.fn(), chatConfigured: true };
const dispatch = { ready: vi.fn(), send: vi.fn() };
const routes = {
  pass: vi.fn(async (numbers: readonly OverlayNumber[]) => ({
    pass: { numbers: messagingNumbers(numbers).map(routable), ruleNumbers: new Map(), approvals: new Map(), crm: new Set<string>() },
    templates: [],
  })),
};
const make = () => {
  const s = new CodeSend(gate as unknown as SendGate, queries as unknown as SenderQueries, dispatch as unknown as MessageDispatch);
  Object.assign(s, { routes: routes as unknown as NumberRoutes });
  return s;
};
const send = () => make().send({ phone: '+966500000001', code: '123456' });
const via = () => dispatch.send.mock.calls[0]?.[2];

function number(id: string, over: { purpose: 'chat' | 'notifications'; provider?: 'meta' | 'kapso' | 'crm'; enabled?: boolean }): OverlayNumber {
  const env = over.provider && over.provider !== 'meta' ? ({ provider: over.provider } as unknown as WhatsappEnv) : ({} as WhatsappEnv);
  const enabled = over.enabled ?? true;
  return { id, label: id, purpose: over.purpose, phone_number_id: id, waba_id: null, enabled, is_default: true, fallback_rank: 0, created_at: '2026-10-01', env, appSecret: null };
}

beforeEach(() => {
  vi.clearAllMocks();
  queries.chatConfigured = true;
  gate.open.mockResolvedValue(true);
  queries.approvedTemplates.mockResolvedValue([ACCOUNT_CODE]);
  dispatch.ready.mockReturnValue(true);
  dispatch.send.mockResolvedValue({ waMessageId: 'wamid.c' });
});

afterEach(() => {
  vi.unstubAllEnvs();
  setNumbersOverlay(null);
});

describe('CodeSend — legacy lines: the chat line only', () => {
  it.each(['meta', 'kapso', ''])('chat line on %s (notifications on crm): sent from chat', async (provider) => {
    vi.stubEnv('WA_PROVIDER', 'crm');
    vi.stubEnv('WA_CHAT_PROVIDER', provider);
    await expect(send()).resolves.toEqual({ status: 'sent' });
    expect(via()).toBe('chat');
    expect(dispatch.ready).toHaveBeenCalledWith(expect.objectContaining({ template_key: 'account_code' }), 'chat');
  });

  it('a template row still on notifications is sent from chat all the same', async () => {
    queries.approvedTemplates.mockResolvedValueOnce([{ ...ACCOUNT_CODE, line: 'notifications' }]);
    await expect(send()).resolves.toEqual({ status: 'sent' });
    expect(via()).toBe('chat');
  });

  it('a crm chat line is refused', async () => {
    vi.stubEnv('WA_CHAT_PROVIDER', 'crm');
    await expect(make().available()).resolves.toBe(false);
    await expect(send()).resolves.toEqual({ status: 'unavailable' });
    expect(dispatch.send).not.toHaveBeenCalled();
  });

  it('no chat line: unavailable (and /auth/code/status says so), never the notifications line', async () => {
    queries.chatConfigured = false;
    await expect(make().available()).resolves.toBe(false);
    await expect(send()).resolves.toEqual({ status: 'unavailable' });
    expect(dispatch.ready).not.toHaveBeenCalled();
    expect(dispatch.send).not.toHaveBeenCalled();
  });

  it('the allow-list / chat client refusal (dispatch.ready) keeps it unsent', async () => {
    dispatch.ready.mockReturnValueOnce(false);
    await expect(send()).resolves.toEqual({ status: 'unavailable' });
    expect(dispatch.send).not.toHaveBeenCalled();
  });
});

describe('CodeSend — module mode: chat numbers only', () => {
  const overlay = (numbers: OverlayNumber[]) => setNumbersOverlay({ values: {}, numberIds: {}, numbers });

  it.each(['meta', 'kapso'] as const)('an enabled %s chat number sends it', async (provider) => {
    overlay([number('n1', { purpose: 'notifications' }), number('c1', { purpose: 'chat', provider })]);
    await expect(make().available()).resolves.toBe(true);
    await expect(send()).resolves.toEqual({ status: 'sent' });
    expect(via()).toEqual({ numberId: 'c1', line: 'chat' });
  });

  it('a crm chat number is refused, even with an enabled notifications number', async () => {
    overlay([number('n1', { purpose: 'notifications' }), number('c1', { purpose: 'chat', provider: 'crm' })]);
    await expect(send()).resolves.toEqual({ status: 'unavailable' });
    expect(dispatch.send).not.toHaveBeenCalled();
  });

  it('a disabled chat number: unavailable', async () => {
    overlay([number('n1', { purpose: 'notifications' }), number('c1', { purpose: 'chat', enabled: false })]);
    await expect(make().available()).resolves.toBe(false);
    await expect(send()).resolves.toEqual({ status: 'unavailable' });
    expect(dispatch.send).not.toHaveBeenCalled();
  });
});
