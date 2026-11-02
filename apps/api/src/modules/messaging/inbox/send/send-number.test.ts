import { afterEach, describe, expect, it, vi } from 'vitest';
import { setNumbersOverlay } from '@/common/configuration/integrations/numbers-overlay';
import { threadRow } from '@/modules/messaging/inbox/inbox.fakes';
import { pickSendLine } from './send-line';
import { CHAT_DEFAULT, CHAT_OFF, CHAT_TWO, NOTIF_DEFAULT, NUMBERS } from './send-number.fakes';
import { numberWindows, pickNumber, pickSend, type ThreadWindow } from './send-number';

// Reply per number (docs/23c decision 6): module mode picks a number; legacy is pickSendLine untouched.

const NOW = new Date('2026-10-24T10:00:00Z');
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();
const closed = threadRow({ last_inbound_at: hoursAgo(30), last_notifications_inbound_at: hoursAgo(30) });
const at = (numberId: string | null, line: ThreadWindow['line'], h: number): ThreadWindow => ({ numberId, line, lastInboundAt: hoursAgo(h) });
const moduleMode = (numbers = NUMBERS) => setNumbersOverlay({ values: {}, numberIds: {}, numbers });

afterEach(() => {
  setNumbersOverlay(null);
  vi.unstubAllEnvs();
});

describe('pickNumber', () => {
  it('the newest open window on a sendable number wins: { number_id, line = purpose }', () => {
    const rows = [at(CHAT_TWO.id, 'chat', 1), at(CHAT_OFF.id, 'chat', 0.5), at(NOTIF_DEFAULT.id, 'notifications', 2)];
    expect(pickNumber({ rows, numbers: NUMBERS, now: NOW })).toEqual({ number_id: 'num-chat-2', line: 'chat' });
  });

  it('unstamped history (number_id null) maps to its line\'s default number', () => {
    const rows = [at(null, 'chat', 3), at(null, 'notifications', 5)];
    expect(numberWindows(rows, NUMBERS).map((w) => w.numberId)).toEqual([CHAT_DEFAULT.id, NOTIF_DEFAULT.id]);
    expect(pickNumber({ rows, numbers: NUMBERS, now: NOW })).toEqual({ number_id: 'num-chat', line: 'chat' });
  });

  it('review: an inbound on a second number never opens a window on the default', () => {
    // The family wrote only to CHAT_TWO; the default's window stays closed whatever the uuids sort as.
    const rows = [at(CHAT_TWO.id, 'chat', 1), at(null, 'chat', 30)];
    expect(pickNumber({ rows, numbers: NUMBERS, now: NOW })).toEqual({ number_id: 'num-chat-2', line: 'chat' });
    const noEnv = { ...CHAT_TWO, env: null };
    const numbers = NUMBERS.map((n) => (n.id === CHAT_TWO.id ? noEnv : n));
    expect(pickNumber({ rows, numbers, now: NOW })).toEqual({ code: 'line_not_configured' });
  });

  it('open windows only on numbers that cannot send → line_not_configured (503); none open → session_closed', () => {
    const noEnv = { ...CHAT_TWO, env: null };
    const rows = [at(CHAT_OFF.id, 'chat', 1), at(CHAT_TWO.id, 'chat', 2)];
    expect(pickNumber({ rows, numbers: [CHAT_OFF, noEnv], now: NOW })).toEqual({ code: 'line_not_configured' });
    expect(pickNumber({ rows: [at('deleted-number', 'chat', 1)], numbers: NUMBERS, now: NOW })).toEqual({ code: 'line_not_configured' });
    expect(pickNumber({ rows: [at(null, 'chat', 30)], numbers: NUMBERS, now: NOW })).toEqual({ code: 'session_closed' });
  });
});

describe('pickSend', () => {
  it('legacy: exactly pickSendLine, and the windows are never read', async () => {
    vi.stubEnv('WA_CHAT_PHONE_NUMBER_ID', '');
    const windows = vi.fn();
    const thread = threadRow({ last_notifications_inbound_at: hoursAgo(1) });
    expect(await pickSend({ thread, now: NOW, windows })).toEqual(pickSendLine(thread, NOW));
    expect(await pickSend({ thread: null, now: NOW, windows })).toEqual({ code: 'no_thread' });
    expect(windows).not.toHaveBeenCalled();
  });

  it('module: reads the windows and picks a number', async () => {
    moduleMode();
    const windows = vi.fn().mockResolvedValue([at(CHAT_TWO.id, 'chat', 1)]);
    expect(await pickSend({ thread: closed, now: NOW, windows })).toEqual({ number_id: 'num-chat-2', line: 'chat' });
    expect(await pickSend({ thread: null, now: NOW, windows })).toEqual({ code: 'no_thread' });
  });

  it('module: a failed windows read fails closed (line_not_configured), never a guessed number', async () => {
    moduleMode();
    const open = threadRow({ last_chat_inbound_at: hoursAgo(1) });
    const windows = vi.fn().mockRejectedValue(new Error('db down'));
    expect(await pickSend({ thread: open, now: NOW, windows })).toEqual({ code: 'line_not_configured' });
  });
});
