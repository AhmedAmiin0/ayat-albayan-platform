import { describe, expect, it } from 'vitest';
import { aMessageView } from '../../../testing/messages';
import { lessonRatingRoutes as routes } from '.';

const REQ = '5f0c2c4e-1b2a-4c3d-9e8f-0a1b2c3d4e5f';

describe('lessonRatingRoutes (R-FBK)', () => {
  it('keeps POST /threads/:phone/rating, let in by feedback.write, tagged inbox', () => {
    const { send } = routes;
    expect(`${send.method} ${send.path}`).toBe('POST /threads/:phone/rating');
    expect([send.permissions, send.tags]).toEqual([['feedback.write'], ['inbox']]);
  });

  it('takes one client request id, and refuses a body without one', () => {
    expect(routes.send.body.parse({ clientRequestId: REQ })).toEqual({ clientRequestId: REQ });
    expect(routes.send.body.safeParse({}).success).toBe(false);
  });

  it('names the chat by an E.164 phone', () => {
    expect(routes.send.params.safeParse({ phone: '+966500000001' }).success).toBe(true);
    expect(routes.send.params.safeParse({ phone: 'abc' }).success).toBe(false);
  });

  it('answers the queued message, and refuses an answer that is no message', () => {
    const sent = aMessageView({ template_key: 'lesson_rating' });
    expect(routes.send.response.parse(sent)).toEqual(sent);
    expect(routes.send.response.safeParse({ id: 'msg1' }).success).toBe(false);
  });
});
