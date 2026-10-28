import { SETTING_DEFAULTS } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { readerOf } from '../../../common/settings/settings.fakes';
import { ReportsSettings } from './reports.settings';

/** What ReportGate read before the reader existed, plus the v2 form flag: the reader lists exactly these. */
const BEFORE = ['report_teacher_edit_hours', 'late_cancel_hours', 'report_form_v2'] as const;

describe('ReportsSettings', () => {
  it('reads exactly its keys, in order, with the registry defaults', async () => {
    const values = await readerOf(ReportsSettings).read();
    expect(Object.keys(values)).toEqual(BEFORE);
    expect(values).toEqual(Object.fromEntries(BEFORE.map((k) => [k, SETTING_DEFAULTS[k]])));
  });

  it('answers the stored edit window, late-cancel policy and v2 flag', async () => {
    const values = await readerOf(ReportsSettings, { report_teacher_edit_hours: 6, late_cancel_hours: 12, report_form_v2: true }).read();
    expect(values).toEqual({ report_teacher_edit_hours: 6, late_cancel_hours: 12, report_form_v2: true });
  });
});
