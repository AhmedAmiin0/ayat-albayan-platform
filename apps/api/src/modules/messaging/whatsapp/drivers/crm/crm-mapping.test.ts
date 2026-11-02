import { describe, expect, it } from 'vitest';
import { crmTemplateBody } from './crm-body';
import { templateMessage } from '../../messages/wa-components';
import { templateRow } from '../../whatsapp.fakes';

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

  it('crm_name = the Meta name (the CRM\'s copy of the Meta template): the Meta values, never the five', () => {
    const copy = templateRow({ ...ALERT, crm_name: 'teacher_new_student' });
    expect(crmTemplateBody({ to: TO, template: copy, params })).toEqual({
      to: TO,
      type: 'template',
      template: { name: 'teacher_new_student', language: 'ar', params: { body: ['سارة', 'الأحد 5:00 م', 'تجريبية'] } },
    });
  });

  it('a row without the CRM values (queued before them, a value missing): meta_name and the Meta values, as before', () => {
    const metaOnly = { '1': params['1'], '2': params['2'], '3': params['3'] };
    expect(crmTemplateBody({ to: TO, template: ALERT, params: metaOnly })).toMatchObject({
      template: { name: 'teacher_new_student', params: { body: ['سارة', 'الأحد 5:00 م', 'تجريبية'] } },
    });
    const named = templateRow({ ...ALERT, crm_name: 'teacher_lesson_v2' });
    expect(crmTemplateBody({ to: TO, template: named, params: metaOnly })).toMatchObject({ template: { name: 'teacher_lesson_v2' } });
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

const MEET = templateRow({
  key: 'teacher_lesson_reminder_meet',
  meta_name: 'teacher_lesson_reminder_meet',
  body_ar: 'أستاذ {{1}}، لديك حلقة {{2}}',
  params: ['teacher_name', 'lesson_slot'],
  buttons: [{ type: 'url', url: 'https://meet.google.com/{{1}}' }],
});
const PLAIN = templateRow({ ...MEET, key: 'teacher_lesson_reminder', meta_name: 'teacher_lesson_reminder', buttons: [] });
const LINE = 'الأحد 17:00 · سارة (AB-0001) · رابط الحلقة: https://meet.google.com/abc-defg-hij · تقرير الحلقة: https://app.example/teacher/report/l-1';
const own = { body: ['أ. خالد', LINE], buttons: [] };
const meetParams = { '1': 'أ. خالد', '2': '17:00 — سارة', button: 'abc-defg-hij' };
const plainParams = { '1': 'أ. خالد', '2': '17:00 — سارة · رابط الحلقة: https://meet.jit.si/r-1' };

describe('the teacher\'s same-day reminders on a crm line = the CRM\'s teacher_lesson_reminder', () => {
  it('both keys: its name, [teacher, one line], no buttonParams (not even the Meet code)', () => {
    for (const [template, meta] of [[MEET, meetParams], [PLAIN, plainParams]] as const) {
      expect(crmTemplateBody({ to: TO, template, params: { ...meta, crm: own } })).toEqual({
        to: TO,
        type: 'template',
        template: { name: 'teacher_lesson_reminder', language: 'ar', params: { body: own.body } },
      });
    }
  });

  it('queued without params.crm (a value missing): meta_name and the Meta values, as before', () => {
    expect(crmTemplateBody({ to: TO, template: MEET, params: meetParams })).toMatchObject({
      template: {
        name: 'teacher_lesson_reminder_meet',
        params: { body: ['أ. خالد', '17:00 — سارة'], buttonParams: { '0': 'abc-defg-hij' } },
      },
    });
    const plain = crmTemplateBody({ to: TO, template: PLAIN, params: plainParams });
    expect(plain).toMatchObject({ template: { name: 'teacher_lesson_reminder', params: { body: ['أ. خالد', plainParams['2']] } } });
  });

  it('an admin\'s crm_name = the Meta name of _meet (its copy on the CRM): the Meta values', () => {
    const copy = templateRow({ ...MEET, crm_name: 'teacher_lesson_reminder_meet' });
    const body = crmTemplateBody({ to: TO, template: copy, params: { ...meetParams, crm: own } });
    expect(body).toMatchObject({
      template: { name: 'teacher_lesson_reminder_meet', params: { body: ['أ. خالد', '17:00 — سارة'] } },
    });
  });

  it('the meta driver: meta_name, its two values and the Meet code, never the CRM line', () => {
    const meta = templateMessage({ to: TO, template: MEET, params: { ...meetParams, crm: own } });
    expect(meta).toMatchObject({ template: { name: 'teacher_lesson_reminder_meet' } });
    expect(JSON.stringify(meta)).toContain('abc-defg-hij');
    expect(JSON.stringify(meta)).not.toContain('AB-0001');
  });
});
