import { describe, expect, it } from 'vitest';
import { crmTemplateBody } from './crm-body';
import { templateMessage } from './wa-components';
import { templateRow } from './whatsapp.fakes';

// docs/19 «crm driver»: the CRM's own name (crm_name, the old script's default) and the producer's CRM values,
// used only by the crm driver; the meta driver keeps meta_name and its own values.

const TO = '+966500000002';
const ALERT = templateRow({
  key: 'teacher_new_student',
  meta_name: 'teacher_new_student',
  body_ar: 'طالب جديد: {{1}} — {{2}} ({{3}})',
  params: ['student_names', 'lesson_when', 'kind'],
  buttons: [],
});
const crm = {
  body: ['أ. خالد', 'سارة', 'AB-0001', 'الأحد 5:00 م', '30 دقيقة'],
  buttons: ['classroom/l-1', 'teacher/report/l-1'],
};
const params = { '1': 'سارة', '2': 'الأحد 5:00 م', '3': 'تجريبية', crm };

describe('teacher_new_student on a crm line = the CRM\'s teacher_lesson_v2', () => {
  it('five body values and both URL buttons (join, report) by index', () => {
    expect(crmTemplateBody({ to: TO, template: ALERT, params })).toEqual({
      to: TO,
      type: 'template',
      template: {
        name: 'teacher_lesson_v2',
        language: 'ar',
        params: { body: crm.body, buttonParams: { '0': 'classroom/l-1', '1': 'teacher/report/l-1' } },
      },
    });
  });

  it('the admin\'s crm_name / crm_language win; the meta values still have to be complete', () => {
    const named = templateRow({ ...ALERT, crm_name: 'teacher_alert_x', crm_language: 'ar_EG' });
    expect(crmTemplateBody({ to: TO, template: named, params })).toMatchObject({ template: { name: 'teacher_alert_x', language: 'ar_EG' } });
    expect(() => crmTemplateBody({ to: TO, template: ALERT, params: { crm } })).toThrow();
  });

  it('the meta driver ignores crm_name and the CRM values: meta_name, its own three values', () => {
    const named = templateRow({ ...ALERT, crm_name: 'teacher_alert_x' });
    const body = templateMessage({ to: TO, template: named, params });
    expect(body).toMatchObject({ template: { name: 'teacher_new_student', language: { code: 'ar' } } });
    expect(JSON.stringify(body)).not.toContain('AB-0001');
  });

  it('a template the CRM shares with us keeps meta_name (booking_confirmation)', () => {
    expect(crmTemplateBody({ to: TO, template: templateRow(), params: { '1': 'س', '2': 'ح', button: 'r' } })).toMatchObject({
      template: { name: 'booking_confirmation', language: 'ar' },
    });
  });
});
