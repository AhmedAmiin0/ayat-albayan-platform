import { describe, expect, it } from 'vitest';
import { SETTING_DEFAULTS, settingsRoutes as routes } from '../..';

const lists = { saved: ['late_cancel_hours'], moved: ['comms_source'], invalid: [] };

describe('settingsRoutes.update', () => {
  it('takes any object and refuses anything else as expected_object', () => {
    expect(routes.update.body.parse({ lateCancelHours: 'x' })).toEqual({ lateCancelHours: 'x' });
    const refused = routes.update.body.safeParse([1]);
    expect(refused.error?.issues[0]?.message).toBe('expected_object');
  });

  it('answers the settings after the write and the three per-key lists', () => {
    const answer = { ...SETTING_DEFAULTS, ...lists };
    expect(routes.update.response.parse(answer)).toEqual(answer);
  });

  it('refuses a saved key that is not a setting and an answer without its lists', () => {
    const odd = { ...SETTING_DEFAULTS, ...lists, saved: ['no_such_key'] };
    expect(routes.update.response.safeParse(odd).success).toBe(false);
    expect(routes.update.response.safeParse(SETTING_DEFAULTS).success).toBe(false);
  });
});
