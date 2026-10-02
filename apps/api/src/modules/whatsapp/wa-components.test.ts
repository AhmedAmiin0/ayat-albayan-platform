import { describe, expect, it } from 'vitest';
import {
  bodyVarCount,
  documentMessage,
  readReceipt,
  submitPayload,
  templateMessage,
  textMessage,
} from './wa-components';
import { REMINDER_24H, REPORT_READY, templateRow } from './whatsapp.fakes';
import { WaError } from './whatsapp.types';

const TO = '+966551234567';
const params = { '1': 'سلمى ومريم', '2': 'الأحد 4 أكتوبر 17:00', button: 'ab-sara-x1' };

describe('Graph message bodies (docs/12 §3.2)', () => {
  it('a URL-button template: Meta name and language, body params in order, button suffix at its index', () => {
    const body = templateMessage({ to: TO, template: templateRow(), params });
    expect(body).toEqual({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: '966551234567',
      type: 'template',
      template: {
        name: 'booking_confirmation',
        language: { code: 'ar' },
        components: [
          { type: 'body', parameters: [{ type: 'text', text: 'سلمى ومريم' }, { type: 'text', text: 'الأحد 4 أكتوبر 17:00' }] },
          { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: 'ab-sara-x1' }] },
        ],
      },
    });
  });

  it('uses the Meta name, not our key (lesson_reminder → lesson_reminder_v2)', () => {
    const t = templateRow({ key: 'lesson_reminder', meta_name: 'lesson_reminder_v2' });
    const body = templateMessage({ to: TO, template: t, params }) as { template: { name: string } };
    expect(body.template.name).toBe('lesson_reminder_v2');
  });

  it('quick replies carry the payloads by button index', () => {
    const payloads = ['confirm:l1', 'reschedule:l1'];
    const body = templateMessage({ to: TO, template: REMINDER_24H, params, payloads }) as { template: { components: unknown[] } };
    expect(body.template.components.slice(1)).toEqual([
      { type: 'button', sub_type: 'quick_reply', index: '0', parameters: [{ type: 'payload', payload: 'confirm:l1' }] },
      { type: 'button', sub_type: 'quick_reply', index: '1', parameters: [{ type: 'payload', payload: 'reschedule:l1' }] },
    ]);
  });

  it('a document template puts the signed PDF in the header with its file name', () => {
    const document = { bucket: 'reports', path: 's1/l1.pdf', filename: 'AB-0183_2026-09-29.pdf' };
    const body = templateMessage({
      to: TO,
      template: REPORT_READY,
      params: { '1': 'سلمى', '2': 'الثلاثاء 29 سبتمبر 17:00', document },
      documentUrl: 'https://storage.local/signed/l1.pdf',
    }) as { template: { components: unknown[] } };
    expect(body.template.components[0]).toEqual({
      type: 'header',
      parameters: [{ type: 'document', document: { link: 'https://storage.local/signed/l1.pdf', filename: 'AB-0183_2026-09-29.pdf' } }],
    });
  });

  it.each([
    { name: 'an empty {{2}}', template: templateRow(), p: { '1': 'سلمى' } },
    { name: 'a link button without its value', template: templateRow(), p: { '1': 'سلمى', '2': 'x' } },
    { name: 'a document template without its PDF', template: REPORT_READY, p: { '1': 'سلمى', '2': 'x' } },
  ])('refuses $name as 132000 before calling Meta', ({ template, p }) => {
    const send = () => templateMessage({ to: TO, template, params: p, documentUrl: null });
    expect(send).toThrow(WaError);
    expect(() => send()).toThrow(expect.objectContaining({ info: expect.objectContaining({ code: 132000 }) }));
  });

  it('counts {{n}} in the body (Meta text after the sync), 0 without variables', () => {
    expect(bodyVarCount('حلقة {{1}} النهاردة — {{2}}')).toBe(2);
    expect(bodyVarCount('متاح {{1}} و {{2}} بتوقيت {{3}} {{1}}')).toBe(3);
    expect(bodyVarCount('بدون متغيرات')).toBe(0);
  });

  it('session text replies in context; document by link; read receipt', () => {
    expect(textMessage({ to: TO, text: 'وعليكم السلام', replyTo: 'wamid.in1' })).toMatchObject({
      to: '966551234567',
      type: 'text',
      text: { body: 'وعليكم السلام', preview_url: true },
      context: { message_id: 'wamid.in1' },
    });
    expect(textMessage({ to: TO, text: 'x' })).not.toHaveProperty('context');
    expect(documentMessage({ to: TO, url: 'https://s/x.pdf', filename: 'x.pdf', caption: 'التقرير' })).toMatchObject({
      type: 'document',
      document: { link: 'https://s/x.pdf', filename: 'x.pdf', caption: 'التقرير' },
    });
    expect(readReceipt('wamid.in1')).toEqual({ messaging_product: 'whatsapp', status: 'read', message_id: 'wamid.in1' });
  });
});

describe('submitPayload — a registry row as Meta creates it (docs/12 §3.4)', () => {
  it('BODY with the param names as examples, FOOTER, quick-reply BUTTONS, upper-case category', () => {
    expect(submitPayload(REMINDER_24H)).toEqual({
      name: 'lesson_reminder_24h',
      language: 'ar',
      category: 'UTILITY',
      components: [
        { type: 'BODY', text: REMINDER_24H.body_ar, example: { body_text: [['student_names', 'lesson_time']] } },
        { type: 'FOOTER', text: 'أكاديمية آيات البيان' },
        { type: 'BUTTONS', buttons: [{ type: 'QUICK_REPLY', text: 'تمام، هنحضر' }, { type: 'QUICK_REPLY', text: 'محتاجين نغيّر الميعاد' }] },
      ],
    });
  });

  it('a dynamic URL button gets a sample link; no footer, no examples when there is nothing to fill', () => {
    const row = templateRow({ footer_ar: null, params: [], body_ar: 'نص ثابت', buttons: [{ type: 'url', url: 'https://meet.google.com/{{1}}', text: 'ادخل' }] });
    expect(submitPayload(row)['components']).toEqual([
      { type: 'BODY', text: 'نص ثابت' },
      { type: 'BUTTONS', buttons: [{ type: 'URL', text: 'ادخل', url: 'https://meet.google.com/{{1}}', example: ['https://meet.google.com/sample'] }] },
    ]);
  });
});
