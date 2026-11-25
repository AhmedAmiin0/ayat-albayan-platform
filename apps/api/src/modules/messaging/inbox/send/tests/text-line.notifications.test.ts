import { afterEach, describe, expect, it, vi } from 'vitest';
import { setNumbersOverlay } from '@/common/configuration/integrations/numbers-overlay';
import { threadRow } from '@/modules/messaging/inbox/inbox.fakes';
import type { ThreadWindow } from '@/modules/messaging/inbox/send/send-number';
import { NUMBERS } from '@/modules/messaging/inbox/send/send-number.fakes';
import { sendLine, textLine } from '@/modules/messaging/inbox/send/text-line';

// A family that writes to the notifications number is answered from the chat
// line. An open notifications window never makes a staff send leave from the notifications line
// while a chat line exists. Fakes only: no Kapso, no CRM, no WhatsApp.

const NOW = new Date('2026-11-21T10:00:00Z');
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();
const notifOnly = threadRow({
  last_inbound_at: hoursAgo(1),
  last_chat_inbound_at: hoursAgo(30),
  last_notifications_inbound_at: hoursAgo(1),
});
const bothOpen = threadRow({
  last_inbound_at: hoursAgo(1),
  last_chat_inbound_at: hoursAgo(3),
  last_notifications_inbound_at: hoursAgo(1),
});
const LINES = {
  WA_PROVIDER: 'crm',
  WACRM_API_BASE: 'http://wa-stub.test/crm/api/v1',
  WACRM_API_KEY: 'crm-key-fake',
  WA_API_BASE: 'http://wa-stub.test',
  WA_CHAT_PHONE_NUMBER_ID: 'c-phone',
  WA_CHAT_WABA_ID: 'c-waba',
  KAPSO_API_BASE: 'http://wa-stub.test/kapso',
  KAPSO_API_KEY: 'kapso-key-fake',
  WA_ACCESS_TOKEN: 'meta-token-fake',
};
const chatOn = (provider: 'meta' | 'kapso') => {
  for (const [k, v] of Object.entries({ ...LINES, WA_CHAT_PROVIDER: provider })) vi.stubEnv(k, v);
};
const notifWindow = (numberId: string | null): ThreadWindow[] => [
  { numberId, line: 'notifications', lastInboundAt: hoursAgo(1) },
];
const legacy = { now: NOW, windows: async (): Promise<ThreadWindow[]> => [] };
const code = (e: unknown) => (e as { getResponse(): { code: string } }).getResponse().code;

afterEach(() => {
  setNumbersOverlay(null);
  vi.unstubAllEnvs();
});

describe('a staff send after a notifications-line inbound', () => {
  it('kapso chat line, chat window closed: held behind the reopen template on chat', async () => {
    chatOn('kapso');
    expect(await textLine(notifOnly, legacy)).toEqual({ line: 'chat', error_code: 'awaiting_reply' });
  });

  it('chat window open too: leaves from the chat line as a plain send', async () => {
    chatOn('kapso');
    expect(await textLine(bothOpen, legacy)).toEqual({ line: 'chat' });
  });

  it('teacher mode (sendLine): 409 session_closed, never the notifications line', async () => {
    chatOn('kapso');
    expect(code(await sendLine(notifOnly, legacy).catch((x: unknown) => x))).toBe('session_closed');
  });

  it('a meta chat line: 409 session_closed instead of the notifications line', async () => {
    chatOn('meta');
    expect(code(await textLine(notifOnly, legacy).catch((x: unknown) => x))).toBe('session_closed');
  });

  it.each([null, 'num-notif'])('module mode (%s): the default chat number, held', async (id) => {
    chatOn('kapso');
    setNumbersOverlay({ values: {}, numberIds: { chat: 'num-chat' }, numbers: NUMBERS });
    const at = { now: NOW, windows: async () => notifWindow(id) };
    const want = { line: 'chat', number_id: 'num-chat', error_code: 'awaiting_reply' };
    expect(await textLine(notifOnly, at)).toEqual(want);
  });

  it('module mode, teacher: 409, never the notifications number', async () => {
    chatOn('kapso');
    setNumbersOverlay({ values: {}, numberIds: { chat: 'num-chat' }, numbers: NUMBERS });
    const at = { now: NOW, windows: async () => notifWindow('num-notif') };
    expect(code(await sendLine(notifOnly, at).catch((x: unknown) => x))).toBe('session_closed');
  });

  it('no chat line at all: the notifications window still answers (a single line)', async () => {
    for (const [k, v] of Object.entries(LINES)) vi.stubEnv(k, v);
    vi.stubEnv('WA_CHAT_PHONE_NUMBER_ID', '');
    expect(await sendLine(notifOnly, legacy)).toEqual({});
  });
});
