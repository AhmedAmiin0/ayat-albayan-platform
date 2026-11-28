import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { routeOf } from '@/common/http/route';
import { FamilyRequestService, LessonStatusService } from '@/modules/teaching/lessons';
import { PortalLessonActionsController } from './actions/portal-actions.controller';
import { L1, lessonRow, portalApp, S1 } from './portal.fakes';

type App = Awaited<ReturnType<typeof portalApp>>;
const base = (student = S1, lesson = L1) => `/portal/students/${student}/lessons/${lesson}`;
const WEEK = 'from=2026-10-26T00:00:00.000Z&to=2026-11-02T00:00:00.000Z';
const BACKWARDS = 'from=2026-11-02T00:00:00.000Z&to=2026-10-26T00:00:00.000Z';

// The family's lesson actions as the shared route objects declare them.
describe('/portal/students/:id/lessons/:lessonId routes as declared', () => {
  let t: App;
  const spies = { confirm: vi.fn(), request: vi.fn() };
  const send = (method: 'GET' | 'POST', url: string, payload?: object) =>
    t.app.inject({ method, url, headers: { authorization: 'Bearer guardianA' }, payload });

  beforeAll(async () => {
    t = await portalApp();
    vi.spyOn(t.app.get(LessonStatusService), 'confirm').mockImplementation(spies.confirm);
    vi.spyOn(t.app.get(FamilyRequestService), 'request').mockImplementation(spies.request);
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    Object.values(spies).forEach((s) => s.mockReset());
    t.lessons.one.mockResolvedValue(lessonRow({ status: 'scheduled' }));
  });

  it('serves every handler from a shared route object', () => {
    const proto = PortalLessonActionsController.prototype;
    const handlers = [proto.confirm, proto.cancel, proto.request, proto.withdraw, proto.free];
    const paths = handlers.map((h) => routeOf(h)?.path.split('/').at(-1));
    expect(paths).toEqual(['confirm', 'cancel', 'request', 'withdraw', 'slots']);
  });

  it.each([
    ['POST', `${base('abc')}/confirm`],
    ['POST', `${base(S1, 'abc')}/withdraw`],
    ['GET', `${base('abc')}/slots?${WEEK}`],
  ] as const)('%s %s → 400 validation_failed, nothing done', async (method, url) => {
    const res = await send(method, url);
    expect([res.statusCode, res.json().message]).toEqual([400, 'validation_failed']);
    expect(spies.confirm).not.toHaveBeenCalled();
  });

  it('a slots window read backwards → 400, the lesson never read', async () => {
    t.lessons.one.mockClear();
    const res = await send('GET', `${base()}/slots?${BACKWARDS}`);
    expect(res.statusCode).toBe(400);
    expect(t.lessons.one).not.toHaveBeenCalled();
  });

  it('a request without a start → 400, nothing sent', async () => {
    const res = await send('POST', `${base()}/request`, { note: 'بعد العصر' });
    expect(res.statusCode).toBe(400);
    expect(spies.request).not.toHaveBeenCalled();
  });
});
