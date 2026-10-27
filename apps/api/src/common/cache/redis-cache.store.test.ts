import { describe, expect, it, vi } from 'vitest';
import { fakeRedis } from './cache.fakes';
import { KEY_PREFIX, RedisCacheStore } from './redis-cache.store';

function store() {
  const redis = fakeRedis();
  const commands = redis.commands();
  const subscriber = redis.subscriber();
  return { redis, commands, subscriber, store: new RedisCacheStore({ commands, subscriber }) };
}

describe('RedisCacheStore', () => {
  it('prefixes every key and stores with a millisecond TTL', async () => {
    const { redis, commands, store: s } = store();
    const setPx = vi.spyOn(commands, 'setPx');
    await s.set('settings:rows', '[]', 30_000.4);
    expect(setPx).toHaveBeenCalledWith(`${KEY_PREFIX}settings:rows`, '[]', 30_000);
    expect(await s.get('settings:rows')).toBe('[]');
    redis.server.now = 30_000;
    expect(await s.get('settings:rows')).toBeNull();
  });

  it('deletes by prefix with SCAN, the prefix taken literally (glob characters escaped)', async () => {
    const { commands, store: s } = store();
    const scan = vi.spyOn(commands, 'scan');
    await s.set('perm:u1', '1', 9_000);
    await s.set('perma', '1', 9_000);
    await s.delByPrefix('perm:');
    expect(await s.get('perm:u1')).toBeNull();
    expect(await s.get('perma')).toBe('1');
    await s.delByPrefix('a*[b]?');
    expect(scan).toHaveBeenLastCalledWith(`${KEY_PREFIX}a\\*\\[b\\]\\?*`);
  });

  it('del with no keys sends nothing', async () => {
    const { commands, store: s } = store();
    const unlink = vi.spyOn(commands, 'unlink');
    await s.del([]);
    expect(unlink).not.toHaveBeenCalled();
  });

  it('routes a message to the subscribers of its channel', async () => {
    const { store: s } = store();
    const heard = vi.fn();
    await s.subscribe('invalidate', heard);
    await s.publish('invalidate', 'm');
    expect(heard).toHaveBeenCalledExactlyOnceWith('m');
    expect(s.ready()).toBe(true);
  });

  it('close quits both connections even when one fails', async () => {
    const { commands, subscriber, store: s } = store();
    vi.spyOn(commands, 'quit').mockRejectedValue(new Error('gone'));
    const quit = vi.spyOn(subscriber, 'quit');
    await expect(s.close()).resolves.toBeUndefined();
    expect(quit).toHaveBeenCalled();
  });
});
