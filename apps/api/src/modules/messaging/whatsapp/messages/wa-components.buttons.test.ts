import { TEACHER_LESSON_V3 } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { crmTemplateBody } from '@/modules/messaging/whatsapp/drivers/crm/crm-body';
import { templateRow } from '@/modules/messaging/whatsapp/whatsapp.fakes';
import { buttonValues, submitPayload } from './wa-components';

// teacher_lesson_v3 (owner 2026-11-06): two URL buttons, each with its own {{1}} suffix.

const V3 = templateRow({
  key: 'teacher_lesson_v3',
  meta_name: 'teacher_lesson_v3',
  body_ar: TEACHER_LESSON_V3.body,
  params: TEACHER_LESSON_V3.params.map((p) => p.name),
  buttons: TEACHER_LESSON_V3.buttons,
});
const params = {
  '1': 'أ',
  '2': 'ب',
  '3': 'AB-0101',
  '4': 'ج',
  '5': '30 دقيقة',
  '6': 'https://meet.google.com/x',
  buttons: ['join-tok', 'rep-tok'],
};

describe('two link buttons', () => {
  it('each URL button takes its own suffix, by URL order', () => {
    expect(buttonValues({ to: '+201001234567', template: V3, params })).toEqual([
      { index: 0, kind: 'url', value: 'join-tok' },
      { index: 1, kind: 'url', value: 'rep-tok' },
    ]);
  });

  it('the crm driver sends both suffixes by index', () => {
    const body = crmTemplateBody({ to: '+201001234567', template: V3, params });
    expect(body).toMatchObject({
      template: {
        name: 'teacher_lesson_v3',
        params: { buttonParams: { '0': 'join-tok', '1': 'rep-tok' } },
      },
    });
  });

  it('one params.button still fills a single link button (older templates)', () => {
    const one = templateRow({ buttons: [{ type: 'url', url: 'https://meet.google.com/{{1}}' }] });
    expect(buttonValues({ to: '+201001234567', template: one, params: { button: 'abc' } })).toEqual(
      [{ index: 0, kind: 'url', value: 'abc' }],
    );
  });

  it('the submit carries each button’s own sample suffix', () => {
    const payload = submitPayload(V3);
    const buttons = (
      payload.components as { type: string; buttons?: { example?: string[] }[] }[]
    ).find((c) => c.type === 'BUTTONS');
    expect(buttons?.buttons?.map((b) => b.example?.[0])).toEqual([
      expect.stringMatching(/^https:\/\/api\.ayatalbayan\.com\/join\/A+\.B+$/),
      expect.stringMatching(/^https:\/\/app\.ayatalbayan\.com\/teacher-report\/A+\.B+$/),
    ]);
  });
});
