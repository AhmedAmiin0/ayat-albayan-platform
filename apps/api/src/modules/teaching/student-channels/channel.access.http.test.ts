import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { channelApp, OTHER, ST, type Who } from './channel.fakes';

type App = Awaited<ReturnType<typeof channelApp>>;
const TEACHER = `/teachers/me/channels/${ST}/messages`;
const PORTAL = `/portal/students/${ST}/channel/messages`;
const ADMIN = `/students/${ST}/channel/messages`;
const SALES = `/sales/students/${ST}/channel/messages`;

// docs/31 §2: participants read and write, monitors only read, nobody else gets in.
describe('student channel access over HTTP', () => {
  let t: App;
  beforeAll(async () => {
    t = await channelApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => vi.clearAllMocks());

  it('participants read: the current teacher, the guardian, the student login', async () => {
    for (const [who, url] of [['teacher', TEACHER], ['guardian', PORTAL], ['student', PORTAL]] as [Who, string][]) {
      const res = await t.call('GET', url, who);
      expect([who, res.statusCode, res.json().read_only]).toEqual([who, 200, false]);
    }
  });

  it('monitors read with read_only: the admin (student_channels.monitor) and the owning assistant', async () => {
    expect((await t.call('GET', ADMIN, 'admin')).json().read_only).toBe(true);
    expect((await t.call('GET', SALES, 'sales')).json().read_only).toBe(true);
  });

  it('a monitor cannot post or mark read anywhere: 403', async () => {
    for (const who of ['admin', 'sales', 'assistant'] as Who[]) {
      for (const url of [TEACHER, PORTAL]) expect([who, url, (await t.post(url, who, { body: 'x' })).statusCode]).toEqual([who, url, 403]);
    }
    expect((await t.post(ADMIN, 'admin', { body: 'x' })).statusCode).toBe(404);
    expect(t.queries.insert).not.toHaveBeenCalled();
    expect(t.queries.markRead).not.toHaveBeenCalled();
  });

  it('a teacher change moves access: the old teacher is refused, never reads the history', async () => {
    const res = await t.call('GET', TEACHER, 'oldTeacher');
    expect([res.statusCode, res.json().code]).toEqual([404, 'student_not_found']);
    t.queries.teacherIds.mockResolvedValueOnce(['t2']);
    expect((await t.call('GET', TEACHER, 'oldTeacher')).statusCode).toBe(200);
    expect(t.queries.page).toHaveBeenCalledTimes(1);
  });

  it('a guardian of another family, another assistant and an unknown student are refused', async () => {
    expect((await t.call('GET', PORTAL, 'otherGuardian')).json().code).toBe('student_not_found');
    expect((await t.post(PORTAL, 'otherGuardian', { body: 'x' })).statusCode).toBe(404);
    expect((await t.call('GET', SALES, 'otherSales')).json().code).toBe('student_not_found');
    expect((await t.call('GET', `/students/52000000-0000-4000-8000-0000000000ff/channel/messages`, 'admin')).statusCode).toBe(404);
    expect((await t.call('GET', `/portal/students/${OTHER}/channel/messages`, 'guardian')).statusCode).toBe(404);
    expect(t.queries.page).not.toHaveBeenCalled();
  });

  it('routes refuse the wrong role: the guardian on the teacher route, the teacher on the portal, sales on the admin route', async () => {
    expect((await t.call('GET', TEACHER, 'guardian')).statusCode).toBe(403);
    expect((await t.call('GET', PORTAL, 'teacher')).statusCode).toBe(403);
    expect((await t.call('GET', ADMIN, 'sales')).statusCode).toBe(403);
    expect((await t.call('GET', SALES, 'admin')).statusCode).toBe(403);
  });
});
