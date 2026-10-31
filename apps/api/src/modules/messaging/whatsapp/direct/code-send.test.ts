import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setNumbersOverlay } from '@/common/configuration/integrations/numbers-overlay';
import type { SendGate } from '@/modules/messaging/whatsapp/gate/send-gate';
import type { MessageDispatch } from '@/modules/messaging/whatsapp/sender/message.dispatch';
import type { SenderQueries } from '@/modules/messaging/whatsapp/sender/sender.queries';
import { templateRow } from '@/modules/messaging/whatsapp/whatsapp.fakes';
import { WaError } from '@/modules/messaging/whatsapp/whatsapp.types';
import { CodeSend, codeRow } from './code-send';

const ACCOUNT_CODE = templateRow({
  key: 'account_code',
  meta_name: 'account_code',
  category: 'authentication',
  body_ar: '*{{1}}* هو رمز التحقق الخاص بك.',
  buttons: [{ type: 'url', text: 'نسخ الرمز', url: 'https://www.whatsapp.com/otp/code/?otp_type=COPY_CODE&code=otp{{1}}' }],
});

const gate = { open: vi.fn() };
const queries = { approvedTemplates: vi.fn(), chatConfigured: true };
const dispatch = { ready: vi.fn(), send: vi.fn() };
const make = () => new CodeSend(gate as unknown as SendGate, queries as unknown as SenderQueries, dispatch as unknown as MessageDispatch);

describe('CodeSend — the account_code template, sent now, never queued (docs/30 §4)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    gate.open.mockResolvedValue(true);
    queries.approvedTemplates.mockResolvedValue([ACCOUNT_CODE]);
    dispatch.ready.mockReturnValue(true);
    dispatch.send.mockResolvedValue({ waMessageId: 'wamid.c' });
  });

  it('sends the code in {{1}} and the copy-code button, from the chat line (owner 2026-10-29)', async () => {
    await expect(make().send({ phone: '+966500000001', code: '123456' })).resolves.toEqual({ status: 'sent' });
    const [row, template, via] = dispatch.send.mock.calls[0] ?? [];
    expect(row).toMatchObject({ phone_e164: '+966500000001', template_key: 'account_code', template_params: { '1': '123456', button: '123456' } });
    expect(template).toBe(ACCOUNT_CODE);
    expect(via).toBe('chat');
  });

  it('is unavailable while the template is not approved, the gate is closed or the line cannot send', async () => {
    queries.approvedTemplates.mockResolvedValueOnce([]);
    await expect(make().send({ phone: '+966500000001', code: '1' })).resolves.toEqual({ status: 'unavailable' });
    gate.open.mockResolvedValueOnce(false);
    await expect(make().send({ phone: '+966500000001', code: '1' })).resolves.toEqual({ status: 'unavailable' });
    dispatch.ready.mockReturnValueOnce(false);
    await expect(make().send({ phone: '+966500000001', code: '1' })).resolves.toEqual({ status: 'unavailable' });
    expect(dispatch.send).not.toHaveBeenCalled();
  });

  it('never over a crm chat line (its inbox would show the code)', async () => {
    vi.stubEnv('WA_CHAT_PROVIDER', 'crm');
    try {
      await expect(make().send({ phone: '+966500000001', code: '1' })).resolves.toEqual({ status: 'unavailable' });
    } finally {
      vi.unstubAllEnvs();
    }
    expect(dispatch.send).not.toHaveBeenCalled();
  });

  it('module mode without routes sends nothing', async () => {
    setNumbersOverlay({ values: {}, numberIds: {} });
    try {
      await expect(make().send({ phone: '+966500000001', code: '1' })).resolves.toEqual({ status: 'unavailable' });
    } finally {
      setNumbersOverlay(null);
    }
  });

  it('a provider refusal is a short code, never the payload', async () => {
    dispatch.send.mockRejectedValueOnce(new WaError('bad', { code: 132000, status: 400 }));
    await expect(make().send({ phone: '+966500000001', code: '1' })).resolves.toEqual({ status: 'failed', error: 'wa_132000' });
    dispatch.send.mockRejectedValueOnce(new Error('boom'));
    await expect(make().send({ phone: '+966500000001', code: '1' })).resolves.toEqual({ status: 'failed', error: 'send_failed' });
  });

  it('available() = approved template and an open gate', async () => {
    await expect(make().available()).resolves.toBe(true);
    gate.open.mockResolvedValueOnce(false);
    await expect(make().available()).resolves.toBe(false);
  });

  it('codeRow stores nothing: an in-memory row', () => {
    expect(codeRow({ phone: '+1', code: '9', template: { key: 'account_code' } }).id).toBe('account-code');
  });
});
