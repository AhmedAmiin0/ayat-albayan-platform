import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { pauseApp } from './course-pause.fakes';

type App = Awaited<ReturnType<typeof pauseApp>>;
const FOREIGN = '5a000000-0000-4000-8000-0000000000f9';
const URL = `/students/${FOREIGN}/course-pause`;
const ROUTES = [
  { method: 'GET', url: URL },
  { method: 'GET', url: `${URL}/preview?from=2026-11-01&until=2026-11-10` },
  { method: 'GET', url: `${URL}/resume-preview` },
  { method: 'POST', url: URL, body: { reason: 'سفر' } },
  { method: 'PATCH', url: `${URL}/until`, body: { untilDate: '2026-11-20' } },
  { method: 'POST', url: `${URL}/resume`, body: {} },
] as const;
const isStart = (r: (typeof ROUTES)[number]) => r.method === 'POST' && r.url === URL;

// docs/11 §7b: only courses.pause (the admin and sales) pauses a course; a family or a teacher
// never reaches another family's student through these routes.
describe("course pause routes with another family's student id", () => {
  let t: App;
  beforeAll(async () => {
    t = await pauseApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => t.reset());

  it.each(['teacher', 'guardian', 'student'] as const)(
    '%s: 403 on every route, nothing read or written',
    async (token) => {
      for (const route of ROUTES) {
        const res = await t.call({ ...route, token });
        expect([route.method, route.url, res.statusCode]).toEqual([route.method, route.url, 403]);
      }
      expect(t.m.queries.studentExists).not.toHaveBeenCalled();
      expect(t.m.queries.call).not.toHaveBeenCalled();
    },
  );

  it('sales with an unknown student id: 404 student_not_found, nothing written', async () => {
    t.m.queries.studentExists.mockResolvedValue(false);
    const checked = ROUTES.filter((r) => !isStart(r));
    for (const route of checked) {
      const res = await t.call({ ...route, token: 'sales' });
      expect([route.url, res.statusCode, res.json().code]).toEqual([
        route.url,
        404,
        'student_not_found',
      ]);
    }
    expect(t.m.queries.call).not.toHaveBeenCalled();
  });
});
