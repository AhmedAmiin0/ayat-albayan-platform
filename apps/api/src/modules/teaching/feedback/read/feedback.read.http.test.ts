import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { listRow, TEACHER_ID } from '../feedback.fakes';
import { feedbackApp } from '../test-app';

describe('feedback lists', () => {
  let h: Awaited<ReturnType<typeof feedbackApp>>;
  beforeAll(async () => {
    h = await feedbackApp();
  });
  afterAll(() => h.app.close());
  beforeEach(() => h.reset());

  describe('GET /feedback (admin)', () => {
    it('a page of rows with the student, the teacher and the family phone', async () => {
      const res = await h.call({ method: 'GET', url: '/feedback?page=2&pageSize=10&kind=trial&rating=4&from=2026-10-01&to=2026-10-31' });
      expect(res.statusCode).toBe(200);
      expect(h.reads.page).toHaveBeenCalledWith({
        filter: { kind: 'trial', rating: 4, from: '2026-10-01', to: '2026-10-31' },
        page: { page: 2, pageSize: 10 },
      });
      const body = res.json();
      expect(body).toMatchObject({ total: 1, page: 2, pageSize: 10 });
      expect(body.items[0]).toMatchObject({
        student: { code: 'AB-0183', name: 'سهيلة' },
        teacher: { id: TEACHER_ID, name: 'أبرار' },
        rating: 5,
        contact_phone: '+966509999999',
      });
    });

    it('filters are validated', async () => {
      for (const q of ['kind=other', 'lesson=nope', 'rating=9', 'from=yesterday', 'teacher=nope', 'pageSize=500']) {
        expect((await h.call({ method: 'GET', url: `/feedback?${q}` })).statusCode).toBe(400);
      }
    });

    it('admin only: a teacher, even asking for another teacher’s rows, gets 403', async () => {
      const other = `/feedback?teacher=${TEACHER_ID}`;
      expect((await h.call({ method: 'GET', url: other, token: 'teacher' })).statusCode).toBe(403);
      expect((await h.call({ method: 'GET', url: '/feedback', token: 'other' })).statusCode).toBe(403);
      expect((await h.call({ method: 'GET', url: '/feedback', token: 'guardian' })).statusCode).toBe(403);
      expect(h.reads.page).not.toHaveBeenCalled();
    });
  });

  describe('GET /feedback/summary (admin)', () => {
    it('average, count and the yes share per teacher, best first', async () => {
      h.reads.averages.mockResolvedValue([
        { teacher_id: 'other-teacher', avg_rating: 3.5, n: 4, recommend_yes_pct: 25 },
        { teacher_id: TEACHER_ID, avg_rating: 4.75, n: 8, recommend_yes_pct: 87.5 },
      ]);
      h.reads.teachers.mockResolvedValue([
        { id: TEACHER_ID, display_name_ar: 'أبرار' },
        { id: 'other-teacher', display_name_ar: 'هند' },
      ]);
      const res = await h.call({ method: 'GET', url: '/feedback/summary' });
      expect(res.json()).toEqual([
        { teacher: { id: TEACHER_ID, name: 'أبرار' }, avg_rating: 4.75, n: 8, recommend_yes_pct: 87.5 },
        { teacher: { id: 'other-teacher', name: 'هند' }, avg_rating: 3.5, n: 4, recommend_yes_pct: 25 },
      ]);
      expect((await h.call({ method: 'GET', url: '/feedback/summary', token: 'teacher' })).statusCode).toBe(403);
    });
  });

  describe('GET /teachers/me/feedback (teacher)', () => {
    it('own rows and own average, scoped by the login; no phone, no guardian, no teacher block', async () => {
      h.reads.averages.mockResolvedValue([{ teacher_id: TEACHER_ID, avg_rating: 4.5, n: 2, recommend_yes_pct: 100 }]);
      const res = await h.call({ method: 'GET', url: '/teachers/me/feedback?page=1&pageSize=5', token: 'teacher' });
      expect(res.statusCode).toBe(200);
      expect(h.reads.mine).toHaveBeenCalledWith(TEACHER_ID, { filter: {}, page: { page: 1, pageSize: 5 } });
      expect(h.reads.averages).toHaveBeenCalledWith(TEACHER_ID);
      const body = res.json();
      expect(body.average).toEqual({ avg_rating: 4.5, n: 2, recommend_yes_pct: 100 });
      expect(body.items[0]).toMatchObject({ student: { name: 'سهيلة' }, rating: 5, note: 'ممتازة' });
      for (const hidden of ['contact_phone', 'guardian_id', 'token_hash', 'teacher']) expect(body.items[0]).not.toHaveProperty(hidden);
      expect(JSON.stringify(body)).not.toContain('+966509999999');
    });

    it('another teacher gets their own scope, never the first one’s rows', async () => {
      h.reads.mine.mockResolvedValue({ rows: [], total: 0 });
      const res = await h.call({ method: 'GET', url: '/teachers/me/feedback', token: 'other' });
      expect(h.reads.mine).toHaveBeenCalledWith('other-teacher', { filter: {}, page: { page: 1, pageSize: 25 } });
      expect(res.json()).toMatchObject({ items: [], total: 0, average: null });
    });

    it('teacher only: admin and guardian get 403; an unlinked teacher 404', async () => {
      expect((await h.call({ method: 'GET', url: '/teachers/me/feedback', token: 'admin' })).statusCode).toBe(403);
      expect((await h.call({ method: 'GET', url: '/teachers/me/feedback', token: 'guardian' })).statusCode).toBe(403);
      h.teachers.idByProfile.mockResolvedValue(null);
      expect((await h.call({ method: 'GET', url: '/teachers/me/feedback', token: 'teacher' })).statusCode).toBe(404);
    });
  });

  it('listRow fixture is a submitted row', () => {
    expect(listRow().submitted_at).not.toBeNull();
  });
});
