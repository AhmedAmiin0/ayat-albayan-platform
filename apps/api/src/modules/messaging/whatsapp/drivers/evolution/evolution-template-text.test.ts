import { describe, expect, it } from 'vitest';
import { templateRow } from '@/modules/messaging/whatsapp/whatsapp.fakes';
import { templateAsText } from './evolution-template-text';

// docs/19 «Evolution driver»: on Baileys a template goes as plain text, buttons as text lines.

const TO = '+966500000001';

describe('templateAsText', () => {
  it('fills the body, keeps the footer, and writes each button as a line', () => {
    const template = templateRow({
      body_ar: 'حلقة {{1}} يوم {{2}}',
      footer_ar: null,
      buttons: [
        { type: 'quick_reply', text: 'تأكيد', intent: 'confirm' },
        { type: 'url', url: 'https://example.test/r/{{1}}', text: 'رابط الحلقة' },
      ],
    });
    const text = templateAsText({ to: TO, template, params: { '1': 'سارة', '2': 'الأحد', button: 'abc' } });
    expect(text).toBe('حلقة سارة يوم الأحد\n\n• تأكيد\nرابط الحلقة: https://example.test/r/abc');
  });

  it('a value that looks like a placeholder is never expanded again', () => {
    const template = templateRow({ body_ar: '{{1}} و {{2}}', footer_ar: null, buttons: [] });
    expect(templateAsText({ to: TO, template, params: { '1': '{{2}}', '2': 'ب' } })).toBe('{{2}} و ب');
  });

  it('a missing value refuses the send like Meta would (132000)', () => {
    const template = templateRow({ body_ar: 'مرحبا {{1}}', buttons: [] });
    expect(() => templateAsText({ to: TO, template, params: {} })).toThrow(/parameters/);
  });
});
