import { describe, expect, it } from 'vitest';
import { ilikeContains, orFilterTerm } from '@/common/db/or-filter';

describe('orFilterTerm', () => {
  it('strips characters that break or widen a PostgREST or() filter', () => {
    expect(orFilterTerm('a,b(c)*%:"\\')).toBe('a b c');
  });

  it('keeps a filter injection attempt as plain words', () => {
    expect(orFilterTerm('a,b),status.eq.lost')).toBe('a b  status.eq.lost');
  });

  it('keeps _ so names like um_ahmad still match', () => {
    expect(orFilterTerm('um_ahmad')).toBe('um_ahmad');
  });

  it('answers an empty string for blank or syntax-only input', () => {
    expect(orFilterTerm('  ,()  ')).toBe('');
  });
});

describe('ilikeContains', () => {
  it('wraps the trimmed term in % for .ilike()', () => {
    expect(ilikeContains('  ahmad ')).toBe('%ahmad%');
  });

  it('escapes LIKE wildcards, backslash and comma so they match literally', () => {
    expect(ilikeContains('50%_a\\b,c')).toBe('%50\\%\\_a\\\\b\\,c%');
  });
});
