import { SETTING_DEFAULTS } from '@ab/shared';
import { describe, expect, it, vi } from 'vitest';
import type { SettingsService } from '../settings/settings.service';
import { PublicConfigService } from './config.public.service';
import type { CustomConfigService } from './custom-config.service';

function make(all: object) {
  const settings = { all: vi.fn().mockResolvedValue({ ...SETTING_DEFAULTS, ...all }) } as unknown as SettingsService;
  const custom = { publicRows: vi.fn().mockResolvedValue([{ key: 'promo', value: 'hi', is_public: true }]) } as unknown as CustomConfigService;
  return new PublicConfigService(settings, custom);
}

describe('PublicConfigService', () => {
  it('serves the public settings and public custom entries', async () => {
    const out = await make({ academy_contact: { site: 'x.org' } }).read();
    expect(out.settings.academy_contact).toEqual({ site: 'x.org' });
    expect(out.custom).toEqual({ promo: 'hi' });
  });

  it('a non-public setting never leaks, whatever its value', async () => {
    const out = await make({ messaging_enabled: true, late_cancel_hours: 6 }).read();
    const text = JSON.stringify(out);
    for (const leak of ['messaging_enabled', 'late_cancel_hours', 'follow_up_hours', 'crm_cutover_done', 'academy_timezone']) {
      expect(text).not.toContain(leak);
    }
  });
});
