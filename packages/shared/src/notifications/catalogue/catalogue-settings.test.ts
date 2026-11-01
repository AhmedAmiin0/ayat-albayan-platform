import { describe, expect, expectTypeOf, it } from 'vitest';
import type { TemplateStatus, WaLine } from '@ab/catalog';
import { TEMPLATE_KEYS } from '../../messaging/templates/templates.js';
import { isSettingKey, SETTING_DEFAULTS, type AcademySettings } from '@ab/settings';
import { CATALOGUE_SETTING_KEYS, type CatalogueSettings } from './catalogue-settings.js';
import { catalogueViews } from './catalogue-state.js';
import type { RowSwitchKey, TimingKey } from './catalogue.types.js';

const templates = new Map(TEMPLATE_KEYS.map((k) => [k, { status: 'approved' as TemplateStatus, line: 'notifications' as WaLine }]));

/** Only the catalogue's keys of a full settings object. */
const slice = (s: AcademySettings): CatalogueSettings =>
  Object.fromEntries(CATALOGUE_SETTING_KEYS.map((k) => [k, s[k]])) as CatalogueSettings;

describe('the catalogue settings slice', () => {
  it('names nine distinct registry keys', () => {
    expect(CATALOGUE_SETTING_KEYS).toHaveLength(9);
    expect(new Set(CATALOGUE_SETTING_KEYS).size).toBe(9);
    expect(CATALOGUE_SETTING_KEYS.every((k) => isSettingKey(k))).toBe(true);
  });

  it('covers every row switch and every timing', () => {
    expectTypeOf<RowSwitchKey>().toExtend<keyof CatalogueSettings>();
    expectTypeOf<TimingKey>().toExtend<keyof CatalogueSettings>();
    expectTypeOf<AcademySettings>().toExtend<CatalogueSettings>();
  });

  it('the slice decides every row exactly as the full settings do', () => {
    const on: AcademySettings = { ...SETTING_DEFAULTS, messaging_enabled: true, auto_messages_enabled: true, feedback_mode: 'link' };
    for (const s of [SETTING_DEFAULTS, on]) {
      for (const gateReason of [null, 'switch_off'] as const) {
        expect(catalogueViews({ settings: slice(s), gateReason, templates })).toEqual(catalogueViews({ settings: s, gateReason, templates }));
      }
    }
  });
});
