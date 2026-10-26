import { CATALOGUE_SETTING_KEYS, SETTING_DEFAULTS, type CatalogueSettings } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { readerOf } from '../../../common/settings/settings.fakes';
import { NotificationRulesSettings } from './notification-rules.settings';

/** RulesService handed its settings to catalogueViews, which reads only CatalogueSettings: exactly these keys. */
const BEFORE = [...CATALOGUE_SETTING_KEYS];

describe('NotificationRulesSettings', () => {
  it('reads exactly CATALOGUE_SETTING_KEYS, in order, with the registry defaults', async () => {
    const values: CatalogueSettings = await readerOf(NotificationRulesSettings).read();
    expect(Object.keys(values)).toEqual(BEFORE);
    expect(values).toEqual(Object.fromEntries(BEFORE.map((k) => [k, SETTING_DEFAULTS[k]])));
  });

  it('answers the stored switches and timings', async () => {
    const values = await readerOf(NotificationRulesSettings, { reminder_24h_enabled: true, follow_up_hours: [12] }).read();
    expect(values.reminder_24h_enabled).toBe(true);
    expect(values.follow_up_hours).toEqual([12]);
  });
});
