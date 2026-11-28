import { describe, expect, it } from 'vitest';
import { roleOfMeta } from '../moderation';

describe('roleOfMeta reads only a known role', () => {
  it('an unknown or non-string role, or a non-object, reads as null', () => {
    expect(roleOfMeta('{"role":"owner"}')).toBeNull();
    expect(roleOfMeta('{"role":7}')).toBeNull();
    expect(roleOfMeta('null')).toBeNull();
    expect(roleOfMeta('["teacher"]')).toBeNull();
  });

  it('extra keys do not hide a known role', () => {
    expect(roleOfMeta('{"role":"admin","x":1}')).toBe('admin');
  });
});
