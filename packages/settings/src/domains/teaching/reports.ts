import type { SettingDef } from '../../defs.js';

const h = 'settings.hints';

/**
 * «التقارير» (R-REP-02/03): the teacher's edit window after the first submit (the report goes to the
 * family when it closes), the no-login report link's lifetime, and the form version.
 */
export const REPORT_SETTINGS = {
  /**
   * docs/46 D5: minutes a teacher may edit a submitted report, counted from the FIRST submit (edits
   * never extend it); the PDF job renders and sends it once the window closes. 0 = sent at once.
   * No settings row is seeded: the default here applies until an admin saves one.
   */
  report_teacher_edit_minutes: {
    module: 'reports', group: 'reports',
    type: 'int', default: 30, min: 0, max: 1440,
    labelKey: 'settings.reportTeacherEditMinutes', hintKey: `${h}.reportTeacherEditMinutes`,
  },
  /**
   * The no-login teacher report link lives until the lesson's end + these hours (signed into its
   * token: never reuse it for anything else). Not the edit window since docs/46 B1.
   */
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
