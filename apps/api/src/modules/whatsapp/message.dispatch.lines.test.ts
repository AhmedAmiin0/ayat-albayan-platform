import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StorageService } from '../../common/storage/storage.service';
import { MessageDispatch } from './message.dispatch';
import { dueMessage } from './sender.fakes';
import { templateRow } from './whatsapp.fakes';
import type { WhatsappLines } from './whatsapp.types';

// Two lines (docs/12 §13.3, §13.5b): every row leaves from the line it is given (lineOf decides).

const client = () => ({ configured: vi.fn(() => true), sendTemplate: vi.fn(), sendText: vi.fn() });
let notifications = client();
let chat = client();
const storage = { signedDownload: vi.fn() } as unknown as StorageService;
const dispatch = () => new MessageDispatch({ notifications, chat } as unknown as WhatsappLines, storage);
const text = (over: Parameters<typeof dueMessage>[0] = {}) =>
  dueMessage({ template_key: null, template_params: null, body: 'وعليكم السلام', ...over });

describe('MessageDispatch — two lines', () => {
  beforeEach(() => {
    notifications = client();
    chat = client();
    notifications.sendTemplate.mockResolvedValue({ waMessageId: 'wamid.n' });
    notifications.sendText.mockResolvedValue({ waMessageId: 'wamid.n' });
    chat.sendText.mockResolvedValue({ waMessageId: 'wamid.c' });
    chat.sendTemplate.mockResolvedValue({ waMessageId: 'wamid.c' });
  });
  afterEach(() => vi.unstubAllEnvs());

  it('a producer template goes through notifications even when the row is stamped chat', async () => {
    await dispatch().send(dueMessage({ line: 'chat' }), templateRow(), 'notifications');
    expect(notifications.sendTemplate).toHaveBeenCalledTimes(1);
    expect(chat.sendTemplate).not.toHaveBeenCalled();
    expect(chat.sendText).not.toHaveBeenCalled();
  });

  it('a chat starter goes through the chat client (owner 2026-10-12)', async () => {
    const starter = templateRow({ key: 'academy_welcome', meta_name: 'academy_welcome', line: 'chat', sales_starter: true });
    const row = dueMessage({ template_key: 'academy_welcome', template_params: { '1': 'أم سارة' } });
    await expect(dispatch().send(row, starter, 'chat')).resolves.toEqual({ waMessageId: 'wamid.c' });
    expect(chat.sendTemplate).toHaveBeenCalledWith(expect.objectContaining({ template: starter, params: { '1': 'أم سارة' } }));
    expect(notifications.sendTemplate).not.toHaveBeenCalled();
  });

  it('a chat text goes through the chat client', async () => {
    await expect(dispatch().send(text({ line: 'chat' }), null, 'chat')).resolves.toEqual({ waMessageId: 'wamid.c' });
    expect(chat.sendText).toHaveBeenCalledWith({ to: '+966551234567', text: 'وعليكم السلام', replyTo: null });
    expect(notifications.sendText).not.toHaveBeenCalled();
  });

  it('an unstamped text goes through notifications', async () => {
    await expect(dispatch().send(text(), null, 'notifications')).resolves.toEqual({ waMessageId: 'wamid.n' });
    expect(chat.sendText).not.toHaveBeenCalled();
  });

  it('ready: false when the line’s client is not configured', () => {
    chat.configured.mockReturnValue(false);
    const d = dispatch();
    expect(d.ready(text({ line: 'chat' }), 'chat')).toBe(false);
    expect(d.ready(text(), 'notifications')).toBe(true);
  });

  it('ready: true for any phone with no allow-list', () => {
    expect(dispatch().ready(dueMessage({ phone_e164: '+201001234567' }), 'notifications')).toBe(true);
  });

  it('ready: false for a phone off WA_ALLOWED_RECIPIENTS, true for one on it', () => {
    vi.stubEnv('WA_ALLOWED_RECIPIENTS', '+20 100 123 4567');
    const d = dispatch();
    expect(d.ready(dueMessage(), 'notifications')).toBe(false);
    expect(d.ready(dueMessage({ phone_e164: '+201001234567' }), 'notifications')).toBe(true);
  });

  it('multi mirrors chat.configured()', () => {
    const d = dispatch();
    expect(d.multi).toBe(true);
    chat.configured.mockReturnValue(false);
    expect(d.multi).toBe(false);
  });
});
