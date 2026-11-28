import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { L1, portalApp, S1 } from './portal.fakes';

const BAD = 'not-a-uuid';
const FILE = 'f1000000-0000-4000-8000-000000000001';

const ROUTES: ['GET' | 'POST', string][] = [
  ['GET', `/portal/students/${BAD}/lessons`],
  ['GET', `/portal/students/${BAD}/history?status=attended`],
  ['POST', `/portal/students/${S1}/lessons/${BAD}/room-link`],
  ['GET', `/portal/students/${BAD}/reports`],
  ['POST', `/portal/students/${S1}/reports/${BAD}/url`],
  ['POST', `/portal/students/${BAD}/recordings/${FILE}/url`],
  ['GET', `/portal/students/${BAD}/package`],
  ['POST', `/portal/students/${BAD}/lessons/${L1}/room-link`],
];

// The portal ids move from ParseUUIDPipe to the route's params schema (docs/62 part 1 §6).
describe('/portal ids over HTTP', () => {
  let t: Awaited<ReturnType<typeof portalApp>>;
  beforeAll(async () => {
    t = await portalApp();
  });
  afterAll(() => t.app.close());

  it.each(ROUTES)('%s %s answers 400 validation_failed', async (method, url) => {
    const res = await t.call(method, url, 'guardianA');
    expect(res.statusCode).toBe(400);
    expect(res.json().code).toBe('validation_failed');
  });
});
