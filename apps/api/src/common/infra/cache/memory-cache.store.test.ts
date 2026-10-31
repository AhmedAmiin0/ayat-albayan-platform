import { describe, expect, it, vi } from 'vitest';
import { MemoryCacheStore } from './memory-cache.store';

describe('MemoryCacheStore', () => {
  it('keeps a value until its TTL, then forgets it', async () => {
    let now = 0;
    const store = new MemoryCacheStore(() => now);
    await store.set('k', '"v"', 1_000);
    now = 999;
    expect(await store.get('k')).toBe('"v"');
    now = 1_000;
    expect(await store.get('k')).toBeNull();
  });

  it('deletes keys and prefixes', async () => {
    const store = new MemoryCacheStore();
    await Promise.all([store.set('perm:a', '1', 9_000), store.set('perm:b', '1', 9_000), store.set('other', '1', 9_000)]);
    await store.delByPrefix('perm:');
    expect([await store.get('perm:a'), await store.get('perm:b'), await store.get('other')]).toEqual([null, null, '1']);
    await store.del(['other']);
    expect(await store.get('other')).toBeNull();
  });

  it('delivers a publish to this process only, by channel; close forgets everything', async () => {
    const store = new MemoryCacheStore();
    const heard = vi.fn();
    await store.subscribe('c', heard);
    await store.publish('c', 'm');
    await store.publish('other', 'x');
    expect(heard).toHaveBeenCalledExactlyOnceWith('m');
    await store.close();
    await store.publish('c', 'm');
    expect(heard).toHaveBeenCalledTimes(1);
    expect(store.ready()).toBe(true);
  });
});
