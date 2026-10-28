import ar from '@ab/shared/i18n/ar.json' with { type: 'json' };
import { describe, expect, it } from 'vitest';
import { templateButtonHint, templateButtonLabel } from './template-button.js';

const words = ar.inbox.templateBubble;

describe('template button words', () => {
  it('Meta’s label, else the kind’s own', () => {
    expect(templateButtonLabel({ type: 'url', text: 'ادخل الحلقة' }, words)).toBe('ادخل الحلقة');
    expect(templateButtonLabel({ type: 'copy_code', text: '  ' }, words)).toBe('نسخ الرمز');
  });

  it('a link opens, a call names its number, the rest is display-only', () => {
    expect(templateButtonHint({ type: 'url', text: 'ادخل', url: 'https://meet.google.com/a' }, words)).toBe('ادخل: يفتح الرابط');
    expect(templateButtonHint({ type: 'url', text: 'قيّم' }, words)).toBe('قيّم: زرّ للعرض فقط، تضغطه العائلة في واتساب');
    expect(templateButtonHint({ type: 'phone_number', text: 'اتصل', phone: '+966500000000' }, words)).toBe('اتصل: \u2066+966500000000\u2069');
    expect(templateButtonHint({ type: 'phone_number', text: 'اتصل' }, words)).toContain('للعرض فقط');
    expect(templateButtonHint({ type: 'quick_reply', text: 'تأكيد' }, words)).toBe('تأكيد: زرّ للعرض فقط، تضغطه العائلة في واتساب');
  });

  it('the phone number keeps its own direction inside Arabic (an LTR isolate)', () => {
    const hint = templateButtonHint({ type: 'phone_number', text: 'اتصل', phone: '+966500000000' }, words);
    expect(hint.indexOf('\u2066')).toBeLessThan(hint.indexOf('+'));
  });
});
