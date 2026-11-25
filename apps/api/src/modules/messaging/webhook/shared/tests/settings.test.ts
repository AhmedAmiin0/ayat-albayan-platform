import { SETTING_DEFAULTS } from '@ab/settings';
import { describe, expect, it } from 'vitest';
import { readerOf } from '@/common/settings/settings.fakes';
import { WebhookSettings } from '@/modules/messaging/webhook/shared/webhook.settings';

/** What WebhookQueries read before the reader existed: the reader lists exactly these. */
const BEFORE = ['quick_reply_window_hours'] as const;

describe('WebhookSettings', () => {
  it('reads exactly its keys, with the registry defaults', async () => {
    const values = await readerOf(WebhookSettings).read();
    expect(Object.keys(values)).toEqual(BEFORE);
    expect(values).toEqual(Object.fromEntries(BEFORE.map((k) => [k, SETTING_DEFAULTS[k]])));
  });

  it('answers the stored reply window', async () => {
    expect(await readerOf(WebhookSettings, { quick_reply_window_hours: 6 }).read()).toEqual({ quick_reply_window_hours: 6 });
  });
});
