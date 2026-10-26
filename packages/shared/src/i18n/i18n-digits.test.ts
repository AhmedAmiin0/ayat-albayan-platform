import { describe, expect, it } from 'vitest';
import ar from '../../i18n/ar.json' with { type: 'json' };

// docs/07 §2: one numeral system. Western digits everywhere, so no ar.json value may carry
// Eastern-Arabic digits (U+0660–U+0669); they would sit next to Western times and prices.
function leaves(node: unknown, path: string): [string, string][] {
  if (typeof node === 'string') return [[path, node]];
  if (node && typeof node === 'object') {
    return Object.entries(node).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k));
  }
  return [];
}

describe('ar.json numerals (docs/07 §2)', () => {
  it('no value contains Eastern-Arabic digits', () => {
    const offenders = leaves(ar, '').filter(([, v]) => /[٠-٩]/.test(v));
    expect(offenders).toEqual([]);
  });

  it('duration and package labels keep their wording with Western digits', () => {
    expect(ar.enums.duration['30']).toBe('30 دقيقة');
    expect(ar.enums.duration['45']).toBe('45 دقيقة');
    expect(ar.enums.packageSize['4']).toBe('4 حلقات في الشهر');
    expect(ar.enums.packageSize['16']).toBe('16 حلقة في الشهر');
  });
});
