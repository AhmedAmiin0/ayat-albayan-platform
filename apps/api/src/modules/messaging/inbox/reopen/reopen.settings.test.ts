import { describe, expect, it } from 'vitest';
import { readerOf } from '@/common/settings/settings.fakes';
import type { Db } from '@/common/db/db.module';
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
    const queries = new ReopenRepo({} as Db, readerOf(ReopenSettings, { chat_reopen_template: 'reopen_x' }));
    expect(await queries.templateKey()).toBe('reopen_x');
  });
});
