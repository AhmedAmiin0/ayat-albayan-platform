import { describe, expect, it } from 'vitest';
import { settingText } from '@/components/settings/search/setting-text';
import { t } from '@/lib/i18n/i18n';
import { SETTINGS } from '@/test/settings-fixture';
import { allRows, groupRows, rowKey, rowMatches, rowWords, valueCounts, type ValueRow } from './value-rows';

const ENTRY = { key: 'promo.banner', value: 'x', description: 'نص الترحيب للتجربة', isPublic: true, updatedAt: 'T', updatedBy: null };
const q = (over: object = {}) => ({ q: '', settings: SETTINGS, ...over });

describe('«القيم» rows', () => {
  it('builds each group’s rows', () => {
    expect(groupRows('reports', []).map(rowKey)).toEqual(['report_teacher_edit_hours']);
    expect(groupRows('sending', [])[0]).toMatchObject({ kind: 'setting', owned: true });
    expect(groupRows('accounts', [])[0]).toMatchObject({ owned: false });
    expect(groupRows('google', []).map(rowKey)).toEqual(['google_sync_enabled', 'google_sync_mode', 'google_calendar_window_days']);
    expect(groupRows('custom', [ENTRY]).map(rowKey)).toEqual(['promo.banner']);
  });

  it('names rows from the registry, Google words and the custom description', () => {
    const [google] = groupRows('google', []);
    expect(google && rowWords(google).label).toBe(t.googleSync.switches.enabled);
    const custom: ValueRow = { kind: 'custom', entry: ENTRY, group: 'custom' };
    expect(rowWords(custom).label).toBe('نص الترحيب للتجربة');
    expect(rowWords({ ...custom, entry: { ...ENTRY, description: null } }).label).toBe('promo.banner');
  });

  it('search matches label, key and description across every group', () => {
    const keys = allRows([ENTRY], q({ q: 'fx_fresh' })).map(rowKey);
    expect(keys).toEqual(['fx_fresh_hours']);
    expect(allRows([ENTRY], q({ q: 'الترحيب' })).map(rowKey)).toEqual(['promo.banner']);
    expect(allRows([], q({ q: t.settings.reportingCurrency })).map(rowKey)).toEqual(['reporting_currency']);
  });

  it('filters: changed only, public only', () => {
    const changed = q({ filter: 'modified', settings: { ...SETTINGS, fx_fresh_hours: 6 } });
    expect(allRows([ENTRY], changed).map(rowKey)).toEqual(['fx_fresh_hours']);
    const google = q({ filter: 'modified', google: { enabled: true, mode: 'dry_run', window_days: 60 } });
    expect(allRows([], google).map(rowKey)).toEqual(['google_sync_enabled']);
    const pub = allRows([ENTRY], q({ filter: 'public' })).map(rowKey);
    expect(pub).toContain('makeup_window_days');
    expect(pub).toContain('promo.banner');
    expect(pub).not.toContain('fx_fresh_hours');
  });

  it('counts the editable values', () => {
    const counts = valueCounts({ ...SETTINGS, booking_horizon_weeks: 4 });
    expect(counts.total).toBe(36);
    expect(counts.modified).toBe(1);
    expect(counts.public).toBeGreaterThan(0);
    const [row] = groupRows('schedule', []);
    expect(row && rowMatches(row, q())).toBe(true);
  });

  it('a setting matches by its switch words too, like the hub search (late cancel, recording retention)', () => {
    for (const key of ['late_cancel_hours', 'recording_retention_days'] as const) {
      const toggle = settingText(key).toggle;
      expect(toggle).toBeTruthy();
      expect(allRows([], q({ q: toggle ?? '' })).map(rowKey)).toContain(key);
    }
  });
});
