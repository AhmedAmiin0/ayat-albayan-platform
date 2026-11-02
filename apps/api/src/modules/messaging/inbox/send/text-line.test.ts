import { afterEach, describe, expect, it, vi } from 'vitest';
import { setNumbersOverlay } from '@/common/configuration/integrations/numbers-overlay';
import { PHONE, threadRow } from '@/modules/messaging/inbox/inbox.fakes';
import type { ThreadWindow } from './send-number';
import { NUMBERS } from './send-number.fakes';
import { textLine } from './text-line';

// Owner 2026-10-31: after the 24 h window a free text is still tried, on a Kapso chat line only.
// Fakes only: never Kapso, never WhatsApp.

const NOW = new Date('2026-10-31T10:00:00Z');
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();
const old = hoursAgo(30);
const closed = threadRow({ last_inbound_at: old, last_notifications_inbound_at: old });
const openChat = threadRow({ last_inbound_at: hoursAgo(1), last_chat_inbound_at: hoursAgo(1) });
const LINES = {
  WA_API_BASE: 'http://wa-stub.test',
  WA_PHONE_NUMBER_ID: 'n-phone',
  WA_WABA_ID: 'n-waba',
  WA_ACCESS_TOKEN: 'meta-token-fake',
  WA_CHAT_PHONE_NUMBER_ID: 'c-phone',
  WA_CHAT_WABA_ID: 'c-waba',
  KAPSO_API_BASE: 'http://wa-stub.test/kapso',
  KAPSO_API_KEY: 'kapso-key-fake',
  WACRM_API_BASE: 'http://wa-stub.test/crm/api/v1',
  WACRM_API_KEY: 'crm-key-fake',
};
const chatOn = (provider: 'meta' | 'kapso' | 'crm') => {
  for (const [k, v] of Object.entries({ ...LINES, WA_CHAT_PROVIDER: provider })) vi.stubEnv(k, v);
};
const kapso = (answer = true) => ({ reopen: vi.fn(async () => answer) });
const noWindows = async (): Promise<ThreadWindow[]> => [];
type Kapso = ReturnType<typeof kapso>;
const at = (k: Kapso) => ({ now: NOW, windows: noWindows, phone: PHONE, kapso: k });
const code = (e: unknown) => (e as { getResponse(): { code: string } }).getResponse().code;
const status = (e: unknown) => (e as { getStatus(): number }).getStatus();

afterEach(() => {
  setNumbersOverlay(null);
  vi.unstubAllEnvs();
});

describe('textLine', () => {
  it('kapso chat line, every window closed: Kapso reopened for that phone, then the chat line', async () => {
    chatOn('kapso');
    const k = kapso();
    expect(await textLine(closed, at(k))).toEqual({ line: 'chat' });
    expect(k.reopen).toHaveBeenCalledExactlyOnceWith(PHONE);
  });

  it('the reopen failed (false: logged by KapsoReopener): the text is still tried', async () => {
    chatOn('kapso');
    const k = kapso(false);
    expect(await textLine(closed, at(k))).toEqual({ line: 'chat' });
    expect(k.reopen).toHaveBeenCalledOnce();
  });

  it('an open window: the usual line, Kapso is never called', async () => {
    chatOn('kapso');
    const k = kapso();
    expect(await textLine(openChat, at(k))).toEqual({ line: 'chat' });
    expect(k.reopen).not.toHaveBeenCalled();
  });

  it.each(['meta', 'crm'] as const)('a %s chat line keeps 409 session_closed, no reopen', async (p) => {
    chatOn(p);
    const k = kapso();
    const e = await textLine(closed, at(k)).catch((x: unknown) => x);
    expect([status(e), code(e)]).toEqual([409, 'session_closed']);
    expect(k.reopen).not.toHaveBeenCalled();
  });

  it('no thread (the number never wrote): 409 even on kapso, no reopen', async () => {
    chatOn('kapso');
    const k = kapso();
    const e = await textLine(null, at(k)).catch((x: unknown) => x);
    expect([status(e), code(e)]).toEqual([409, 'session_closed']);
    expect(k.reopen).not.toHaveBeenCalled();
  });

  it('module mode: the default chat number is stamped, as the claim would', async () => {
    chatOn('kapso');
    setNumbersOverlay({ values: {}, numberIds: { chat: 'num-chat' }, numbers: NUMBERS });
    const k = kapso();
    expect(await textLine(closed, at(k))).toEqual({ line: 'chat', number_id: 'num-chat' });
    expect(k.reopen).toHaveBeenCalledOnce();
  });
});
