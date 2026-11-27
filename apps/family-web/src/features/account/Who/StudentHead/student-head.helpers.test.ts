import { t } from '@ab/web-kit';
import { describe, expect, it } from 'vitest';
import { codeWords } from './student-head.helpers';

describe('codeWords', () => {
  it('splits the sentence at the code so the words rebuild it around any code', () => {
    const { before, after } = codeWords();
    expect(`${before}{code}${after}`).toBe(t.portal.app.account.code);
    expect(before).not.toContain('{code}');
    expect(after).not.toContain('{code}');
  });
});
