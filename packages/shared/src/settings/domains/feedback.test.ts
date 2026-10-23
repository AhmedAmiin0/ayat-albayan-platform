import { describe, expect, expectTypeOf, it } from 'vitest';
import { SETTING_DEFAULTS, type AcademySettings } from '../registry.js';
import { FEEDBACK_MODES, FEEDBACK_SETTINGS, type FeedbackMode } from './feedback.js';

describe('feedback settings (migration 195)', () => {
  it('FEEDBACK_MODES are the feedback_mode options, buttons first', () => {
    expect(FEEDBACK_MODES).toEqual(['buttons', 'link']);
    expect(FEEDBACK_MODES).toBe(FEEDBACK_SETTINGS.feedback_mode.options);
    expect(SETTING_DEFAULTS.feedback_mode).toBe('buttons');
  });

  it('FeedbackMode is the stored type of feedback_mode', () => {
    expectTypeOf<FeedbackMode>().toEqualTypeOf<AcademySettings['feedback_mode']>();
    expectTypeOf<FeedbackMode>().toEqualTypeOf<'buttons' | 'link'>();
  });

  it('the public form rate window is 10 minutes by default, 1 to 120', () => {
    expect(FEEDBACK_SETTINGS.feedback_rate_window_min).toMatchObject({ type: 'int', default: 10, min: 1, max: 120 });
  });
});
