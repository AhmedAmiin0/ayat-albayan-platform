import { routePath } from '@ab/core';
import { describe, expect, it } from 'vitest';
import { courseStopRoutes as routes } from '../course-stop.routes';

const STUDENT = 'e1111111-1111-4111-8111-111111111111';
const SUB = 'e2222222-2222-4222-8222-222222222222';
const REQ = 'e3333333-3333-4333-8333-333333333333';
const LOOSE_HEX = '3f1c2a7e-9b4d-0e1a-0c2f-1d2e3f4a5b6c';
const PREVIEW = {
  subscriptionId: SUB,
  futureLessons: 2,
  futureStarts: ['2026-12-01T14:00:00.000Z', '2026-12-03T14:00:00.000Z'],
  activeRules: 1,
  paid: 400,
  currency: 'SAR',
  refund: { paid: 400, perLesson: 50, attended: 3, ratePercent: 100, charged: 150, refund: 250 },
  refundUnavailable: false,
  owe: { charged: 150, price: 400 },
  stopped: null,
};
const RESULT = {
  subscriptionId: SUB,
  cancelledLessons: 2,
  endedRules: 1,
  studentStatus: 'churned',
  stoppedAt: '2026-11-27T10:00:00.000Z',
  refund: { amount: 250, card: 0, manual: 250 },
};

describe('courseStopRoutes', () => {
  it('keeps the paths the api serves today', () => {
    const lines = Object.values(routes).map((r) => `${r.method} ${r.path}`);
    expect(lines).toEqual(['GET /students/:id/course-stop', 'POST /students/:id/course-stop']);
    expect(routePath(routes.stop, { id: STUDENT })).toBe(`/students/${STUDENT}/course-stop`);
  });

  it('keeps the strict uuid check on the student id', () => {
    expect(routes.preview.params.safeParse({ id: STUDENT }).success).toBe(true);
    expect(routes.preview.params.safeParse({ id: LOOSE_HEX }).success).toBe(false);
  });

  it('previews the current package when no package is named', () => {
    expect(routes.preview.query.parse({})).toEqual({});
    expect(routes.preview.query.safeParse({ subscriptionId: 'x' }).success).toBe(false);
  });

  it('answers the sheet lines, with or without a refund and the old answer without starts', () => {
    const { response } = routes.preview;
    expect(response.parse(PREVIEW)).toEqual(PREVIEW);
    const { futureStarts: _starts, ...old } = PREVIEW;
    expect(response.parse({ ...old, refund: null })).toEqual({ ...old, refund: null });
    const stopped = { at: '2026-11-20T08:00:00.000Z', by: null, reason: 'سفر' };
    expect(response.parse({ ...PREVIEW, stopped }).stopped).toEqual(stopped);
  });

  it('refuses a preview without its owe numbers or with a stopped mark lacking its time', () => {
    const { response } = routes.preview;
    const { owe: _owe, ...noOwe } = PREVIEW;
    expect(response.safeParse(noOwe).success).toBe(false);
    expect(response.safeParse({ ...PREVIEW, stopped: { by: null } }).success).toBe(false);
  });

  it('stops one named package with its reason and request id', () => {
    const body = { subscriptionId: SUB, reason: 'سفر', clientRequestId: REQ };
    expect(routes.stop.body.parse(body)).toEqual(body);
    expect(routes.stop.body.safeParse({ ...body, reason: ' ' }).success).toBe(false);
  });

  it('answers what the stop did, a known student status and the refund or null', () => {
    const { response } = routes.stop;
    expect(response.parse(RESULT)).toEqual(RESULT);
    expect(response.parse({ ...RESULT, refund: null }).refund).toBeNull();
    expect(response.safeParse({ ...RESULT, studentStatus: 'gone' }).success).toBe(false);
  });
});
