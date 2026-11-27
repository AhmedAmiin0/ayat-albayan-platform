import { describe, expect, it } from 'vitest';
import { feedbackPublicRoutes, feedbackRoutes } from './feedback.routes';

const row = {
  id: 'f1',
  lesson_id: 'l1',
  student: { id: 's1', code: 'AB-0183', name: 'سهيلة' },
  teacher: { id: 't1', name: 'أبرار' },
  kind: 'trial',
  requested_at: '2026-10-03T09:00:00+00:00',
  expires_at: '2026-10-10T09:00:00+00:00',
  rating: 5,
  recommend: 'yes',
  note: null,
  submitted_at: '2026-10-04T09:00:00+00:00',
  quick_rating: null,
  quick_rated_at: null,
  contact_phone: '+966509999999',
};
const { teacher: _teacher, contact_phone: _phone, ...own } = row;
const page = { items: [row], total: 1, page: 1, pageSize: 25 };

describe('feedbackRoutes (R-FBK)', () => {
  it.each([
    ['request', 'POST /lessons/:id/feedback-request'],
    ['list', 'GET /feedback'],
    ['summary', 'GET /feedback/summary'],
    ['mine', 'GET /teachers/me/feedback'],
  ] as const)('%s keeps the path the api serves today', (key, wire) => {
    const route = feedbackRoutes[key];
    expect(`${route.method} ${route.path}`).toBe(wire);
  });

  it('splits nothing: filters and paging come back from one query', () => {
    const query = feedbackRoutes.list.query.parse({ kind: 'trial', rating: '4', page: '2' });
    expect(query).toEqual({ kind: 'trial', rating: 4, page: 2, pageSize: 25 });
  });

  it('reports the filter alone when both the filter and the page are bad', () => {
    const result = feedbackRoutes.mine.query.safeParse({ kind: 'other', pageSize: '500' });
    expect(result.error?.issues.map((i) => i.path.join('.'))).toEqual(['kind']);
  });

  it('still refuses a bad page once the filter is fine', () => {
    const result = feedbackRoutes.list.query.safeParse({ pageSize: '500' });
    expect(result.error?.issues.map((i) => i.path.join('.'))).toEqual(['pageSize']);
  });

  it('answers the admin page, the summary and the teacher page', () => {
    expect(feedbackRoutes.list.response.parse(page)).toEqual(page);
    const summary = [
      { teacher: { id: 't1', name: 'أبرار' }, avg_rating: 4.5, n: 2, recommend_yes_pct: 50 },
    ];
    expect(feedbackRoutes.summary.response.parse(summary)).toEqual(summary);
    const mine = { items: [own], total: 1, page: 1, pageSize: 20, average: null };
    expect(feedbackRoutes.mine.response.parse(mine)).toEqual(mine);
  });

  it('never hands a teacher the family phone or the teacher block', () => {
    const mine = { items: [row], total: 1, page: 1, pageSize: 20, average: null };
    expect(feedbackRoutes.mine.response.parse(mine).items[0]).toEqual(own);
  });

  it.each([
    ['a rating of 7', { ...row, rating: 7 }],
    ['an unknown kind', { ...row, kind: 'gift' }],
    ['an unknown quick rating', { ...row, quick_rating: 'meh' }],
    ['no student', { ...row, student: undefined }],
  ])('refuses a row with %s', (_name, bad) => {
    expect(feedbackRoutes.list.response.safeParse({ ...page, items: [bad] }).success).toBe(false);
  });

  it('answers a request with its message status', () => {
    const answer = {
      requested_at: row.requested_at,
      expires_at: row.expires_at,
      replayed: false,
      message_status: 'queued',
    };
    expect(feedbackRoutes.request.response.parse(answer)).toEqual(answer);
    const bad = { ...answer, message_status: 'lost' };
    expect(feedbackRoutes.request.response.safeParse(bad).success).toBe(false);
  });
});

describe('feedbackPublicRoutes (R-FBK, no login)', () => {
  const form = { teacherName: 'أبرار', kind: 'trial', contactPhone: '', alreadySubmitted: false };

  it.each([
    ['form', 'GET /public/feedback/:token'],
    ['submit', 'POST /public/feedback/:token'],
  ] as const)('%s keeps the path the api serves today', (key, wire) => {
    const route = feedbackPublicRoutes[key];
    expect(`${route.method} ${route.path}`).toBe(wire);
  });

  it("takes any token text: a wrong one is the service's 404, never a 400", () => {
    expect(feedbackPublicRoutes.form.params.parse({ token: 'a.b.c' })).toEqual({ token: 'a.b.c' });
  });

  it('answers the form with the teacher, the kind and the phone only', () => {
    expect(feedbackPublicRoutes.form.response.parse({ ...form, note: 'x' })).toEqual(form);
    const bad = { ...form, kind: 'gift' };
    expect(feedbackPublicRoutes.form.response.safeParse(bad).success).toBe(false);
  });

  it('sends one answer and hears it was saved', () => {
    const body = { rating: 5, recommend: 'yes', note: 'جزاكم الله خيرًا' };
    expect(feedbackPublicRoutes.submit.body.safeParse(body).success).toBe(true);
    expect(feedbackPublicRoutes.submit.body.safeParse({ rating: 9 }).success).toBe(false);
    expect(feedbackPublicRoutes.submit.response.parse({ submitted: true })).toEqual({
      submitted: true,
    });
  });
});
