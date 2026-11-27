import { describe, expect, it } from 'vitest';
import { stickerPanelRoutes as routes } from '..';

const ID = '00000000-0000-4000-8000-000000000001';
const ITEM = { message_id: ID, phone: '+966500000001', key: 'sha:Zm9v' };
const GIF = {
  id: 'abc123',
  title: 'شكرا',
  preview: 'https://media.giphy.com/a.gif',
  width: 200,
  height: 112,
};

describe('stickerPanelRoutes', () => {
  it('keeps the paths of today', () => {
    const lines = Object.values(routes).map((r) => `${r.method} ${r.path}`);
    expect(lines).toEqual([
      'GET /threads/stickers',
      'PUT /threads/stickers/favourites',
      'DELETE /threads/stickers/favourites/:messageId',
      'GET /threads/gifs',
    ]);
  });

  it('answers the sticker list with the favourites, then the recent ones', () => {
    const list = { favourites: [ITEM], recent: [] };
    expect(routes.list.response.parse(list)).toEqual(list);
    expect(routes.list.response.safeParse({ favourites: [ITEM] }).success).toBe(false);
    const noKey = { favourites: [{ ...ITEM, key: '' }], recent: [] };
    expect(routes.list.response.safeParse(noKey).success).toBe(false);
  });

  it('saves and removes a favourite by its message id, with no answer body', () => {
    expect(routes.favourite.body.parse({ messageId: ID })).toEqual({ messageId: ID });
    expect(routes.favourite.body.safeParse({ messageId: 'm1' }).success).toBe(false);
    expect(routes.unfavourite.params.parse({ messageId: ID })).toEqual({ messageId: ID });
    expect(routes.unfavourite.params.safeParse({ messageId: 'm1' }).success).toBe(false);
    expect([routes.favourite.response, routes.unfavourite.response]).toEqual(['empty', 'empty']);
  });

  it('searches GIFs by trimmed words or none, and answers whether GIPHY is set up', () => {
    expect(routes.gifs.query.parse({ q: '  شكرا ' })).toEqual({ q: 'شكرا' });
    expect(routes.gifs.query.parse({})).toEqual({});
    expect(routes.gifs.query.safeParse({ q: 'x'.repeat(51) }).success).toBe(false);
    const list = { configured: true, items: [GIF] };
    expect(routes.gifs.response.parse(list)).toEqual(list);
    const noSize = { configured: true, items: [{ ...GIF, width: 0 }] };
    expect(routes.gifs.response.safeParse(noSize).success).toBe(false);
  });

  it('lets inbox.read in on every route and tags each inbox', () => {
    const access = Object.values(routes).map((r) => [r.permissions, r.tags]);
    expect(access).toEqual(Object.values(routes).map(() => [['inbox.read'], ['inbox']]));
  });
});
