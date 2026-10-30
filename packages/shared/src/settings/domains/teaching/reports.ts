import type { SettingDef } from '../../defs.js';

const h = 'settings.hints';

/** «التقارير» (R-RPT-02): how long a teacher may still edit a submitted lesson report, and the form version. */
export const REPORT_SETTINGS = {
  report_teacher_edit_hours: {
    module: 'reports', group: 'reports',
    type: 'int', default: 24, min: 0, max: 168,
    labelKey: 'settings.reportTeacherEditHours', hintKey: `${h}.reportTeacherEditHours`,
  },
  /**
   * The new lesson report form (owner 2026-10-26, docs/design/report-form). Off = the form and the
   * family report exactly as before; on = new drafts use the v2 form. Old reports never change.
   */
  report_form_v2: {
    module: 'reports', group: 'reports', confirm: 'simple', reachesFamilies: true,
    type: 'bool', default: false, labelKey: 'settings.reportFormV2', hintKey: `${h}.reportFormV2`,
  },
} as const satisfies Record<string, SettingDef>;
