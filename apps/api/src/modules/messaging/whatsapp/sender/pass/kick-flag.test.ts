import { describe, expect, it } from 'vitest';
import { KickFlag } from './kick-flag';

describe('KickFlag (docs/42 42-4)', () => {
  it('a kick is taken once; a timer pass sees none', () => {
    const flag = new KickFlag();
    expect(flag.take()).toBe(false);
    flag.set();
    expect(flag.take()).toBe(true);
    expect(flag.take()).toBe(false);
  });
});
