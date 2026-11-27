import { describe, expect, it } from 'vitest';
import { savedReplyRoutes as routes } from '../saved-replies.routes';

const ID = 'e1111111-1111-4111-8111-111111111111';
const REPLY = {
  id: ID,
  scope: 'shared',
  title: 'الأسعار',
  body: 'السعر مرفق',
  attachment: { name: 'الأسعار.pdf', mime: 'application/pdf', size: 1200 },
  position: 1,
  updated_at: '2026-11-27T03:00:00.000Z',
};

describe('savedReplyRoutes', () => {
  it('keeps the paths the api serves today', () => {
    const lines = Object.values(routes).map((r) => `${r.method} ${r.path}`);
    expect(lines).toEqual([
      'GET /saved-replies',
      'POST /saved-replies',
      'POST /saved-replies/attachment-upload-url',
      'PATCH /saved-replies/:id',
      'DELETE /saved-replies/:id',
      'POST /saved-replies/:id/move',
      'POST /saved-replies/:id/stage',
    ]);
  });

  it('answers every reply with its scope, its file and its place', () => {
    const plain = { ...REPLY, scope: 'mine', attachment: null };
    expect(routes.all.response.parse([REPLY, plain])).toEqual([REPLY, plain]);
    expect(routes.all.response.safeParse([{ ...REPLY, scope: 'everyone' }]).success).toBe(false);
    const gif = { ...REPLY, attachment: { ...REPLY.attachment, mime: 'image/gif' } };
    expect(routes.all.response.safeParse([gif]).success).toBe(false);
  });

  it('creates and edits with the shared bodies and answers the reply', () => {
    const made = routes.create.body.parse({ scope: 'mine', title: ' ق ', body: 'ب' });
    expect(made.title).toBe('ق');
    expect(routes.update.body.parse({ attachment: null })).toEqual({ attachment: null });
    expect(routes.update.response.parse(REPLY)).toEqual(REPLY);
  });

  it('names a reply by a uuid', () => {
    expect(routes.remove.params.safeParse({ id: 'x' }).success).toBe(false);
    expect(routes.move.params.parse({ id: ID })).toEqual({ id: ID });
  });

  it('moves a reply and answers both lists in their new order', () => {
    expect(routes.move.body.safeParse({ direction: 'left' }).success).toBe(false);
    expect(routes.move.response.parse([REPLY])).toEqual([REPLY]);
  });

  it('signs an upload and stages a copy for the file send', () => {
    const signed = { bucket: 'chat', path: 'saved/u/x.pdf', token: 't', signed_url: 'https://s/x' };
    expect(routes.uploadUrl.response.parse(signed)).toEqual(signed);
    expect(routes.uploadUrl.body.safeParse({ mime: 'image/png', size: 0 }).success).toBe(false);
    const staged = routes.stage.response.parse({ path: 'chat/u/x.pdf', filename: 'x.pdf' });
    expect(staged.filename).toBe('x.pdf');
  });

  it('answers nothing for the delete', () => {
    expect(routes.remove.response).toBe('empty');
  });
});
