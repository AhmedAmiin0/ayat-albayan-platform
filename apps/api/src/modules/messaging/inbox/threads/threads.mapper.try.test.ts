import { afterEach, describe, expect, it, vi } from 'vitest';
import { threadRow } from '@/modules/messaging/inbox/inbox.fakes';
import { toThreadView } from './threads.mapper';

// try_after_window (owner 2026-10-31): the composers let staff type after the window on Kapso only.

const NOW = new Date('2026-10-31T10:00:00Z');
const LINES = {
  WA_API_BASE: 'http://wa-stub.test',
  WA_PHONE_NUMBER_ID: 'n-phone',
  WA_WABA_ID: 'n-waba',
  WA_ACCESS_TOKEN: 'meta-token-fake',
  WA_CHAT_PHONE_NUMBER_ID: 'c-phone',
  WA_CHAT_WABA_ID: 'c-waba',
  KAPSO_API_BASE: 'http://wa-stub.test/kapso',
  KAPSO_API_KEY: 'kapso-key-fake',
};
const chatOn = (provider: 'meta' | 'kapso') => {
  for (const [k, v] of Object.entries({ ...LINES, WA_CHAT_PROVIDER: provider })) vi.stubEnv(k, v);
};

describe('toThreadView try_after_window', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('a Kapso chat line with a usable reopen template: true, whatever the window', () => {
    chatOn('kapso');
    const view = toThreadView(threadRow(), NOW, { reopenUsable: 'template' });
    expect(view).toMatchObject({ try_after_window: true, reopen_choice: 'template' });
  });

  it('a Kapso chat line set to «بدون قالب»: true, and the note says it waits (owner 11-06)', () => {
    chatOn('kapso');
    const view = toThreadView(threadRow(), NOW, { reopenUsable: 'wait' });
    expect(view).toMatchObject({ try_after_window: true, reopen_choice: 'wait' });
  });

  it('a Kapso chat line with no usable reopen template: absent (nothing would be sent)', () => {
    chatOn('kapso');
    expect(toThreadView(threadRow(), NOW, { reopenUsable: null })).not.toHaveProperty('try_after_window');
    expect(toThreadView(threadRow(), NOW)).not.toHaveProperty('try_after_window');
  });

  it('a meta chat line: absent (templates only after the window, as before)', () => {
    chatOn('meta');
    const view = toThreadView(threadRow(), NOW, { reopenUsable: 'wait' });
    expect(view).not.toHaveProperty('try_after_window');
    expect(view).not.toHaveProperty('reopen_choice');
  });
});
