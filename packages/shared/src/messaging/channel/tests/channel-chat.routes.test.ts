import { describe, expect, it } from 'vitest';
import { channelSalesRoutes as routes } from '../channel-chat.routes';
import { channelSeatRoutes } from '../channel-seat.routes';

const ID = 'a1111111-1111-4111-8111-111111111111';
const AT = '2026-11-27T10:00:00.000Z';

describe('channelSalesRoutes', () => {
  it('keeps the paths the api serves today', () => {
    const lines = Object.values(routes).map((r) => `${r.method} ${r.path}`);
    expect(lines).toEqual([
      'GET /sales/students/:id/channel/messages',
      'POST /sales/students/:id/channel/messages',
      'POST /sales/students/:id/channel/read',
      'GET /sales/students/:id/channel/unread',
    ]);
  });

  it('takes the student id and refuses anything else', () => {
    expect(routes.post.params.parse({ id: ID })).toEqual({ id: ID });
    expect(routes.read.params.safeParse({ id: 'x' }).success).toBe(false);
    expect(routes.unread.params.safeParse({}).success).toBe(false);
  });

  it('a send needs text or a file', () => {
    expect(routes.post.body.parse({ body: ' hi ' })).toEqual({ body: 'hi' });
    expect(routes.post.body.safeParse({ body: '  ' }).success).toBe(false);
  });

  it('a read mark without a body reads up to now; a bad instant is refused', () => {
    expect(routes.read.body.parse(undefined)).toEqual({});
    expect(routes.read.body.parse({ at: AT })).toEqual({ at: AT });
    expect(routes.read.body.safeParse({ at: 'yesterday' }).success).toBe(false);
    expect(routes.read.response).toBe('empty');
  });

  it('answers the unread count, never a negative one', () => {
    expect(routes.unread.response.parse({ unread: 3 })).toEqual({ unread: 3 });
    expect(routes.unread.response.safeParse({ unread: -1 }).success).toBe(false);
  });

  it('every assistant chat route lets in self.sales under the student-channels tag', () => {
    const all = [...Object.values(routes), ...Object.values(channelSeatRoutes)];
    const access = all.map((r) => [r.permissions, r.tags]);
    expect(access).toEqual(Array(7).fill([['self.sales'], ['student-channels']]));
  });
});
