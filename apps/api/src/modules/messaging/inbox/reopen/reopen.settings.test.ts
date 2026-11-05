import { describe, expect, it } from 'vitest';
import { readerOf } from '@/common/settings/settings.fakes';
import type { ReopenRequest } from '@/modules/messaging/whatsapp';
import { ReopenRepo } from './reopen.repo';
import { ReopenSettings } from './reopen.settings';

describe('ReopenSettings', () => {
  it('defaults to welcome_greeting (owner 2026-11-03: a starter with no variables)', async () => {
    expect(await readerOf(ReopenSettings).read()).toEqual({ chat_reopen_template: 'welcome_greeting' });
  });

  it('answers the stored key', async () => {
    expect(await readerOf(ReopenSettings, { chat_reopen_template: 'reopen_x' }).read()).toEqual({ chat_reopen_template: 'reopen_x' });
  });

  it('ReopenQueries.templateKey answers the configured key', async () => {
    const queries = new ReopenRepo(readerOf(ReopenSettings, { chat_reopen_template: 'reopen_x' }), {} as ReopenRequest);
    expect(await queries.templateKey()).toBe('reopen_x');
  });

  it('ReopenRepo.nextKey asks the sender window (a failed or expired reopen never blocks)', async () => {
    const request = { nextKey: async (phone: string) => `reopen:${phone}:2026-11-05:2` };
    const queries = new ReopenRepo(readerOf(ReopenSettings), request as unknown as ReopenRequest);
    expect(await queries.nextKey('+966500000001', new Date())).toBe('reopen:+966500000001:2026-11-05:2');
  });
});
