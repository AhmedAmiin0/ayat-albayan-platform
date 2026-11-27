import { describe, expect, it } from 'vitest';
import { aMessageView } from '../../../../testing';
import { threadSendRoutes as routes } from '..';

const ID = '00000000-0000-4000-8000-000000000001';
const PHONE = '+966500000001';

describe('threadSendRoutes', () => {
  it('keeps the paths of today', () => {
    const lines = Object.values(routes).map((r) => `${r.method} ${r.path}`);
    expect(lines).toEqual(['POST /threads/:phone/text', 'POST /threads/:phone/template']);
  });

  it('reads any spelling of the phone and refuses a bad one', () => {
    expect(routes.text.params.parse({ phone: '966500000001' })).toEqual({ phone: PHONE });
    expect(routes.template.params.safeParse({ phone: 'abc' }).success).toBe(false);
  });

  it('sends a text with its request id, and refuses an empty one', () => {
    const body = { text: 'hello', clientRequestId: ID, replyToMessageId: ID };
    expect(routes.text.body.parse(body)).toEqual(body);
    expect(routes.text.body.safeParse({ text: '  ' }).success).toBe(false);
  });

  it('keeps room for the prefix of a correction', () => {
    const text = 'x'.repeat(4090);
    expect(routes.text.body.safeParse({ text }).success).toBe(true);
    expect(routes.text.body.safeParse({ text, correctsId: ID }).success).toBe(false);
  });

  it('sends a template by its registry key only', () => {
    const body = { key: 'lesson_reminder', params: { '1': 'Ali' }, clientRequestId: ID };
    expect(routes.template.body.parse(body)).toEqual(body);
    const bad = { ...body, key: 'Lesson Reminder' };
    expect(routes.template.body.safeParse(bad).success).toBe(false);
  });

  it('answers a text with its row and whether it replayed the first one', () => {
    const answer = { ...aMessageView(), replayed: true, same_request: false };
    expect(routes.text.response.parse(answer)).toEqual(answer);
    expect(routes.text.response.safeParse(aMessageView()).success).toBe(false);
  });

  it('answers a template with its row', () => {
    const sent = aMessageView({ template_key: 'lesson_reminder' });
    expect(routes.template.response.parse(sent)).toEqual(sent);
    expect(routes.template.response.safeParse({ ...sent, direction: 'x' }).success).toBe(false);
  });

  it('lets inbox.send in and tags both inbox', () => {
    const access = Object.values(routes).map((r) => [r.permissions, r.tags]);
    expect(access).toEqual([
      [['inbox.send'], ['inbox']],
      [['inbox.send'], ['inbox']],
    ]);
  });
});
