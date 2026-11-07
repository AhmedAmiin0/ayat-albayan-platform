import { afterEach, describe, expect, it, vi } from 'vitest';
import { laneOfRow } from './drain';
import { templateStamp } from './send-line';
import { dueMessage } from './sender.fakes';
import { reopenRow } from './window/window-reopen';

// docs/42 42-7 (review of #695, item 1): a chat-line template is queued on the chat lane.

const NOW = new Date('2026-11-07T08:00:00Z');
const CHAT_ENV = {
  WA_API_BASE: 'http://wa-stub.test', WA_PHONE_NUMBER_ID: 'n-phone', WA_WABA_ID: 'n-waba',
  WA_ACCESS_TOKEN: 'meta-token-fake', WA_CHAT_PHONE_NUMBER_ID: 'c-phone', WA_CHAT_WABA_ID: 'c-waba',
  WA_CHAT_ACCESS_TOKEN: 'chat-token-fake',
};
const chatOn = () => Object.entries(CHAT_ENV).forEach(([k, v]) => vi.stubEnv(k, v));
const reopen = () => reopenRow(dueMessage({ line: 'chat' }), { key: 'chat_reopen', dedup: 'r:1', now: NOW });

describe('templateStamp (mirrors lineOf)', () => {
  afterEach(() => vi.unstubAllEnvs());

  it.each([
    { line: 'chat' as const, chat: true, stamp: { line: 'chat' } },
    { line: 'chat' as const, chat: false, stamp: {} },
    { line: 'notifications' as const, chat: true, stamp: {} },
  ])('$line template, chat configured $chat → $stamp', ({ line, chat, stamp }) => {
    expect(templateStamp({ line }, chat)).toEqual(stamp);
  });

  it('the reopen template is stamped chat, so the chat lane drains it', () => {
    chatOn();
    expect(reopen()).toMatchObject({ line: 'chat', template_key: 'chat_reopen' });
    expect(laneOfRow({ line: reopen().line ?? null })).toBe('chat');
  });

  it('one line (no chat client): the reopen row stays unstamped (main lane, as lineOf sends it)', () => {
    vi.stubEnv('WA_CHAT_PHONE_NUMBER_ID', '');
    expect(reopen().line).toBeUndefined();
  });
});
