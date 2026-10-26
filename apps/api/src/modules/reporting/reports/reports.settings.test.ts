import { SETTING_DEFAULTS } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { readerOf } from '../../../common/settings/settings.fakes';
import { ReportsSettings } from './reports.settings';

/** What ReportGate read before the reader existed: the reader lists exactly these. */
const BEFORE = ['report_teacher_edit_hours', 'late_cancel_hours'] as const;

describe('ReportsSettings', () => {
  it('reads exactly its keys, in order, with the registry defaults', async () => {
    const values = await readerOf(ReportsSettings).read();
    expect(Object.keys(values)).toEqual(BEFORE);
    expect(values).toEqual(Object.fromEntries(BEFORE.map((k) => [k, SETTING_DEFAULTS[k]])));
  });

  it('answers the stored edit window and late-cancel policy', async () => {
    const values = await readerOf(ReportsSettings, { report_teacher_edit_hours: 6, late_cancel_hours: 12 }).read();
    expect(values).toEqual({ report_teacher_edit_hours: 6, late_cancel_hours: 12 });
  });
});
