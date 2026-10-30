import { describe, expect, it } from 'vitest';
import ar from '../../../i18n/ar.json' with { type: 'json' };
import en from '../../../i18n/en.json' with { type: 'json' };
import { TEMPLATE_BUTTON_KINDS, TEMPLATE_HEADER_KINDS } from './template-block.js';

describe('template bubble strings (rule 10)', () => {
  it.each([
    ['ar', ar],
    ['en', en],
  ] as const)('%s: a label for every button kind and every media header, nothing extra', (_lang, dict) => {
    const s = dict.inbox.templateBubble;
    expect(Object.keys(s.button).sort()).toEqual([...TEMPLATE_BUTTON_KINDS].sort());
    expect(Object.keys(s.header).sort()).toEqual(TEMPLATE_HEADER_KINDS.filter((k) => k !== 'text').sort());
    expect(s.displayOnly).toContain('{label}');
    expect(s.opensLink).toContain('{label}');
    expect(s.callNumber).toContain('{phone}');
  });

  it('the Arabic labels keep their exact wording', () => {
    expect(ar.inbox.templateBubble.button).toEqual({ quick_reply: 'ردّ سريع', url: 'فتح الرابط', phone_number: 'اتصال', copy_code: 'نسخ الرمز' });
    expect(ar.inbox.templateBubble.tapped).toBe('ضغطة زرّ');
  });
});
