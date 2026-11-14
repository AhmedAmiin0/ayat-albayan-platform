import { describe, expect, it } from 'vitest';
import { normaliseTemplateParam } from '@ab/shared';
import { toTemplateView } from '@/modules/messaging/whatsapp/templates/catalog/template.mapper';
import { templateRow } from '@/modules/messaging/whatsapp/whatsapp.fakes';
import { assertSendableParams } from './template-params';

// Owner 2026-11-14 («a template that carries your text»): the API checks Meta's parameter rules
// (132018) again, whatever the client did. Pure: no WhatsApp, no database.

const ACADEMY = toTemplateView(
  templateRow({
    key: 'academy_message',
    meta_name: 'academy_message',
    line: 'chat',
    body_ar: 'السلام عليكم\nرسالة من الأكاديمية:\n\n{{1}}\n\nيسعدنا ردّكم.',
    params: ['var_1'],
    buttons: [],
    status: 'approved',
  }),
);

const refusal = (params: Record<string, string>): [number, string] | null => {
  try {
    assertSendableParams(ACADEMY, params);
    return null;
  } catch (e) {
    const x = e as { getStatus(): number; getResponse(): { code: string } };
    return [x.getStatus(), x.getResponse().code];
  }
};

describe('assertSendableParams (H4 + Meta 132018)', () => {
  it('400 missing_params when {{1}} is empty', () => {
    expect(refusal({})).toEqual([400, 'missing_params']);
  });

  it.each(['سطر\nسطر', 'أ\tب', 'أ     ب'])('400 param_not_normalised for %j', (text) => {
    expect(refusal({ '1': text })).toEqual([400, 'param_not_normalised']);
  });

  it('400 body_too_long when the filled body passes 1024 characters', () => {
    expect(refusal({ '1': 'ب'.repeat(1000) })).toEqual([400, 'body_too_long']);
  });

  it('takes the normalised text that fits', () => {
    expect(refusal({ '1': normaliseTemplateParam('السلام عليكم\nنذكّركم بموعد الحلقة') })).toBeNull();
  });
});
