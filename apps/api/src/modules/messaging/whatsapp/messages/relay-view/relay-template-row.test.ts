import { describe, expect, it } from 'vitest';
import { messageRow } from '@/modules/messaging/whatsapp/sender/sender.fakes';
import { templateRow } from '@/modules/messaging/whatsapp/whatsapp.fakes';
import { asRelayTemplateRow, relayBody, relayTemplateName } from './relay-template-row';

// Old relay rows keep only «[name]\nvalue…»: read as the template they stand for, or left raw.

const V2 = templateRow({ key: 'teacher_lesson_v2', meta_name: 'teacher_lesson_v2', body_ar: '{{1}} / {{2}} / {{3}} / {{4}}' });
const BODY = '[teacher_lesson_v2]\nسلمى\nهدى علي (AB-0001)\nالاثنين 2/11 — 4:00 م\n45 دقيقة';
const relay = (over: Parameters<typeof messageRow>[0] = {}) =>
  messageRow({ template_key: null, template_params: null, body: BODY, dedup_key: 'script-relay:abc', ...over });

describe('relayBody', () => {
  it('the bracketed name, then one value per line', () => {
    expect(relayBody('[x]\nأ\nب')).toEqual({ name: 'x', values: ['أ', 'ب'] });
    expect(relayBody('[x]')).toEqual({ name: 'x', values: [] });
  });

  it('anything else is null', () => {
    for (const body of [null, '', 'نص عادي', '[]\nأ', 'قبل [x]\nأ', '[x] بعد\nأ', '[[x]]\nأ']) {
      expect(relayBody(body)).toBeNull();
    }
  });
});

describe('relayTemplateName', () => {
  it("a relay row's stored key, else the name in its body", () => {
    expect(relayTemplateName(relay())).toBe('teacher_lesson_v2');
    expect(relayTemplateName(relay({ template_key: 'lesson_reminder_meet' }))).toBe('lesson_reminder_meet');
  });

  it('never for a row the relay did not write, or an inbound one', () => {
    expect(relayTemplateName(relay({ dedup_key: 'reminder:abc' }))).toBeNull();
    expect(relayTemplateName(relay({ dedup_key: null }))).toBeNull();
    expect(relayTemplateName(relay({ direction: 'inbound' }))).toBeNull();
  });
});

describe('asRelayTemplateRow', () => {
  it('an old row: the key, the values as «1»…«4», no body of its own', () => {
    expect(asRelayTemplateRow(relay(), V2)).toMatchObject({
      template_key: 'teacher_lesson_v2',
      template_params: { '1': 'سلمى', '2': 'هدى علي (AB-0001)', '3': 'الاثنين 2/11 — 4:00 م', '4': '45 دقيقة' },
      body: null,
    });
  });

  it('a newer row keeps its stored values (the button too)', () => {
    const stored = { '1': 'سلمى', '2': 'ب', '3': 'ج', '4': 'د', button: 'room-1' };
    const row = relay({ template_key: 'teacher_lesson_v2', template_params: stored });
    expect(asRelayTemplateRow(row, V2)).toMatchObject({ template_params: stored, body: null });
  });

  it('stays raw: no template, a count mismatch, another row kind', () => {
    const raw = relay({ body: '[teacher_lesson_v2]\nسلمى\nناقص' });
    expect(asRelayTemplateRow(raw, V2)).toBe(raw);
    expect(asRelayTemplateRow(relay(), null)).toEqual(relay());
    const other = relay({ dedup_key: 'reminder:abc' });
    expect(asRelayTemplateRow(other, V2)).toBe(other);
    const wrongKey = relay({ template_key: 'lesson_reminder_meet' });
    expect(asRelayTemplateRow(wrongKey, V2)).toBe(wrongKey);
  });
});
