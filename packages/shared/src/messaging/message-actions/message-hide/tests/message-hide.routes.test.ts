import { describe, expect, it } from 'vitest';
import { messageHideRoutes as routes } from '..';

const ID = 'b1111111-1111-4111-8111-111111111111';
const PHONE = '+966501234567';

describe('messageHideRoutes', () => {
  it('keeps the paths the api serves today', () => {
    const lines = Object.values(routes).map((r) => `${r.method} ${r.path}`);
    expect(lines).toEqual([
      'POST /threads/:phone/messages/:messageId/hide',
      'DELETE /threads/:phone/messages/:messageId/hide',
    ]);
  });

  it('names a message by its chat phone and a uuid', () => {
    expect(routes.hide.params.parse({ phone: PHONE, messageId: ID })).toEqual({
      phone: PHONE,
      messageId: ID,
    });
    expect(routes.hide.params.safeParse({ phone: PHONE, messageId: 'nope' }).success).toBe(false);
    expect(routes.unhide.params.safeParse({ phone: 'x', messageId: ID }).success).toBe(false);
  });

  it('answers nothing for either', () => {
    expect([routes.hide.response, routes.unhide.response]).toEqual(['empty', 'empty']);
  });

  it('lets inbox.send in on every route and tags each inbox', () => {
    const access = Object.values(routes).map((r) => [r.permissions, r.tags]);
    expect(access).toEqual(Object.values(routes).map(() => [['inbox.send'], ['inbox']]));
  });
});
