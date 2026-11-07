import { describe, expect, it } from 'vitest';
import { LaneLocks } from './lane-locks';

const later = () => new Promise<void>((r) => setTimeout(r, 2));

describe('LaneLocks (docs/42 42-7)', () => {
  it('one drain at a time per key, in the order asked; other keys in parallel', async () => {
    const locks = new LaneLocks();
    const log: string[] = [];
    const work = (name: string) => async () => {
      log.push(`${name}+`);
      await later();
      log.push(`${name}-`);
      return name;
    };
    const all = await Promise.all([
      locks.run('chat', work('c1')), locks.run('chat', work('c2')), locks.run('notifications', work('n1')),
    ]);
    expect(all).toEqual(['c1', 'c2', 'n1']);
    expect(log.indexOf('c1-')).toBeLessThan(log.indexOf('c2+'));
    expect(log.indexOf('n1+')).toBeLessThan(log.indexOf('c1-'));
    await later();
    expect(locks.busy).toBe(0);
  });

  it('a failed drain does not block the next one on its key', async () => {
    const locks = new LaneLocks();
    await expect(locks.run('k', () => Promise.reject(new Error('db')))).rejects.toThrow('db');
    await expect(locks.run('k', () => Promise.resolve(1))).resolves.toBe(1);
  });
});
