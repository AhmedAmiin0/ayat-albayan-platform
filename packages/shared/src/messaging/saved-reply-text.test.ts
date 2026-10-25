import { describe, expect, it } from 'vitest';
import { placeholdersIn, placeholderToken, resolveSavedReply, SAVED_REPLY_PLACEHOLDERS } from './saved-reply-text.js';

const ALL = { name: 'أم أحمد', student: 'أحمد', assistant: 'سارة' };

describe('resolveSavedReply: filled placeholders', () => {
  it('fills {name}, {student} and {assistant}, every time each appears', () => {
    const body = 'السلام عليكم {name}، معك {assistant}. حلقة {student} غدًا، و{student} مستعد.';
    expect(resolveSavedReply(body, ALL)).toBe('السلام عليكم أم أحمد، معك سارة. حلقة أحمد غدًا، وأحمد مستعد.');
  });

  it('trims values and keeps newlines and other braces as written', () => {
    expect(resolveSavedReply('أهلًا {name}\n\nالسعر {price}', { name: '  هدى ' })).toBe('أهلًا هدى\n\nالسعر {price}');
  });

  it('inserts a value literally (no $ patterns, no nested placeholders)', () => {
    expect(resolveSavedReply('{name}', { name: '$& {student}' })).toBe('$& {student}');
  });

  it('leaves a text without placeholders exactly as it is', () => {
    expect(resolveSavedReply('  نص  ثابت  ', ALL)).toBe('  نص  ثابت  ');
  });
});

describe('resolveSavedReply: a placeholder with no value is removed cleanly', () => {
  const none = {};
  it.each([
    ['أهلًا {name}، كيف حالك؟', 'أهلًا، كيف حالك؟'],
    ['أهلًا {name}!', 'أهلًا!'],
    ['مرحبًا يا {name}', 'مرحبًا'],
    ['يا {name}، السعر مرفق', 'السعر مرفق'],
    ['{name}، السلام عليكم', 'السلام عليكم'],
    ['السلام عليكم {name}', 'السلام عليكم'],
    ['حلقة الطالب ({student}) غدًا', 'حلقة الطالب غدًا'],
    ['حلقة «{student}» غدًا', 'حلقة غدًا'],
    ['شكرًا {name} {student} على التواصل', 'شكرًا على التواصل'],
    ['معك {assistant} من الأكاديمية', 'معك من الأكاديمية'],
    ['سطر أول {name}\n{name}، سطر ثانٍ', 'سطر أول\nسطر ثانٍ'],
  ])('%s → %s', (body, out) => {
    expect(resolveSavedReply(body, none)).toBe(out);
  });

  it('treats a blank value as missing', () => {
    expect(resolveSavedReply('أهلًا {name}، تفضل', { name: '   ', student: null })).toBe('أهلًا، تفضل');
  });

  it('never leaves two spaces where a placeholder was', () => {
    const out = resolveSavedReply('أ {name} ب {student} ج {assistant} د', { student: 'خالد' });
    expect(out).toBe('أ ب خالد ج د');
    expect(out).not.toMatch(/ {2}/);
  });
});

describe('placeholdersIn / placeholderToken', () => {
  it('lists the placeholders a reply uses, in catalog order', () => {
    expect(placeholdersIn('معك {assistant} يا {name}')).toEqual(['name', 'assistant']);
    expect(placeholdersIn('بلا متغيرات')).toEqual([]);
  });

  it('writes each placeholder in braces', () => {
    expect(SAVED_REPLY_PLACEHOLDERS.map(placeholderToken)).toEqual(['{name}', '{student}', '{assistant}']);
  });
});
