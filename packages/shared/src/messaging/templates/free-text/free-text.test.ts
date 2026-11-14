import { describe, expect, it } from 'vitest';
import { TEMPLATE_LIMITS } from '../template-create.js';
import {
  capText,
  freeTextRoom,
  freeTextSlot,
  isMetaSafeParam,
  normaliseTemplateParam,
  normaliseTemplateParams,
  sendableFreeText,
  templateParamProblem,
} from './free-text.js';

const BODY = 'السلام عليكم\nرسالة من الأكاديمية:\n\n{{1}}\n\nيسعدنا ردّكم.';

describe('normaliseTemplateParam (Meta 132018)', () => {
  it('turns each run of line breaks into one « · »', () => {
    expect(normaliseTemplateParam('سطر أول\nسطر ثانٍ')).toBe('سطر أول · سطر ثانٍ');
    expect(normaliseTemplateParam('أ\r\n\r\n  \nب')).toBe('أ · ب');
  });

  it('trims, and drops line breaks at either end', () => {
    expect(normaliseTemplateParam('\n  نص  \n')).toBe('نص');
  });

  it('turns tabs into spaces and runs of spaces into one', () => {
    expect(normaliseTemplateParam('أ\tب')).toBe('أ ب');
    expect(normaliseTemplateParam('أ      ب\t\t ج')).toBe('أ ب ج');
  });

  it('gives a value Meta takes', () => {
    const out = normaliseTemplateParam('a\n\tb     c d');
    expect(isMetaSafeParam(out)).toBe(true);
    expect(out).toBe('a · b c · d');
  });

  it('normalises every body slot and leaves the button alone', () => {
    const out = normaliseTemplateParams({ '1': 'أ\nب', '2': 'ج  د', button: 'x  y' });
    expect(out).toEqual({ '1': 'أ · ب', '2': 'ج د', button: 'x  y' });
  });
});

describe('isMetaSafeParam', () => {
  it.each(['a\nb', 'a\tb', 'a\rb', 'a     b'])('refuses %j', (v) => {
    expect(isMetaSafeParam(v)).toBe(false);
  });

  it('takes up to 4 spaces in a row', () => {
    expect(isMetaSafeParam('a    b')).toBe(true);
  });
});

describe('the length cap (TEMPLATE_LIMITS.body)', () => {
  const rest = BODY.replace('{{1}}', '').length;

  it('leaves the rest of the body room', () => {
    expect(freeTextRoom(BODY, '1')).toBe(TEMPLATE_LIMITS.body - rest);
  });

  it('cuts the sent text so the whole body fits', () => {
    const sent = sendableFreeText(BODY, '1', 'ب'.repeat(2000));
    expect(sent).toHaveLength(TEMPLATE_LIMITS.body - rest);
    expect(templateParamProblem(BODY, { '1': sent })).toBeNull();
  });

  it('never cuts through an emoji', () => {
    expect(capText('أ🌿', 2)).toBe('أ');
    expect(capText('أ🌿', 3)).toBe('أ🌿');
  });
});

describe('templateParamProblem (the API check)', () => {
  it('refuses a line break or a run of spaces', () => {
    expect(templateParamProblem(BODY, { '1': 'أ\nب' })).toBe('param_not_normalised');
    expect(templateParamProblem(BODY, { '1': 'أ     ب' })).toBe('param_not_normalised');
  });

  it('refuses a body over the limit', () => {
    expect(templateParamProblem(BODY, { '1': 'ب'.repeat(1024) })).toBe('body_too_long');
  });

  it('takes a normalised text that fits', () => {
    expect(templateParamProblem(BODY, { '1': 'أ · ب' })).toBeNull();
  });
});

describe('freeTextSlot', () => {
  it('knows academy_message carries the text in {{1}}', () => {
    expect(freeTextSlot('academy_message')).toBe('1');
    expect(freeTextSlot('welcome_greeting')).toBeNull();
  });
});
