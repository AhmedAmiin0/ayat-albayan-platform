import { describe, expect, it } from 'vitest';
import { portalLessonRoutes } from '../portal-actions.routes';

const S = '11111111-1111-4111-8111-111111111111';
const L = '22222222-2222-4222-8222-222222222222';
const FROM = '2026-11-15T21:00:00.000Z';
const TO = '2026-11-22T21:00:00.000Z';

describe('portalLessonRoutes (docs/31: the family acts on its own lesson)', () => {
  it('keeps the paths the api serves today', () => {
    const lines = Object.values(portalLessonRoutes).map((r) => `${r.method} ${r.path}`);
    const base = '/portal/students/:id/lessons/:lessonId';
    expect(lines).toEqual([
      `POST ${base}/confirm`,
      `POST ${base}/cancel`,
      `POST ${base}/request`,
      `POST ${base}/withdraw`,
      `GET ${base}/slots`,
    ]);
  });

  it('takes a cancel with no body as one without a reason', () => {
    const { body } = portalLessonRoutes.cancel;
    expect(body.parse(undefined)).toEqual({});
    expect(body.parse({ reason: ' سفر ' })).toEqual({ reason: 'سفر' });
    expect(body.safeParse({ reason: 'x'.repeat(501) }).success).toBe(false);
  });

  it('refuses a request at a free-text time', () => {
    const { body } = portalLessonRoutes.request;
    expect(body.safeParse({ startsAt: '2026-10-28 16:00' }).success).toBe(false);
    expect(body.parse({ startsAt: FROM })).toEqual({ startsAt: FROM });
  });

  it.each([
    ['a bad student id', { id: 'x', lessonId: L }],
    ['a bad lesson id', { id: S, lessonId: 'x' }],
  ])('refuses %s in the path', (_name, params) => {
    expect(portalLessonRoutes.confirm.params.safeParse(params).success).toBe(false);
  });

  it('reads a week of slots only forwards', () => {
    const { query } = portalLessonRoutes.slots;
    expect(query.parse({ from: FROM, to: TO })).toEqual({ from: FROM, to: TO });
    expect(query.safeParse({ from: TO, to: FROM }).success).toBe(false);
  });

  it('refuses an answer with a status the lessons never take', () => {
    const answer = { lesson_id: L, status: 'confirmed', counts: false };
    expect(portalLessonRoutes.withdraw.response.parse(answer)).toEqual(answer);
    const bad = { ...answer, status: 'moved' };
    expect(portalLessonRoutes.withdraw.response.safeParse(bad).success).toBe(false);
  });
});
