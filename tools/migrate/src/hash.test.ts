import { describe, expect, it } from 'vitest';
import { recordHash, stableJson } from './hash.ts';

describe('stableJson', () => {
  it('sorts keys at every depth and drops undefined', () => {
    expect(stableJson({ b: 1, a: { d: [2, 1], c: null }, e: undefined })).toBe(
      '{"a":{"c":null,"d":[2,1]},"b":1}',
    );
  });
  it('handles scalars', () => {
    expect(stableJson('x')).toBe('"x"');
    expect(stableJson(undefined)).toBe('null');
  });
});

describe('recordHash', () => {
  it('is independent of key order', () => {
    const a = recordHash({ columns: { name: 'x', age: 9 }, refs: {} });
    const b = recordHash({ columns: { age: 9, name: 'x' }, refs: {} });
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });
  it('changes with content and refs', () => {
    const base = { columns: { name: 'x' }, refs: {} };
    const ref = { guardian_id: { entity: 'guardians' as const, key: '+201000000001' } };
    expect(recordHash(base)).not.toBe(recordHash({ columns: { name: 'y' }, refs: {} }));
    expect(recordHash(base)).not.toBe(recordHash({ ...base, refs: ref }));
  });
});
