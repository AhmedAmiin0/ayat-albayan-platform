import type { SettingDef } from '../defs.js';

const h = 'settings.hints';

/** «التقارير» (R-RPT-02): how long a teacher may still edit a submitted lesson report. */
export const REPORT_SETTINGS = {
  report_teacher_edit_hours: {
    module: 'reports', group: 'reports',
    type: 'int', default: 24, min: 0, max: 168,
    labelKey: 'settings.reportTeacherEditHours', hintKey: `${h}.reportTeacherEditHours`,
  },
} as const satisfies Record<string, SettingDef>;
