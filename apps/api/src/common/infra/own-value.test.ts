import { describe, expect, it } from 'vitest';
import { own } from './own-value';

describe('own: a table entry for a name the sender chose', () => {
  const table = { READ: 'read' };

  it('reads an own key', () => {
    expect(own(table, 'READ')).toBe('read');
  });

  it('never reaches Object.prototype', () => {
    expect(['constructor', '__proto__', 'toString', 'NEW'].map((k) => own(table, k))).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
    ]);
  });
});
