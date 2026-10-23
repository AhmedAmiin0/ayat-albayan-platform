import { SETTING_DEFAULTS } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { readerOf } from '../../common/settings/settings.fakes';
import { LessonRatingSettings } from './lesson-rating.settings';

/** What RatingQueue read before the reader existed: the reader lists exactly these. */
const BEFORE = ['feedback_mode', 'auto_messages_enabled'] as const;

describe('LessonRatingSettings', () => {
  it('reads exactly its keys, in order, with the registry defaults', async () => {
    const values = await readerOf(LessonRatingSettings).read();
    expect(Object.keys(values)).toEqual(BEFORE);
    expect(values).toEqual(Object.fromEntries(BEFORE.map((k) => [k, SETTING_DEFAULTS[k]])));
  });

  it('answers the stored mode and switch', async () => {
    const values = await readerOf(LessonRatingSettings, { feedback_mode: 'link', auto_messages_enabled: true }).read();
    expect(values).toEqual({ feedback_mode: 'link', auto_messages_enabled: true });
  });
});
