import { describe, expect, it } from 'vitest';
import { crmTemplateLanguage, crmTemplateName, isCrmReportName, templateCrmNameSchema } from './crm-names.js';

const row = (over: Partial<{ key: string; crm_name: string | null; crm_language: string | null }> = {}) => ({
  key: 'booking_confirmation',
  meta_name: 'booking_confirmation',
  language: 'ar',
  ...over,
});

describe('crm template names (docs/19 «crm driver»)', () => {
  it('meta_name by default; the old script\'s name for teacher_new_student; the admin\'s crm_name wins', () => {
    expect(crmTemplateName(row())).toBe('booking_confirmation');
    expect(crmTemplateName({ ...row({ key: 'teacher_new_student' }), meta_name: 'teacher_new_student' })).toBe('teacher_lesson_v2');
    expect(crmTemplateName(row({ key: 'teacher_new_student', crm_name: 'teacher_alert_x' }))).toBe('teacher_alert_x');
  });

  it('both same-day teacher reminders go as the old script\'s teacher_lesson_reminder', () => {
    for (const key of ['teacher_lesson_reminder', 'teacher_lesson_reminder_meet']) {
      expect(crmTemplateName({ ...row({ key }), meta_name: key })).toBe('teacher_lesson_reminder');
    }
    expect(crmTemplateName(row({ key: 'teacher_lesson_reminder_meet', crm_name: 'x_y' }))).toBe('x_y');
  });

  it('the language: crm_language, else the template\'s own', () => {
    expect(crmTemplateLanguage(row())).toBe('ar');
    expect(crmTemplateLanguage(row({ crm_language: 'en_US' }))).toBe('en_US');
  });

  it('only the old script\'s two report names switch report_ready to PDF + template', () => {
    expect(isCrmReportName('report_session')).toBe(true);
    expect(isCrmReportName('report_trial_session')).toBe(true);
    expect(isCrmReportName('report_ready')).toBe(false);
  });

  it('the form: blank clears, a name outside Meta\'s rules is refused', () => {
    expect(templateCrmNameSchema.parse({ crm_name: ' ', crm_language: '' })).toEqual({ crm_name: null, crm_language: null });
    expect(templateCrmNameSchema.parse({ crm_name: 'report_session', crm_language: 'ar' })).toEqual({ crm_name: 'report_session', crm_language: 'ar' });
    expect(templateCrmNameSchema.safeParse({ crm_name: 'Report Session', crm_language: null }).success).toBe(false);
    expect(templateCrmNameSchema.safeParse({ crm_name: null, crm_language: 'arabic' }).success).toBe(false);
  });
});
