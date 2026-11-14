import { describe, expect, it } from 'vitest';
import { ApiError } from '../../core/http/index.js';
import { templateErrorWords } from './template-errors.js';

const words = templateErrorWords(
  () => ({ author_daily_limit: 'حتى {max} قوالب في اليوم', code_bound_buttons: 'أبقِ الأزرار' }),
  () => 'تعذّر الحفظ',
);

describe('templateErrorWords', () => {
  it('the app\'s words for the code, with {max} filled', () => {
    expect(words(new ApiError(429, { code: 'author_daily_limit', max: 5 }))).toBe('حتى 5 قوالب في اليوم');
    expect(words(new ApiError(409, { code: 'code_bound_buttons' }))).toBe('أبقِ الأزرار');
  });

  it('else the API\'s MSA reason, else the generic line', () => {
    expect(words(new ApiError(409, { code: 'new_code', message_ar: 'سبب واضح' }))).toBe('سبب واضح');
    expect(words(new ApiError(500, 'boom'))).toBe('تعذّر الحفظ');
    expect(words(new Error('net'))).toBe('تعذّر الحفظ');
  });
});
