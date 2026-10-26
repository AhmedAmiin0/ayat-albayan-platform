import { describe, expect, it } from 'vitest';
import { crmMediaBody, crmTemplateBody, crmTextBody } from './crm-body';
import { REMINDER_24H, REPORT_READY, templateRow } from '../../whatsapp.fakes';
import { WaError } from '../../whatsapp.types';

// docs/19 «crm driver»: the CRM's POST /messages bodies, built from the same TemplateSend the meta driver gets.

const TO = '+966500000001';
const DOC = { bucket: 'reports', path: 'r/1.pdf', filename: 'report.pdf' };

describe('crmTemplateBody', () => {
  it('body only: the Meta name and language, the body values in order (a quick-reply payload by index)', () => {
    const body = crmTemplateBody({ to: TO, template: REMINDER_24H, params: { '1': 'سارة', '2': '5 م' }, payloads: ['confirm:l1', ''] });
    expect(body).toEqual({
      to: TO,
      type: 'template',
      template: { name: 'lesson_reminder_24h', language: 'ar', params: { body: ['سارة', '5 م'], buttonParams: { '0': 'confirm:l1' } } },
    });
  });

  it('a document header: headerMediaUrl = the signed Storage URL', () => {
    const body = crmTemplateBody({ to: TO, template: REPORT_READY, params: { '1': 'سارة', '2': 'الأحد', document: DOC }, documentUrl: 'https://s.local/signed.pdf' });
    expect(body).toMatchObject({ template: { params: { body: ['سارة', 'الأحد'], headerMediaUrl: 'https://s.local/signed.pdf' } } });
  });

  it('a URL button: its {{1}} suffix as buttonParams by the button index', () => {
    const body = crmTemplateBody({ to: TO, template: templateRow(), params: { '1': 'سارة', '2': 'الأحد', button: 'room-1' } });
    expect(body).toMatchObject({ template: { name: 'booking_confirmation', params: { body: ['سارة', 'الأحد'], buttonParams: { '0': 'room-1' } } } });
  });

  it('a static template sends params {}; the meta driver\'s checks refuse the same bad sends (132000)', () => {
    const fixed = templateRow({ body_ar: 'أهلًا', buttons: [{ type: 'url', url: 'https://example.test' }] });
    expect(crmTemplateBody({ to: TO, template: fixed, params: {} })).toMatchObject({ template: { params: {} } });
    const err = (() => {
      try {
        crmTemplateBody({ to: TO, template: REPORT_READY, params: { '1': 'سارة', '2': 'الأحد' } });
      } catch (e) {
        return e;
      }
    })();
    expect(err).toBeInstanceOf(WaError);
    expect((err as WaError).info.code).toBe(132000);
    expect(() => crmTemplateBody({ to: TO, template: templateRow(), params: { '1': 'x', '2': 'y' } })).toThrow(WaError);
  });
});

describe('crm text and media bodies', () => {
  it('text: no reply-to (the CRM wants its own uuid)', () => {
    expect(crmTextBody({ to: TO, text: 'السلام عليكم' })).toEqual({ to: TO, type: 'text', text: 'السلام عليكم' });
  });

  it('a document with filename and caption; an image never gets a filename', () => {
    expect(crmMediaBody({ to: TO, url: 'https://s.local/a.pdf', filename: 'a.pdf', caption: 'الواجب' })).toEqual({
      to: TO, type: 'document', media_url: 'https://s.local/a.pdf', filename: 'a.pdf', text: 'الواجب',
    });
    expect(crmMediaBody({ to: TO, kind: 'image', url: 'https://s.local/a.jpg', filename: 'a.jpg' })).toEqual({ to: TO, type: 'image', media_url: 'https://s.local/a.jpg' });
  });
});
