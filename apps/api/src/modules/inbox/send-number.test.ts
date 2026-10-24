import { afterEach, describe, expect, it, vi } from 'vitest';
import { setNumbersOverlay } from '../../common/integrations/numbers-overlay';
import { threadRow } from './inbox.fakes';
import { pickSendLine } from './send-line';
import { CHAT_DEFAULT, CHAT_OFF, CHAT_TWO, NOTIF_DEFAULT, NUMBERS } from './send-number.fakes';
import { legacyWindows, pickNumber, pickSend } from './send-number';

// Reply per number (docs/23c decision 6): module mode picks a number; legacy is pickSendLine untouched.

const NOW = new Date('2026-10-24T10:00:00Z');
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();
const closed = threadRow({ last_inbound_at: hoursAgo(30), last_notifications_inbound_at: hoursAgo(30) });
const moduleMode = (numbers = NUMBERS) => setNumbersOverlay({ values: {}, numberIds: {}, numbers });

afterEach(() => {
  setNumbersOverlay(null);
  vi.unstubAllEnvs();
});

describe('pickNumber', () => {
  it('the newest open window on a sendable number wins: { number_id, line = purpose }', () => {
    const stamped = [
      { numberId: CHAT_TWO.id, lastInboundAt: hoursAgo(1) },
      { numberId: CHAT_OFF.id, lastInboundAt: hoursAgo(0.5) },
      { numberId: NOTIF_DEFAULT.id, lastInboundAt: hoursAgo(2) },
    ];
    expect(pickNumber({ thread: closed, stamped, numbers: NUMBERS, now: NOW })).toEqual({ number_id: 'num-chat-2', line: 'chat' });
  });

  it('a history-only window (v_threads, nothing stamped) maps to the role default', () => {
    const thread = threadRow({ last_chat_inbound_at: hoursAgo(3), last_notifications_inbound_at: hoursAgo(5) });
    expect(legacyWindows(thread, NUMBERS).map((w) => w.numberId)).toEqual([CHAT_DEFAULT.id, NOTIF_DEFAULT.id]);
    expect(pickNumber({ thread, stamped: [], numbers: NUMBERS, now: NOW })).toEqual({ number_id: 'num-chat', line: 'chat' });
  });

  it('open windows only on numbers that cannot send → line_not_configured (503); none open → session_closed', () => {
    const noEnv = { ...CHAT_TWO, env: null };
    const stamped = [{ numberId: CHAT_OFF.id, lastInboundAt: hoursAgo(1) }, { numberId: CHAT_TWO.id, lastInboundAt: hoursAgo(2) }];
    expect(pickNumber({ thread: closed, stamped, numbers: [CHAT_OFF, noEnv], now: NOW })).toEqual({ code: 'line_not_configured' });
    const gone = [{ numberId: 'deleted-number', lastInboundAt: hoursAgo(1) }];
    expect(pickNumber({ thread: closed, stamped: gone, numbers: NUMBERS, now: NOW })).toEqual({ code: 'line_not_configured' });
    expect(pickNumber({ thread: closed, stamped: [], numbers: NUMBERS, now: NOW })).toEqual({ code: 'session_closed' });
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
    const windows = vi.fn().mockResolvedValue([{ numberId: CHAT_TWO.id, lastInboundAt: hoursAgo(1) }]);
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
