import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { L1, lessonRow, portalApp, S1, S2 } from './portal.fakes';

type App = Awaited<ReturnType<typeof portalApp>>;
const JOIN = `/portal/students/${S1}/lessons/${L1}/join`;
const PLATFORM = { display_name_ar: 'أبرار', display_name_en: null, meeting_mode: 'platform' };

// «ادخل الحلقة» of a classroom lesson: the student-link guest admission, for this student and lesson, inside the window.
describe('POST /portal/students/:id/lessons/:lessonId/join', () => {
  let t: App;
  beforeAll(async () => {
    t = await portalApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-27T15:55:00.000Z'));
    t.lessons.one.mockResolvedValue(lessonRow({ teacher: PLATFORM }));
  });

  it('inside the window: admitted as a guest through THE (lesson, student) link row; no token is handed out', async () => {
    const res = await t.call('POST', JOIN, 'guardianA');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ url: 'wss://lk.example.org', token: 'room-token', role: 'guest' });
    expect(t.lessons.one).toHaveBeenCalledWith({ studentId: S1, lessonId: L1 });
    expect(t.classroom.lessonLinkId).toHaveBeenCalledWith({ lesson: expect.objectContaining({ id: L1 }), studentId: S1 });
    expect(t.admission.admit).toHaveBeenCalledWith(
      expect.objectContaining({ lessonId: L1, role: 'guest', name: 'سلمى', principal: { joinLinkId: 'jl-1' }, ttlSeconds: 3000 }),
      expect.any(Date),
    );
    vi.useRealTimers();
  });

  it('before the window 403 join_not_open_yet with opens_at; after it 410; nobody is admitted', async () => {
    vi.setSystemTime(new Date('2026-10-27T15:00:00.000Z'));
    const early = await t.call('POST', JOIN, 'guardianA');
    expect([early.statusCode, early.json().code, early.json().opens_at]).toEqual([403, 'join_not_open_yet', '2026-10-27T15:50:00.000Z']);
    vi.setSystemTime(new Date('2026-10-27T16:50:00.000Z'));
    expect((await t.call('POST', JOIN, 'guardianA')).statusCode).toBe(410);
    expect(t.admission.admit).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('an external lesson is 409 not_classroom_lesson; a cancelled one 410; a lesson no longer ahead 404', async () => {
    t.lessons.one.mockResolvedValueOnce(lessonRow());
    expect((await t.call('POST', JOIN, 'guardianA')).json().code).toBe('not_classroom_lesson');
    t.lessons.one.mockResolvedValueOnce(lessonRow({ teacher: PLATFORM, status: 'cancelled_by_teacher' }));
    expect((await t.call('POST', JOIN, 'guardianA')).statusCode).toBe(410);
    t.classroom.lessonsAhead.mockResolvedValueOnce([]);
    expect((await t.call('POST', JOIN, 'guardianA')).json().code).toBe('no_lesson');
    expect(t.admission.admit).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('a lesson the student is not on is 404; a sibling the student login cannot reach is 404', async () => {
    t.lessons.one.mockResolvedValueOnce(null);
    expect((await t.call('POST', JOIN, 'guardianA')).json().code).toBe('lesson_not_found');
    expect((await t.call('POST', `/portal/students/${S2}/lessons/${L1}/join`, 'student1')).json().code).toBe('student_not_found');
    expect(t.admission.admit).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('GET lessons: the next 14 days and the lessons whose room is still open, the external URL only while open', async () => {
    const res = await t.call('GET', `/portal/students/${S1}/lessons`, 'guardianA');
    const [lesson] = res.json().lessons;
    expect(lesson).toMatchObject({ id: L1, way_in: 'external', meeting_url: 'https://meet.example.org/abc', window: { state: 'open' } });
    expect(t.lessons.ahead).toHaveBeenCalledWith({ studentId: S1, since: '2026-10-27T13:55:00.000Z', until: '2026-11-10T15:55:00.000Z' });
    vi.setSystemTime(new Date('2026-10-27T12:00:00.000Z'));
    const later = (await t.call('GET', `/portal/students/${S1}/lessons`, 'guardianA')).json().lessons[0];
    expect([later.window.state, later.meeting_url]).toEqual(['early', null]);
    vi.useRealTimers();
  });

  it('without LiveKit a platform lesson offers no way in (like its reminders), and the join is 503', async () => {
    t.admission.livekit.mockImplementation(() => {
      throw Object.assign(new Error('x'), { getStatus: () => 503 });
    });
    t.lessons.ahead.mockResolvedValueOnce([lessonRow({ teacher: PLATFORM })]);
    const res = await t.call('GET', `/portal/students/${S1}/lessons`, 'guardianA');
    expect(res.json().lessons[0].way_in).toBe('none');
    t.admission.livekit.mockReset().mockReturnValue({ url: 'wss://lk.example.org' });
    vi.useRealTimers();
  });
});
