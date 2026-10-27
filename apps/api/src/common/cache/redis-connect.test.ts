import { describe, expect, it, vi } from 'vitest';
import { connectRedis } from './redis-connect';

const made = vi.hoisted(() => [] as { url: string; options: Record<string, unknown>; calls: unknown[][] }[]);

vi.mock('ioredis', () => ({
  default: class {
    status = 'ready';
    private readonly rec: (typeof made)[number];
    constructor(url: string, options: Record<string, unknown>) {
      this.rec = { url, options, calls: [] };
      made.push(this.rec);
    }
    private call(...args: unknown[]): Promise<string> {
      this.rec.calls.push(args);
      return Promise.resolve('OK');
    }
    on = (...a: unknown[]) => this.call('on', a[0]);
    get = (k: string) => this.call('get', k);
    set = (...a: unknown[]) => this.call('set', ...a);
    unlink = (...a: unknown[]) => this.call('unlink', ...a);
    publish = (...a: unknown[]) => this.call('publish', ...a);
    subscribe = (c: string) => this.call('subscribe', c);
    scanStream = (o: unknown) => (this.call('scanStream', o), [][Symbol.iterator]());
    quit = () => this.call('quit');
  },
}));

describe('connectRedis', () => {
  it('two connections: commands fail fast (no offline queue, short timeouts), the listener waits and re-subscribes', () => {
    connectRedis('redis://ayat-redis:6379', () => undefined);
    const [cmd, sub] = made;
    expect(cmd?.options).toMatchObject({ enableOfflineQueue: false, commandTimeout: 250, connectTimeout: 1_000, maxRetriesPerRequest: 1 });
    expect(sub?.options).toMatchObject({ maxRetriesPerRequest: null, autoResubscribe: true, connectTimeout: 1_000 });
    expect(cmd?.calls).toContainEqual(['on', 'error']);
    expect(sub?.calls).toContainEqual(['on', 'error']);
  });

  it('maps the store commands onto ioredis', async () => {
    made.length = 0;
    const { commands, subscriber } = connectRedis('redis://h', () => undefined);
    await commands.setPx('k', 'v', 500);
    await commands.unlink(['a', 'b']);
    commands.scan('p*');
    await subscriber.subscribe('c');
    expect(made[0]?.calls).toEqual(expect.arrayContaining([['set', 'k', 'v', 'PX', 500], ['unlink', 'a', 'b'], ['scanStream', { match: 'p*', count: 200 }]]));
    expect(made[1]?.calls).toContainEqual(['subscribe', 'c']);
    expect(commands.ready()).toBe(true);
  });
});
