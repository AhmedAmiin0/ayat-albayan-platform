import { describe, expect, it } from 'vitest';
import { readerOf } from '../../../../common/settings/settings.fakes';
import { ReopenSettings } from './reopen.settings';

describe('ReopenSettings', () => {
  it('defaults to inquiry_followup_ar_v2 (owner 2026-10-26), never v1', async () => {
    expect(await readerOf(ReopenSettings).read()).toEqual({ chat_reopen_template: 'inquiry_followup_ar_v2' });
  });

  it('answers the stored key', async () => {
    expect(await readerOf(ReopenSettings, { chat_reopen_template: 'reopen_x' }).read()).toEqual({ chat_reopen_template: 'reopen_x' });
  });
});
