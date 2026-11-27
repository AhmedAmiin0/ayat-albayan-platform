import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { channelApp, ST } from './channel.fakes';

type App = Awaited<ReturnType<typeof channelApp>>;
const chat = (id: string, end: string) => `/sales/students/${id}/channel/${end}`;

describe('assistant chat routes served from their route objects (docs/31 §2)', () => {
  let t: App;
  beforeAll(async () => {
    t = await channelApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => vi.clearAllMocks());

  it('a malformed student id answers the validation_failed envelope on every route', async () => {
    const answers = [
      await t.post(chat('x', 'messages'), 'sales', { body: 'hi' }),
      await t.post(chat('x', 'read'), 'sales', {}),
      await t.call('GET', chat('x', 'unread'), 'sales'),
    ];
    const seen = answers.map((r) => [r.statusCode, r.json<{ message: string }>().message]);
    expect(seen).toEqual(Array(3).fill([400, 'validation_failed']));
    expect(t.queries.insert).not.toHaveBeenCalled();
  });

  it('an empty send is refused before anything is stored', async () => {
    const res = await t.post(chat(ST, 'messages'), 'sales', { body: '  ' });
    expect(res.statusCode).toBe(400);
    expect(t.queries.insert).not.toHaveBeenCalled();
  });

  it('a read mark without a body answers 204 with nothing', async () => {
    const res = await t.call('POST', chat(ST, 'read'), 'sales');
    expect([res.statusCode, res.body]).toEqual([204, '']);
  });

  it('a teacher is refused on every assistant chat route', async () => {
    const codes = [
      (await t.post(chat(ST, 'messages'), 'teacher', { body: 'hi' })).statusCode,
      (await t.post(chat(ST, 'read'), 'teacher', {})).statusCode,
      (await t.call('GET', chat(ST, 'unread'), 'teacher')).statusCode,
      (await t.call('GET', chat(ST, 'seat'), 'teacher')).statusCode,
    ];
    expect(codes).toEqual([403, 403, 403, 403]);
  });
});
