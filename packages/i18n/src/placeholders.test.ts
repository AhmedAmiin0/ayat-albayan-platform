import { describe, expect, it } from 'vitest';
import { missingPlaceholders, placeholderTokens } from './placeholders.js';

describe('placeholderTokens', () => {
  it('finds {name} and {{n}} slots, distinct and sorted', () => {
    expect(placeholderTokens('{n} of {total}, {n} again')).toEqual(['{n}', '{total}']);
    expect(placeholderTokens('times in {{3}}')).toEqual(['{{3}}']);
    expect(placeholderTokens('no slots')).toEqual([]);
  });
});

describe('missingPlaceholders', () => {
  it('empty when the override keeps every slot (order and extra text are free)', () => {
    expect(missingPlaceholders('{teacher} with {student}', 'with {student}: {teacher}')).toEqual([]);
  });

  it('names the slots the override drops', () => {
    expect(missingPlaceholders('{n} of {total}', '{n} lessons')).toEqual(['{total}']);
    expect(missingPlaceholders('in {{3}}', 'in {3}')).toEqual(['{{3}}']);
  });

  it('a default without slots accepts anything', () => {
    expect(missingPlaceholders('Save', 'Store {x}')).toEqual([]);
  });
});
