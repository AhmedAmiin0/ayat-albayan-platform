import { describe, expect, it } from 'vitest';
import { templateBlock, templateButtonLink, type TemplateBlockSource } from './template-block.js';

const src = (over: Partial<TemplateBlockSource> = {}): TemplateBlockSource => ({
  key: 'lesson_reminder_meet',
  header_format: null,
  footer_ar: null,
  buttons: [],
  ...over,
});

describe('templateBlock: before any sync describes it (the registry columns)', () => {
  it('a URL button gets its {{1}} filled from the params; the quick replies keep their labels', () => {
    const block = templateBlock(
      src({
        buttons: [
          { type: 'url', url: 'https://meet.google.com/{{1}}', text: 'ادخل الحلقة' },
          { type: 'quick_reply', text: 'تأكيد', intent: 'confirm' },
        ],
      }),
      { button: 'abc-defg-hij' },
    );
    expect(block.buttons).toEqual([
      { type: 'url', text: 'ادخل الحلقة', url: 'https://meet.google.com/abc-defg-hij' },
      { type: 'quick_reply', text: 'تأكيد' },
    ]);
  });

  it('a URL button without its value, or Meta label, keeps no link and an empty label', () => {
    const block = templateBlock(src({ buttons: [{ type: 'url', url: 'https://x.test/{{1}}' }] }), {});
    expect(block.buttons).toEqual([{ type: 'url', text: '' }]);
  });

  it('a guardian token (feedback form, classroom link) is never put in the link', () => {
    for (const key of ['lesson_feedback_request', 'lesson_join_link']) {
      const block = templateBlock(src({ key, buttons: [{ type: 'url', url: 'https://x.test/f/{{1}}', text: 'قيّم' }] }), { button: 'secret' });
      expect(block.buttons).toEqual([{ type: 'url', text: 'قيّم' }]);
    }
  });

  it('a fixed link stays as it is', () => {
    const block = templateBlock(src({ key: 'lesson_join_link', buttons: [{ type: 'url', url: 'https://x.test/', text: 'الموقع' }] }), {});
    expect(block.buttons[0]?.url).toBe('https://x.test/');
  });

  it('a document header (report_ready) and the footer come from their columns', () => {
    const block = templateBlock(src({ header_format: 'document', footer_ar: 'أكاديمية آيات البيان' }), {});
    expect(block).toEqual({ header: { type: 'document' }, footer: 'أكاديمية آيات البيان', buttons: [] });
  });

  it('no header, footer or buttons: an empty block', () => {
    expect(templateBlock(src(), {})).toEqual({ header: null, footer: null, buttons: [] });
  });
});

describe('templateBlock: after a sync (message_templates.display)', () => {
  it('Meta’s header and every button win, call and copy-code ones too', () => {
    const block = templateBlock(
      src({
        buttons: [],
        display: {
          header: { type: 'text', text: 'تذكير' },
          buttons: [
            { type: 'phone_number', text: 'اتصل بنا', phone: '+966500000000' },
            { type: 'copy_code', text: 'نسخ الرمز' },
            { type: 'url', text: 'ادخل', url: 'https://meet.google.com/{{1}}' },
          ],
        },
      }),
      { button: 'abc' },
    );
    expect(block.header).toEqual({ type: 'text', text: 'تذكير' });
    expect(block.buttons).toEqual([
      { type: 'phone_number', text: 'اتصل بنا', phone: '+966500000000' },
      { type: 'copy_code', text: 'نسخ الرمز' },
      { type: 'url', text: 'ادخل', url: 'https://meet.google.com/abc' },
    ]);
  });

  it('a synced template without a header has none, even with an old header_format', () => {
    expect(templateBlock(src({ header_format: 'document', display: { header: null, buttons: [] } }), {}).header).toBeNull();
  });

  it('the value is encoded: it can never leave the link’s path', () => {
    const block = templateBlock(src({ display: { header: null, buttons: [{ type: 'url', text: 'x', url: 'https://x.test/{{1}}' }] } }), {
      button: 'a b?c',
    });
    expect(block.buttons[0]?.url).toBe('https://x.test/a%20b%3Fc');
  });
});

describe('templateButtonLink', () => {
  it('only a URL button with an http(s) link opens', () => {
    expect(templateButtonLink({ type: 'url', text: 'x', url: 'https://meet.google.com/abc' })).toBe('https://meet.google.com/abc');
    expect(templateButtonLink({ type: 'url', text: 'x', url: 'javascript:alert(1)' })).toBeNull();
    expect(templateButtonLink({ type: 'url', text: 'x' })).toBeNull();
    expect(templateButtonLink({ type: 'phone_number', text: 'x', phone: '+966500000000' })).toBeNull();
    expect(templateButtonLink({ type: 'quick_reply', text: 'x' })).toBeNull();
  });
});
