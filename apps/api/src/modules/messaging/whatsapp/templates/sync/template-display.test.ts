import { describe, expect, it } from 'vitest';
import { metaDisplay } from './template-display';
import { components } from './template-sync';

const display = (raw: unknown[]) => metaDisplay(components(raw));

describe('metaDisplay: what WhatsApp shows of a template (owner 2026-10-28)', () => {
  it('every button kind with its label, link and phone; an OTP button shows as copy code', () => {
    const buttons = [
      { type: 'QUICK_REPLY', text: 'تأكيد' },
      { type: 'URL', text: 'ادخل الحلقة', url: 'https://meet.google.com/{{1}}' },
      { type: 'PHONE_NUMBER', text: 'اتصل بنا', phone_number: '+966500000000' },
      { type: 'COPY_CODE', text: 'نسخ الرمز', example: 'X' },
      { type: 'OTP', otp_type: 'COPY_CODE', text: 'Copy code' },
    ];
    expect(display([{ type: 'BUTTONS', buttons }])).toEqual({
      header: null,
      buttons: [
        { type: 'quick_reply', text: 'تأكيد' },
        { type: 'url', text: 'ادخل الحلقة', url: 'https://meet.google.com/{{1}}' },
        { type: 'phone_number', text: 'اتصل بنا', phone: '+966500000000' },
        { type: 'copy_code', text: 'نسخ الرمز' },
        { type: 'copy_code', text: 'Copy code' },
      ],
    });
  });

  it('a flow or catalog button is left out; a button without a label keeps an empty one', () => {
    const buttons = [{ type: 'FLOW', text: 'ابدأ' }, { type: 'catalog', text: 'x' }, { type: 'url', url: 'https://x.test/' }];
    expect(display([{ type: 'BUTTONS', buttons }])).toEqual({ header: null, buttons: [{ type: 'url', text: '', url: 'https://x.test/' }] });
  });

  it.each([
    [{ type: 'HEADER', format: 'TEXT', text: 'تذكير بالحلقة' }, { type: 'text', text: 'تذكير بالحلقة' }],
    [{ type: 'HEADER', format: 'IMAGE', example: {} }, { type: 'image' }],
    [{ type: 'HEADER', format: 'document' }, { type: 'document' }],
    [{ type: 'HEADER', format: 'VIDEO' }, { type: 'video' }],
    [{ type: 'HEADER', format: 'LOCATION' }, { type: 'location' }],
    [{ type: 'HEADER', format: 'GIF' }, null],
    [{ type: 'HEADER', format: 'TEXT' }, null],
  ])('header %j → %j', (part, header) => {
    expect(display([part, { type: 'BODY', text: 'x' }])).toEqual({ header, buttons: [] });
  });

  it('no header and no buttons: an empty display', () => {
    expect(display([{ type: 'BODY', text: 'x' }, { type: 'FOOTER', text: 'y' }])).toEqual({ header: null, buttons: [] });
  });
});
