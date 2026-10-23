import { SETTING_DEFAULTS } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { readerOf } from '../../common/settings/settings.fakes';
import { FeedbackSettings } from './feedback.settings';

/** What PublicFeedbackLimit read before the reader existed: the reader lists exactly these. */
const BEFORE = ['feedback_rate_window_min'] as const;

describe('FeedbackSettings', () => {
  it('reads exactly its keys, with the registry defaults', async () => {
    const values = await readerOf(FeedbackSettings).read();
    expect(Object.keys(values)).toEqual(BEFORE);
    expect(values).toEqual(Object.fromEntries(BEFORE.map((k) => [k, SETTING_DEFAULTS[k]])));
  });

  it('answers the stored window', async () => {
    expect(await readerOf(FeedbackSettings, { feedback_rate_window_min: 2 }).read()).toEqual({ feedback_rate_window_min: 2 });
  });
});
