import { describe, expect, it } from 'vitest';
import { ClientUsageCounter, OTHER_BUCKET, usageSummary } from './client-usage.counter';

describe('ClientUsageCounter', () => {
  it('counts per method × route × client, largest first, and resets on drain', () => {
    const c = new ClientUsageCounter();
    c.hit({ method: 'PATCH', route: '/settings', client: 'untagged' });
    c.hit({ method: 'PATCH', route: '/settings', client: 'untagged' });
    c.hit({ method: 'GET', route: '/students/:id', client: 'web/1' });
    expect(c.drain()).toEqual([
      ['PATCH /settings untagged', 2],
      ['GET /students/:id web/1', 1],
    ]);
    expect(c.size).toBe(0);
    expect(c.drain()).toEqual([]);
  });

  it('past the cap a new key keeps method, route and platform (build → other); known keys still count', () => {
    const c = new ClientUsageCounter(3);
    for (let i = 0; i < 5; i += 1) c.hit({ method: 'GET', route: `/r${i}`, client: 'web/1' });
    c.hit({ method: 'GET', route: '/r0', client: 'web/1' });
    expect(c.drain()).toEqual([
      ['GET /r0 web/1', 2],
      ['GET /r1 web/1', 1],
      ['GET /r2 web/1', 1],
      [`GET /r3 web/${OTHER_BUCKET}`, 1],
      [`GET /r4 web/${OTHER_BUCKET}`, 1],
    ]);
  });

  it('forged builds filling the cap never hide an untagged hit on an alias route', () => {
    const c = new ClientUsageCounter(2);
    for (let i = 0; i < 50; i += 1) c.hit({ method: 'PATCH', route: '/settings', client: `web/f${i}` });
    c.hit({ method: 'PATCH', route: '/settings', client: 'untagged' });
    expect(c.drain()).toContainEqual(['PATCH /settings untagged', 1]);
  });
});

describe('usageSummary', () => {
  it('one line with the total; nothing to log when empty', () => {
    expect(usageSummary([])).toBeNull();
    expect(usageSummary([['PATCH /settings untagged', 2], ['GET /settings web/1', 1]])).toBe(
      'client usage (3 hits): PATCH /settings untagged=2; GET /settings web/1=1',
    );
  });
});
