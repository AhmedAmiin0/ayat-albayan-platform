import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { channelApp, OTHER, ST } from './channel.fakes';

type App = Awaited<ReturnType<typeof channelApp>>;
const post = (studentId: string) => `/teachers/me/channels/${studentId}/messages`;

describe('POST /teachers/me/channels/:studentId/messages with another teacher’s student', () => {
  let t: App;
  beforeAll(async () => {
    t = await channelApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => vi.clearAllMocks());

  const nothingSent = (): void => {
    expect(t.queries.channelOf).not.toHaveBeenCalled();
    expect(t.queries.insert).not.toHaveBeenCalled();
    expect(t.queries.setReadMark).not.toHaveBeenCalled();
    expect(t.push.notifyProfiles).not.toHaveBeenCalled();
  };

  it('another teacher’s student is 404 student_not_found and nothing is stored or pushed', async () => {
    t.queries.teacherIds.mockResolvedValueOnce(['t2']);
    const res = await t.post(post(OTHER), 'teacher', { body: 'x' });
    expect([res.statusCode, res.json().code]).toEqual([404, 'student_not_found']);
    expect(res.body).not.toContain('سلمى');
    nothingSent();
  });

  it('a former teacher of the student is 404 and nothing is stored or pushed', async () => {
    expect((await t.post(post(ST), 'oldTeacher', { body: 'x' })).statusCode).toBe(404);
    nothingSent();
  });

  it('an unknown student is 404 and nothing is stored or pushed', async () => {
    t.queries.teacherIds.mockResolvedValueOnce([]);
    const res = await t.post(post('52000000-0000-4000-8000-0000000000ff'), 'teacher', { body: 'x' });
    expect([res.statusCode, res.json().code]).toEqual([404, 'student_not_found']);
    nothingSent();
  });

  it('the student’s current teacher still posts', async () => {
    expect((await t.post(post(ST), 'teacher', { body: 'x' })).statusCode).toBe(201);
    expect(t.queries.insert).toHaveBeenCalledTimes(1);
  });
});
