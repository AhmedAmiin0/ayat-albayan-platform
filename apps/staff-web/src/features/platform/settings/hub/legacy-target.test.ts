import { describe, expect, it } from 'vitest';
import { legacySettingsTarget } from './legacy-target';

describe('legacySettingsTarget (old /admin/settings anchors, docs/26 §4)', () => {
  it('#integrations goes to the integrations page and keeps the query verbatim (Google OAuth return)', () => {
    expect(legacySettingsTarget('#integrations', '')).toBe('/admin/settings/integrations');
    expect(legacySettingsTarget('#integrations', '?google=connected')).toBe('/admin/settings/integrations?google=connected');
    expect(legacySettingsTarget('#integrations', '?google=error&reason=denied')).toBe(
      '/admin/settings/integrations?google=error&reason=denied',
    );
    expect(legacySettingsTarget('integrations', 'google=connected')).toBe('/admin/settings/integrations?google=connected');
    expect(legacySettingsTarget('#integrations', '?')).toBe('/admin/settings/integrations');
  });

  it('#settings-integrations goes to the integrations page too', () => {
    expect(legacySettingsTarget('#settings-integrations', '')).toBe('/admin/settings/integrations');
  });

  it('messaging and numbers go to «التواصل» (numbers on its tab)', () => {
    expect(legacySettingsTarget('#settings-messaging', '')).toBe('/admin/settings/communications');
    expect(legacySettingsTarget('#settings-numbers', '')).toBe('/admin/settings/communications?tab=numbers');
  });

  it('appearance and custom values', () => {
    expect(legacySettingsTarget('#settings-appearance', '')).toBe('/admin/settings/appearance');
    expect(legacySettingsTarget('#settings-custom', '')).toBe('/admin/settings/values?group=custom');
  });

  it.each(['schedule', 'classroom', 'reports', 'accounts', 'uploads', 'academy', 'sales'])(
    '#settings-%s opens that group of «القيم»',
    (group) => {
      expect(legacySettingsTarget(`#settings-${group}`, '')).toBe(`/admin/settings/values?group=${group}`);
    },
  );

  it('no hash or an unknown one stays on the hub', () => {
    expect(legacySettingsTarget('', '')).toBeNull();
    expect(legacySettingsTarget('#', '?google=connected')).toBeNull();
    expect(legacySettingsTarget('#settings-', '')).toBeNull();
    expect(legacySettingsTarget('#settings-nope', '')).toBeNull();
    expect(legacySettingsTarget('#settings-payouts', '')).toBeNull();
    expect(legacySettingsTarget('#main', '')).toBeNull();
    expect(legacySettingsTarget('#INTEGRATIONS', '')).toBeNull();
  });
});
