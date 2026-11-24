import { describe, expect, it } from 'vitest';
import { KeyVerdicts } from '@/modules/messaging/whatsapp/relay/access/relay.verdicts';

describe('KeyVerdicts', () => {
  it('a verdict holds until its instant, unknown before it is set and after', () => {
    const v = new KeyVerdicts();
    expect(v.of('a', 0)).toBeUndefined();
    v.remember('a', { ok: false, until: 10 });
    expect(v.of('a', 9)).toBe(false);
    expect(v.of('a', 10)).toBeUndefined();
    v.remember('a', { ok: true, until: 20 });
    expect(v.of('a', 15)).toBe(true);
  });

  it('holds at most 1000 keys: the oldest goes first', () => {
    const v = new KeyVerdicts();
    for (let i = 0; i <= 1_000; i += 1) v.remember(`k${i}`, { ok: false, until: 99 });
    expect(v.of('k0', 0)).toBeUndefined();
    expect(v.of('k1', 0)).toBe(false);
    expect(v.of('k1000', 0)).toBe(false);
  });
});
