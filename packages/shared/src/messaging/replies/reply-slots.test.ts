import { describe, expect, it } from 'vitest';
import { fillReply, replyNeedsInput, replySlots } from './reply-slots.js';

const keys = (body: string) => replySlots(body).map((s) => s.key);

describe('replySlots', () => {
  it('lists blanks and auto placeholders in order of first appearance, each once', () => {
    const body =
      'أهلًا {name}، المبلغ [المبلغ] يُدفع في [التاريخ] لـ{student}. المبلغ: [ المبلغ ] و{name}';
    expect(keys(body)).toEqual(['name', '[المبلغ]', '[التاريخ]', 'student']);
    expect(replySlots(body)[1]).toEqual({
      kind: 'blank',
      key: '[المبلغ]',
      label: 'المبلغ',
      n: null,
    });
  });

  it('numbers each empty «[ ]» as its own slot', () => {
    expect(replySlots('من [ ] إلى [] في [الوقت]')).toEqual([
      { kind: 'blank', key: '[]1', label: '', n: 1 },
      { kind: 'blank', key: '[]2', label: '', n: 2 },
      { kind: 'blank', key: '[الوقت]', label: 'الوقت', n: null },
    ]);
  });

  it('keeps Latin labels (IBAN, SWIFT) as written', () => {
    expect(keys('IBAN: [IBAN]\nSWIFT: [SWIFT]')).toEqual(['[IBAN]', '[SWIFT]']);
  });

  it('a link, a long bracket, a bracket over two lines or around braces is not a blank', () => {
    const long = `[${'ن'.repeat(41)}]`;
    expect(keys(`[الموقع](https://example.com) ${long} [سطر\nثان] [{price}] {x}`)).toEqual([]);
    expect(keys(`[${'ن'.repeat(40)}]`)).toHaveLength(1);
  });

  it('a text with no slot has none', () => {
    expect(replySlots('السلام عليكم، كيف نخدمك؟')).toEqual([]);
  });
});

describe('replyNeedsInput', () => {
  it('only a reply with a blank or an unknown auto placeholder needs the form', () => {
    expect(replyNeedsInput('أهلًا {name}', { name: 'هدى' })).toBe(false);
    expect(replyNeedsInput('أهلًا {name}', { name: '  ' })).toBe(true);
    expect(replyNeedsInput('المبلغ [المبلغ]', { name: 'هدى' })).toBe(true);
    expect(replyNeedsInput('نص ثابت', {})).toBe(false);
  });
});

describe('fillReply', () => {
  it('replaces every occurrence of a blank and removes its brackets', () => {
    const body = 'المبلغ [المبلغ] ريال. أكرر: [ المبلغ ].';
    expect(fillReply(body, { '[المبلغ]': ' 300 ' })).toBe('المبلغ 300 ريال. أكرر: 300.');
  });

  it('fills empty «[ ]» blanks by their number', () => {
    expect(fillReply('من [ ] إلى []', { '[]1': '4', '[]2': '5' })).toBe('من 4 إلى 5');
  });

  it('an empty blank value keeps the bracket as written', () => {
    expect(fillReply('في [التاريخ] الساعة [ ]', { '[التاريخ]': '  ' })).toBe(
      'في [التاريخ] الساعة [ ]',
    );
  });

  it('auto placeholders follow resolveSavedReply: filled, or removed cleanly when empty', () => {
    expect(fillReply('أهلًا {name}، المبلغ [المبلغ]', { name: 'هدى', '[المبلغ]': '300' })).toBe(
      'أهلًا هدى، المبلغ 300',
    );
    expect(fillReply('أهلًا {name}، المبلغ [المبلغ]', { '[المبلغ]': '300' })).toBe(
      'أهلًا، المبلغ 300',
    );
    expect(fillReply('مرحبًا يا {name}\n[الرابط]', { name: '' })).toBe('مرحبًا\n[الرابط]');
  });

  it('inserts values literally: no nested placeholders, no $ patterns', () => {
    const body = '{name} [الاسم] [الرقم]';
    expect(fillReply(body, { name: '[الرقم]', '[الاسم]': '{student} $&', '[الرقم]': '7' })).toBe(
      '[الرقم] {student} $& 7',
    );
  });

  it('leaves links and a text with no slot exactly as written', () => {
    expect(fillReply('  [الموقع](https://example.com)  ', {})).toBe(
      '  [الموقع](https://example.com)  ',
    );
  });

  it('an English value in an Arabic reply and the other way round', () => {
    expect(fillReply('IBAN: [IBAN]', { '[IBAN]': 'SA00 0000' })).toBe('IBAN: SA00 0000');
    expect(fillReply('Hello [الاسم]', { '[الاسم]': 'هدى' })).toBe('Hello هدى');
  });
});

describe('fillReply: the internal hold mark', () => {
  it('a hold mark in the text or a value is dropped, never read as a blank', () => {
    expect(fillReply('a\u00010\u0001 [x]', { '[x]': 'Y' })).toBe('a0 Y');
    expect(fillReply('{name} [x]', { name: '\u00010\u0001', '[x]': 'Y' })).toBe('0 Y');
  });
});
