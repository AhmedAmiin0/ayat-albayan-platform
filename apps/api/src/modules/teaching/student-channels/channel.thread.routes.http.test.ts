import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { channelApp, ST, type Who } from './channel.fakes';

type App = Awaited<ReturnType<typeof channelApp>>;
const TEACHER = '/teachers/me/channels';
const PORTAL = (id: string) => `/portal/students/${id}/channel`;
const PAGES: [string, Who][] = [
  [`${TEACHER}/x/messages`, 'teacher'],
  [`${PORTAL('x')}/messages`, 'guardian'],
  ['/students/x/channel/messages', 'admin'],
  ['/sales/students/x/channel/messages', 'sales'],
];
const answer = (r: Awaited<ReturnType<App['call']>>) => [
  r.statusCode,
  r.json<{ message: string }>().message,
];

describe('student chat threads served from their route objects (docs/31 §2)', () => {
  let t: App;
  beforeAll(async () => {
    t = await channelApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => vi.clearAllMocks());

  it('a malformed student id answers validation_failed on every page and reads nothing', async () => {
    const seen = [];
    for (const [path, who] of PAGES) seen.push(answer(await t.call('GET', path, who)));
    expect(seen).toEqual(Array(4).fill([400, 'validation_failed']));
    expect(t.queries.page).not.toHaveBeenCalled();
  });

  it('a malformed id on a send, read mark or unread count stores nothing', async () => {
    const seen = [
      answer(await t.post(`${TEACHER}/x/messages`, 'teacher', { body: 'hi' })),
      answer(await t.post(`${PORTAL('x')}/messages`, 'guardian', { body: 'hi' })),
      answer(await t.post(`${TEACHER}/x/read`, 'teacher', {})),
      answer(await t.call('GET', `${PORTAL('x')}/unread`, 'guardian')),
    ];
    expect(seen).toEqual(Array(4).fill([400, 'validation_failed']));
    expect(t.queries.insert).not.toHaveBeenCalled();
    expect(t.queries.setReadMark).not.toHaveBeenCalled();
  });

  it('a page asked before something that is not an instant is refused before any read', async () => {
    const res = await t.call('GET', `${PORTAL(ST)}/messages?before=soon`, 'guardian');
    expect(answer(res)).toEqual([400, 'validation_failed']);
    expect(t.queries.page).not.toHaveBeenCalled();
  });

  it('a read mark without a body answers 204 with nothing, for the teacher and the family', async () => {
    const teacher = await t.call('POST', `${TEACHER}/${ST}/read`, 'teacher');
    const family = await t.call('POST', `${PORTAL(ST)}/read`, 'guardian');
    expect([teacher.statusCode, teacher.body, family.statusCode]).toEqual([204, '', 204]);
  });

  it('the teacher list still answers one row per current student', async () => {
    const res = await t.call('GET', TEACHER, 'teacher');
    expect(res.statusCode).toBe(200);
    expect(res.json<{ student_id: string; unread: number }[]>()).toMatchObject([
      { student_id: ST, unread: 2 },
    ]);
  });

  it('each audience is refused on the threads of the others', async () => {
    const codes = [
      (await t.call('GET', `${PORTAL(ST)}/messages`, 'teacher')).statusCode,
      (await t.call('GET', `${TEACHER}/${ST}/messages`, 'guardian')).statusCode,
      (await t.call('GET', `/students/${ST}/channel/messages`, 'teacher')).statusCode,
      (await t.call('GET', TEACHER, 'guardian')).statusCode,
    ];
    expect(codes).toEqual([403, 403, 403, 403]);
  });
});
