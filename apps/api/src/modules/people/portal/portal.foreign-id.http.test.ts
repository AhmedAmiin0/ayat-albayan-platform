import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { L1, portalApp, REC, R1, S1, S2, S3, type Who } from './portal.fakes';

type App = Awaited<ReturnType<typeof portalApp>>;
const FILE = 'fb000000-0000-4000-8000-000000000001';
const LATER = '2026-10-28T16:00:00.000Z';
const WEEK = 'from=2026-10-28T00:00:00.000Z&to=2026-10-29T00:00:00.000Z';

/** Every /portal id route under a student, with a body where it needs one. */
const ROUTES = (s: string): readonly (readonly ['GET' | 'POST', string, object?])[] => [
  ['GET', `/portal/students/${s}/lessons/${L1}/files`],
  ['GET', `/portal/students/${s}/lessons/${L1}/slots?${WEEK}`],
  ['GET', `/portal/students/${s}/recordings`],
  ['POST', `/portal/students/${s}/lesson-files/${FILE}/url`],
  ['POST', `/portal/students/${s}/recordings/${REC}/url`],
  ['POST', `/portal/students/${s}/reports/${R1}/url`],
  ['POST', `/portal/students/${s}/lessons/${L1}/confirm`],
  ['POST', `/portal/students/${s}/lessons/${L1}/cancel`, {}],
  ['POST', `/portal/students/${s}/lessons/${L1}/request`, { startsAt: LATER }],
  ['POST', `/portal/students/${s}/lessons/${L1}/withdraw`],
];

/** A login and a student it does not own: another family's child, a sibling of a student. */
const FOREIGN: readonly (readonly [Who, string])[] = [
  ['guardianB', S1],
  ['guardianA', S3],
  ['student1', S2],
];

// The portal reads with the service role: only the login's own students may come back.
describe('/portal: someone else’s student id', () => {
  let t: App;
  beforeAll(async () => {
    t = await portalApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => vi.clearAllMocks());

  it.each(FOREIGN)('%s on %s gets 404 student_not_found on every route', async (who, s) => {
    for (const [method, url, payload] of ROUTES(s)) {
      const res = await t.app.inject({
        method,
        url,
        headers: { authorization: `Bearer ${who}` },
        ...(payload === undefined ? {} : { payload }),
      });
      expect([url, res.statusCode, res.json().code]).toEqual([url, 404, 'student_not_found']);
    }
  });

  it('reads and signs nothing for a foreign id', async () => {
    for (const [method, url, payload] of ROUTES(S3)) {
      const headers = { authorization: 'Bearer guardianA' };
      await t.app.inject({ method, url, headers, ...(payload === undefined ? {} : { payload }) });
    }
    expect(t.lessons.one).not.toHaveBeenCalled();
    expect(t.reports.oneSent).not.toHaveBeenCalled();
    expect(t.reports.visibleRecordings).not.toHaveBeenCalled();
    expect(t.storage.signedDownload).not.toHaveBeenCalled();
  });
});
