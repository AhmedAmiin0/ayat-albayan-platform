import { describe, expect, it } from 'vitest';
import { nameMatch, textMatch } from './compare';

describe('duplicate compare results (R-STU-03)', () => {
  it('textMatch: exact, letter-variant, different', () => {
    expect(textMatch(' أم إيمان ', 'أم إيمان')).toBe('same');
    expect(textMatch('ام جود', 'أم جود')).toBe('near');
    expect(textMatch('سهيله', 'سهيلة')).toBe('near');
    expect(textMatch('أم جود', 'أبو يوسف')).toBe('differs');
  });

  it('nameMatch: سهيلة/سهيله and «جود وسهيله» are near, other names differ', () => {
    expect(nameMatch('سهيلة محمد', 'سهيلة محمد')).toBe('same');
    expect(nameMatch('سهيله', 'سهيلة')).toBe('near');
    expect(nameMatch('جود وسهيله', 'سهيلة')).toBe('near');
    expect(nameMatch('جودي', 'سهيلة')).toBe('differs');
  });
});
