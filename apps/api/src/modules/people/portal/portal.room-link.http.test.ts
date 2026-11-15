import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { verifyFamilyJoin } from '@/modules/teaching/classroom/family-link/family-join.token';
import { FAMILY_SECRET } from '@/modules/teaching/classroom/family-link/family-link.fakes';
import { L1, lessonRow, portalApp, S1, S2, S3 } from './portal.fakes';

type App = Awaited<ReturnType<typeof portalApp>>;
const LINK = `/portal/students/${S1}/lessons/${L1}/room-link`;
const PLATFORM = { display_name_ar: 'أبرار', display_name_en: null, meeting_mode: 'platform' };
const NOW = new Date('2026-10-27T12:00:00.000Z');

// The family app opens our classroom in the phone's browser: a signed /join link, no new sign-in.
describe('POST /portal/students/:id/lessons/:lessonId/room-link', () => {
  let t: App;
  beforeAll(async () => {
    t = await portalApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    t.lessons.one.mockResolvedValue(lessonRow({ teacher: PLATFORM }));
  });

  it('hands back /join/<signed token> of THIS lesson and student, until its room closes', async () => {
    const res = await t.call('POST', LINK, 'guardianA');
    expect(res.statusCode).toBe(200);
    const body: { url: string; expires_at: string } = res.json();
    expect(body.expires_at).toBe('2026-10-27T16:45:00.000Z');
    const token = body.url.split('/join/')[1] ?? '';
    const claim = verifyFamilyJoin(FAMILY_SECRET, token, NOW);
    expect(claim).toMatchObject({ lessonId: L1, studentId: S1 });
    expect(t.lessons.one).toHaveBeenCalledWith({ studentId: S1, lessonId: L1 });
    expect(t.admission.admit).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("another family's student or a sibling out of reach is 404 student_not_found", async () => {
    const other = await t.call('POST', `/portal/students/${S3}/lessons/${L1}/room-link`, 'guardianA');
    expect([other.statusCode, other.json().code]).toEqual([404, 'student_not_found']);
    const sibling = await t.call('POST', `/portal/students/${S2}/lessons/${L1}/room-link`, 'student1');
    expect(sibling.json().code).toBe('student_not_found');
    expect(t.lessons.one).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('404 lesson_not_found, 409 not_classroom_lesson, 410 cancelled, 404 no_lesson when over', async () => {
    t.lessons.one.mockResolvedValueOnce(null);
    expect((await t.call('POST', LINK, 'guardianA')).json().code).toBe('lesson_not_found');
    t.lessons.one.mockResolvedValueOnce(lessonRow());
    const external = await t.call('POST', LINK, 'guardianA');
    expect([external.statusCode, external.json().code]).toEqual([409, 'not_classroom_lesson']);
    t.lessons.one.mockResolvedValueOnce(lessonRow({ teacher: PLATFORM, status: 'cancelled_by_teacher' }));
    expect((await t.call('POST', LINK, 'guardianA')).statusCode).toBe(410);
    t.classroom.lessonsAhead.mockResolvedValueOnce([]);
    expect((await t.call('POST', LINK, 'guardianA')).json().code).toBe('no_lesson');
    vi.useRealTimers();
  });

  it('staff and a signed-out caller are refused; a bad id is 400', async () => {
    expect((await t.call('POST', LINK, 'admin')).statusCode).toBe(403);
    expect((await t.call('POST', LINK)).statusCode).toBe(401);
    expect((await t.call('POST', `/portal/students/x/lessons/${L1}/room-link`, 'guardianA')).statusCode).toBe(400);
    vi.useRealTimers();
  });
});
