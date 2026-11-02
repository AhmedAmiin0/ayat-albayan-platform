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
    // A row that also reaches the teacher (a schedule change) counts under both tabs.
    const twice = ENTRIES.filter((e) => e.also_to?.length).length;
    expect(tabs.reduce((n, tab) => n + tab.count, 0)).toBe(ENTRIES.length + twice);
  });

  it('a schedule change is listed under the guardian AND the teacher (owner 2026-10-30)', () => {
    for (const tab of ['guardian', 'teacher'] as const) {
      const keys = rowsOf(ENTRIES, tab).map((e) => e.key);
      expect(keys).toEqual(expect.arrayContaining(['lesson_rescheduled', 'course_paused']));
    }
    expect(rowsOf(ENTRIES, 'lead').map((e) => e.key)).not.toContain('lesson_cancelled');
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
