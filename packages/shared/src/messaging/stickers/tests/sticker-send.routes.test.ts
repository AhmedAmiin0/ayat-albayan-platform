import { describe, expect, it } from 'vitest';
import { aMessageView } from '../../../testing';
import { stickerSendRoutes as routes } from '..';

const ID = '00000000-0000-4000-8000-000000000001';
const PHONE = '+966500000001';

describe('stickerSendRoutes', () => {
  it('keeps the paths of today', () => {
    const lines = Object.values(routes).map((r) => `${r.method} ${r.path}`);
    expect(lines).toEqual(['POST /threads/:phone/sticker', 'POST /threads/:phone/gif']);
  });

  it('reads any spelling of the phone and refuses a bad one', () => {
    expect(routes.sticker.params.parse({ phone: '966500000001' })).toEqual({ phone: PHONE });
    expect(routes.gif.params.safeParse({ phone: 'abc' }).success).toBe(false);
  });

  it('sends a held sticker by its message id only', () => {
    const body = { messageId: ID, clientRequestId: ID };
    expect(routes.sticker.body.parse(body)).toEqual(body);
    expect(routes.sticker.body.safeParse({ ...body, messageId: 'm1' }).success).toBe(false);
    expect(routes.sticker.body.safeParse({ messageId: ID }).success).toBe(false);
  });

  it('sends a GIPHY id and never a link', () => {
    const body = { gifId: 'xT9IgG50Fb7Mi0prBC', clientRequestId: ID };
    expect(routes.gif.body.parse(body)).toEqual(body);
    const link = { ...body, gifId: 'https://media.example/x.mp4' };
    expect(routes.gif.body.safeParse(link).success).toBe(false);
  });

  it('answers the sent message as a message view', () => {
    const sent = aMessageView({ media_mime: 'image/webp' });
    expect(routes.sticker.response.parse(sent)).toEqual(sent);
    expect(routes.gif.response.safeParse({ ...sent, direction: 'sideways' }).success).toBe(false);
  });

  it('lets inbox.send in and tags both inbox', () => {
    const access = Object.values(routes).map((r) => [r.permissions, r.tags]);
    expect(access).toEqual([
      [['inbox.send'], ['inbox']],
      [['inbox.send'], ['inbox']],
    ]);
  });
});
