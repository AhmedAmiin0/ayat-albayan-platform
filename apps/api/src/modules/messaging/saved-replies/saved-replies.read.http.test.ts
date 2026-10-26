import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { repliesApp, row } from './saved-replies.fakes';

type App = Awaited<ReturnType<typeof repliesApp>>;

describe('GET /saved-replies: the shared list, then the caller\'s own', () => {
  let t: App;
  beforeAll(async () => {
    t = await repliesApp({
      rows: [
        row({ n: 1, title: 'ب', position: 1 }),
        row({ n: 2, title: 'أ', position: 1 }),
        row({ n: 3, title: 'الأسعار', position: 0, attachment_path: 'saved/a1/x.pdf', attachment_mime: 'application/pdf', attachment_name: 'الأسعار.pdf', attachment_size: 900 }),
        row({ n: 4, owner_profile_id: 's1', title: 'ردي' }),
        row({ n: 5, owner_profile_id: 's2', title: 'رد زميلة' }),
      ],
    });
  });
  afterAll(() => t.app.close());

  it('orders each list by position then title, and never shows another person\'s replies', async () => {
    const res = await t.call({ method: 'GET', url: '/saved-replies', token: 'sales' });
    expect(res.statusCode).toBe(200);
    const list = res.json<{ title: string; scope: string }[]>();
    expect(list.map((r) => [r.scope, r.title])).toEqual([['shared', 'الأسعار'], ['shared', 'أ'], ['shared', 'ب'], ['mine', 'ردي']]);
  });

  it('shows the attachment\'s name, type and size, never its storage path', async () => {
    const res = await t.call({ method: 'GET', url: '/saved-replies' });
    const first = res.json<Record<string, unknown>[]>()[0];
    expect(first?.attachment).toEqual({ name: 'الأسعار.pdf', mime: 'application/pdf', size: 900 });
    expect(JSON.stringify(res.json())).not.toContain('saved/a1');
    expect(res.json<{ scope: string }[]>().filter((r) => r.scope === 'mine')).toEqual([]);
  });

  it('is 403 for a teacher and a guardian', async () => {
    for (const token of ['teacher', 'guardian']) {
      const res = await t.call({ method: 'GET', url: '/saved-replies', token });
      expect(res.statusCode).toBe(403);
    }
  });
});
