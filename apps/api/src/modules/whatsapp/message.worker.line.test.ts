import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PushService } from '../../common/push/push.service';
import type { MessageDispatch } from './message.dispatch';
import { MessageWorker } from './message.worker';
import { dueMessage } from './sender.fakes';
import type { SenderQueries } from './sender.queries';
import { templateRow } from './whatsapp.fakes';
import { WaError } from './whatsapp.types';

// Two lines in the worker (docs/12 §13.3): ready before the claim, stamp only when multi, per-line alert.

const queries = { claim: vi.fn(), sent: vi.fn(), failure: vi.fn(), expire: vi.fn() };
const dispatch = { send: vi.fn(), ready: vi.fn(), multi: false };
const push = { notifyAdmins: vi.fn() };
const NOW = new Date('2026-10-02T08:00:00Z');
const template = templateRow();
const chatText = dueMessage({ template_key: null, template_params: null, body: 'أهلًا', line: 'chat', created_by: 'a1' });
const authError = new WaError('Error validating access token', { code: 190, status: 401 });

function worker() {
  const w = new MessageWorker(queries as unknown as SenderQueries, dispatch as unknown as MessageDispatch, push as unknown as PushService);
  w.wait = vi.fn(async () => undefined);
  return w;
}

describe('MessageWorker — the line of a row', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    dispatch.multi = false;
    dispatch.ready.mockReturnValue(true);
    dispatch.send.mockResolvedValue({ waMessageId: 'wamid.1' });
    queries.claim.mockResolvedValue(1);
    queries.sent.mockResolvedValue(true);
  });

  it('not ready (line unconfigured / recipient not allowed) → skipped, never claimed, Meta not called', async () => {
    dispatch.ready.mockReturnValue(false);
    await expect(worker().process({ row: chatText, template: null, now: NOW, autoOn: true })).resolves.toBe('skipped');
    expect(dispatch.ready).toHaveBeenCalledWith(chatText, 'chat');
    expect(queries.claim).not.toHaveBeenCalled();
    expect(dispatch.send).not.toHaveBeenCalled();
    expect(queries.failure).not.toHaveBeenCalled();
  });

  it('one line: the claim carries no `line` key', async () => {
    await worker().process({ row: chatText, template: null, now: NOW, autoOn: true });
    expect(queries.claim).toHaveBeenCalledWith({ id: chatText.id, attempts: 0, now: NOW });
    expect(Object.keys(queries.claim.mock.calls[0]?.[0] ?? {})).not.toContain('line');
  });

  it('two lines: the claim stamps the line used, and send receives it', async () => {
    dispatch.multi = true;
    await expect(worker().process({ row: chatText, template: null, now: NOW, autoOn: true })).resolves.toBe('sent');
    expect(queries.claim).toHaveBeenCalledWith({ id: chatText.id, attempts: 0, now: NOW, line: 'chat' });
    expect(dispatch.send).toHaveBeenCalledWith(chatText, null, 'chat');
  });

  it('two lines: a template stamped chat is claimed and sent as notifications', async () => {
    dispatch.multi = true;
    const row = dueMessage({ line: 'chat' });
    await worker().process({ row, template, now: NOW, autoOn: true });
    expect(queries.claim).toHaveBeenCalledWith(expect.objectContaining({ line: 'notifications' }));
    expect(dispatch.send).toHaveBeenCalledWith(row, template, 'notifications');
  });

  it('two lines: a chat starter template is claimed and sent on chat; one line: on notifications', async () => {
    const starter = templateRow({ key: 'academy_welcome', meta_name: 'academy_welcome', line: 'chat', sales_starter: true });
    const row = dueMessage({ template_key: 'academy_welcome' });
    dispatch.multi = true;
    await worker().process({ row, template: starter, now: NOW, autoOn: true });
    expect(dispatch.send).toHaveBeenLastCalledWith(row, starter, 'chat');
    dispatch.multi = false;
    await worker().process({ row, template: starter, now: NOW, autoOn: true });
    expect(dispatch.ready).toHaveBeenLastCalledWith(row, 'notifications');
    expect(dispatch.send).toHaveBeenLastCalledWith(row, starter, 'notifications');
  });

  it('an auth error on a chat row alerts once a day under whatsapp_auth:chat:<day>', async () => {
    dispatch.send.mockRejectedValue(authError);
    await expect(worker().process({ row: chatText, template: null, now: NOW, autoOn: true })).resolves.toBe('paused');
    expect(push.notifyAdmins).toHaveBeenCalledWith('reminder_failed', expect.objectContaining({ subject: 'whatsapp_auth:chat:2026-10-02' }));
  });

  it('an auth error on a notifications row keeps whatsapp_auth:<day>', async () => {
    dispatch.send.mockRejectedValue(authError);
    await expect(worker().process({ row: dueMessage(), template, now: NOW, autoOn: true })).resolves.toBe('paused');
    expect(push.notifyAdmins).toHaveBeenCalledWith('reminder_failed', expect.objectContaining({ subject: 'whatsapp_auth:2026-10-02' }));
  });

  it('a chat row still marked SENDING is handed to the admin before ready() is asked', async () => {
    const row = { ...chatText, error_code: 'sending', attempts: 1 };
    await expect(worker().process({ row, template: null, now: NOW, autoOn: true })).resolves.toBe('failed');
    expect(dispatch.ready).not.toHaveBeenCalled();
    expect(queries.failure).toHaveBeenCalledWith(row.id, expect.objectContaining({ error_code: 'uncertain' }));
  });
});
