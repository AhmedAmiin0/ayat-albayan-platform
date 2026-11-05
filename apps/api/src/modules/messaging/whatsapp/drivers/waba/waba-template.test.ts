import { describe, expect, it } from 'vitest';
import { REPORT_READY, templateRow } from '@/modules/messaging/whatsapp/whatsapp.fakes';
import { WaError } from '@/modules/messaging/whatsapp/whatsapp.types';
import { sentAs, wabaName, wabaTemplate } from './waba-template';

// docs/19 «CRM → Meta»: one resolution of the WABA template for every driver.

const TO = '+966500000004';
const BOOKING = { '1': 'سارة', '2': 'الأحد', button: 'room-1' };
const ALERT = templateRow({
  key: 'teacher_new_student',
  meta_name: 'teacher_new_student',
  body_ar: 'طالب جديد: {{1}} — {{2}} ({{3}})',
  buttons: [],
});
const CRM = { body: ['أ. خالد', 'سارة', 'AB-0001', 'الأحد', '30 دقيقة'], buttons: ['c/l-1', 'r/l-1'] };
const ALERT_PARAMS = { '1': 'سارة', '2': 'الأحد', '3': 'تجريبية', crm: CRM };

describe('wabaTemplate', () => {
  it('an ordinary row: meta_name, language, its own values and URL button', () => {
    expect(wabaTemplate({ to: TO, template: templateRow(), params: BOOKING })).toEqual({
      name: 'booking_confirmation',
      language: 'ar',
      body: ['سارة', 'الأحد'],
      header: null,
      buttons: [{ index: 0, kind: 'url', value: 'room-1' }],
    });
  });

  it('the old script\'s default: teacher_lesson_v2 with the producer\'s five values and two URL buttons', () => {
    expect(wabaTemplate({ to: TO, template: ALERT, params: ALERT_PARAMS })).toEqual({
      name: 'teacher_lesson_v2',
      language: 'ar',
      body: CRM.body,
      header: null,
      buttons: [{ index: 0, kind: 'url', value: 'c/l-1' }, { index: 1, kind: 'url', value: 'r/l-1' }],
    });
  });

  it('the default without the producer\'s values: meta_name and the row\'s own values', () => {
    const own = { '1': 'سارة', '2': 'الأحد', '3': 'تجريبية' };
    expect(wabaTemplate({ to: TO, template: ALERT, params: own })).toMatchObject({
      name: 'teacher_new_student',
      body: ['سارة', 'الأحد', 'تجريبية'],
      buttons: [],
    });
  });

  it('an admin\'s WABA name and language win; its own name keeps the row\'s values', () => {
    const named = templateRow({ crm_name: 'booking_v3', crm_language: 'ar_EG' });
    const crm = { body: ['x'], buttons: ['y'] };
    expect(wabaTemplate({ to: TO, template: named, params: { ...BOOKING, crm } })).toMatchObject({
      name: 'booking_v3',
      language: 'ar_EG',
      body: ['x'],
      buttons: [{ index: 0, kind: 'url', value: 'y' }],
    });
    const same = templateRow({ crm_name: 'booking_confirmation' });
    expect(wabaTemplate({ to: TO, template: same, params: { ...BOOKING, crm } }).body).toEqual(['سارة', 'الأحد']);
  });

  it('a document header: the signed link and the file name; missing values are refused (132000)', () => {
    const doc = { bucket: 'reports', path: 'r/1.pdf', filename: 'r.pdf' };
    const send = { to: TO, template: REPORT_READY, params: { '1': 'س', '2': 'ح', document: doc }, documentUrl: 'https://s/r.pdf' };
    expect(wabaTemplate(send).header).toEqual({ link: 'https://s/r.pdf', filename: 'r.pdf' });
    expect(() => wabaTemplate({ ...send, documentUrl: null })).toThrow(WaError);
    expect(() => wabaTemplate({ to: TO, template: templateRow(), params: { '1': 'س' } })).toThrow(WaError);
  });

  it('wabaName = the name the template goes as', () => {
    expect(wabaName({ to: TO, template: ALERT, params: ALERT_PARAMS })).toBe('teacher_lesson_v2');
    expect(wabaName({ to: TO, template: templateRow(), params: BOOKING })).toBe('booking_confirmation');
  });
});

describe('sentAs', () => {
  it('tags a WaError with the template name, leaves anything else', () => {
    const e = sentAs(new WaError('x', { code: 132001, status: 404 }), 'teacher_lesson_v2');
    expect((e as WaError).info).toEqual({ code: 132001, status: 404, template: 'teacher_lesson_v2' });
    const plain = new Error('boom');
    expect(sentAs(plain, 'n')).toBe(plain);
  });
});
