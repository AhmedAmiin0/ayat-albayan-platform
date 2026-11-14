import { describe, expect, it } from 'vitest';
import { bodyVarCount, draftParams, previewParams, retexted } from './template-draft.js';

describe('the template form', () => {
  it('counts the body\'s variables', () => {
    expect(bodyVarCount('بلا متغيرات')).toBe(0);
    expect(bodyVarCount('أهلًا {{1}} موعدك {{2}} اليوم')).toBe(2);
    expect(bodyVarCount('{{12}}')).toBe(9);
  });

  it('one param per variable: its known name or var_n, and its sample', () => {
    expect(draftParams('أ {{1}} ب {{2}} ج', ['سارة'], ['student'])).toEqual([
      { name: 'student', sample: 'سارة' },
      { name: 'var_2', sample: '' },
    ]);
  });

  it('the preview fills only typed samples', () => {
    expect(previewParams(['سارة', ' '])).toEqual({ 1: 'سارة' });
  });

  it('keeps each button\'s link and intent, new text', () => {
    const url = { type: 'url' as const, text: 'ادخل', url: 'https://meet.jit.si/{{1}}' };
    expect(retexted([url], ['افتح'])).toEqual([{ ...url, text: 'افتح' }]);
    expect(retexted([url], [])).toEqual([url]);
  });
});
