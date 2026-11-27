import { describe, expect, it } from 'vitest';
import { SETTING_DEFAULTS, settingsRoutes as routes } from '../..';

describe('settingsRoutes', () => {
  it('keeps the paths, tag and permissions of today', () => {
    expect(routes.view).toMatchObject({
      method: 'GET',
      path: '/settings',
      permissions: ['settings.read'],
      tags: ['settings'],
    });
    expect(routes.update).toMatchObject({
      method: 'PATCH',
      path: '/settings',
      permissions: ['settings.write'],
      tags: ['settings'],
    });
  });

  it('reads every setting with its default', () => {
    expect(routes.view.response.parse(SETTING_DEFAULTS)).toEqual(SETTING_DEFAULTS);
  });

  it('refuses a missing setting and a value outside its range', () => {
    const missing = Object.fromEntries(
      Object.entries(SETTING_DEFAULTS).filter(([key]) => key !== 'late_cancel_hours'),
    );
    expect(routes.view.response.safeParse(missing).success).toBe(false);
    const far = { ...SETTING_DEFAULTS, reminder_minutes_before: 721 };
    expect(routes.view.response.safeParse(far).success).toBe(false);
  });

  it('refuses a stored text with spaces around it', () => {
    const name = Object.entries(SETTING_DEFAULTS).find(([, v]) => typeof v === 'string');
    expect(name).toBeDefined();
    const spaced = { ...SETTING_DEFAULTS, [name?.[0] ?? '']: ' x ' };
    expect(routes.view.response.safeParse(spaced).success).toBe(false);
  });
});
