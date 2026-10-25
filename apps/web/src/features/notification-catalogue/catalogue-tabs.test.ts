import { catalogueViews, SETTING_DEFAULTS } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { audienceTabs, rowsOf } from './catalogue-tabs';

const ENTRIES = catalogueViews({ settings: SETTING_DEFAULTS, gateReason: 'switch_off', templates: new Map() });
const c = t.notificationCatalogue;

describe('«ماذا يُرسل ومتى» audience tabs', () => {
  it('guardian, teacher, lead, staff, then «يدوي»; the counts add up to every row', () => {
    const tabs = audienceTabs(ENTRIES);
    expect(tabs.map((tab) => tab.value)).toEqual(['guardian', 'teacher', 'lead', 'staff', 'manual']);
    expect(tabs.map((tab) => tab.label)).toEqual([c.audience.guardian, c.audience.teacher, c.audience.lead, c.audience.staff, c.states.manual]);
    expect(tabs.reduce((n, tab) => n + tab.count, 0)).toBe(ENTRIES.length);
  });

  it('report_ready is a guardian row; manual rows sit only under «يدوي»', () => {
    expect(rowsOf(ENTRIES, 'guardian').map((e) => e.key)).toContain('report_ready');
    const manual = rowsOf(ENTRIES, 'manual');
    expect(manual.length).toBeGreaterThan(0);
    expect(manual.every((e) => e.manual)).toBe(true);
    expect(rowsOf(ENTRIES, 'guardian').some((e) => e.manual)).toBe(false);
  });

  it('no manual rows: no «يدوي» tab', () => {
    const tabs = audienceTabs(ENTRIES.filter((e) => !e.manual));
    expect(tabs.map((tab) => tab.value)).toEqual(['guardian', 'teacher', 'lead', 'staff']);
    expect(audienceTabs([]).every((tab) => tab.count === 0)).toBe(true);
  });
});
