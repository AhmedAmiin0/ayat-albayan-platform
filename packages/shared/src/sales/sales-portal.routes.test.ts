import { describe, expect, it } from 'vitest';
import { salesPortalRoutes } from './sales-portal.routes';

const SUB = {
  id: 'sub-1',
  student: { id: 's1', code: 'AB-0101', name: 'ياسمين' },
  package: '8',
  status: 'unpaid',
  starts_on: '2026-10-01',
  lessons_total: 8,
};
const MEETING = {
  lesson_id: 'les-1',
  starts_at: '2026-10-05T16:00:00Z',
  ends_at: '2026-10-05T16:30:00Z',
  status: 'scheduled',
  teacher_name: null,
  lead_or_student_name: 'أم ياسمين',
  joinable_window: {
    state: 'early',
    opens_at: '2026-10-05T15:45:00.000Z',
    closes_at: '2026-10-05T18:30:00.000Z',
  },
};
const RANGE = { from: '2026-10-01T00:00:00Z', to: '2026-10-31T00:00:00Z' };

describe('salesPortalRoutes', () => {
  it('keeps the paths the api serves today', () => {
    const { subscriptions, meetings } = salesPortalRoutes;
    expect(`${subscriptions.method} ${subscriptions.path}`).toBe('GET /sales/subscriptions');
    expect(`${meetings.method} ${meetings.path}`).toBe('GET /sales/meetings');
  });

  it('asks for a pending or a confirmed kind, nothing else', () => {
    const { query } = salesPortalRoutes.subscriptions;
    expect(query.parse({ kind: 'confirmed' })).toEqual({ kind: 'confirmed' });
    expect(query.safeParse({ kind: 'all' }).success).toBe(false);
    expect(query.safeParse({}).success).toBe(false);
  });

  it('reads a range of instants at most 31 days long', () => {
    const { query } = salesPortalRoutes.meetings;
    expect(query.parse(RANGE)).toEqual(RANGE);
    expect(query.safeParse({ ...RANGE, to: '2026-11-05T00:00:00Z' }).success).toBe(false);
    expect(query.safeParse({ from: RANGE.to, to: RANGE.from }).success).toBe(false);
    expect(query.safeParse({ from: 'x', to: 'y' }).success).toBe(false);
  });

  it('answers subscription rows with or without a package size', () => {
    const { response } = salesPortalRoutes.subscriptions;
    const rows = [SUB, { ...SUB, package: null }];
    expect(response.parse(rows)).toEqual(rows);
    expect(response.safeParse([{ ...SUB, status: 'gone' }]).success).toBe(false);
  });

  it('drops a money key a row would carry', () => {
    const [row] = salesPortalRoutes.subscriptions.response.parse([{ ...SUB, price: 290 }]);
    expect(row).not.toHaveProperty('price');
  });

  it('answers meetings with their join window', () => {
    const { response } = salesPortalRoutes.meetings;
    expect(response.parse([MEETING])).toEqual([MEETING]);
    const bad = { ...MEETING, joinable_window: { ...MEETING.joinable_window, state: 'x' } };
    expect(response.safeParse([bad]).success).toBe(false);
  });
});
