import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { EXP, feedbackRow, LESSON_ID, NOW, requestContext, STUDENT_ID, tokenFor } from './feedback.fakes';
import { hashToken } from './feedback.token';
import { feedbackApp } from './test-app';

const URL = `/lessons/${LESSON_ID}/feedback-request`;
const BODY = { studentId: STUDENT_ID };

describe('POST /lessons/:id/feedback-request («ابعت طلب الرأي»)', () => {
  let h: Awaited<ReturnType<typeof feedbackApp>>;
  beforeAll(async () => {
    h = await feedbackApp();
  });
  afterAll(() => h.app.close());
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    h.reset();
    h.queries.requestContext.mockResolvedValue(requestContext());
    h.queries.find.mockResolvedValue(null);
    h.queries.issue.mockImplementation(async (row: object) => ({ ...feedbackRow(), ...row }));
    h.outbox.send.mockResolvedValue({ replayed: false, view: { status: 'queued' } });
  });
  afterEach(() => vi.useRealTimers());

  it('queues the template through the outbox with the signed token, deduped per link', async () => {
    const res = await h.call({ method: 'POST', url: URL, body: BODY });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ replayed: false, message_status: 'queued' });
    const issued = h.queries.issue.mock.calls[0]?.[0];
    expect(issued).toMatchObject({ lesson_id: LESSON_ID, student_id: STUDENT_ID, kind: 'subscription' });
    expect(issued.token_hash).toBe(hashToken(tokenFor()));
    expect(h.outbox.send).toHaveBeenCalledWith(
      expect.objectContaining({
        phone_e164: '+966501234567',
        template_key: 'lesson_feedback_request',
        template_params: { '1': 'سهيلة', '2': 'أبرار', button: tokenFor() },
        dedup_key: `lesson_feedback_request:${LESSON_ID}:${STUDENT_ID}:${EXP}`,
        lesson_id: LESSON_ID,
      }),
    );
  });

  it('a trial lesson is asked as a trial; the kind is never read from the client', async () => {
    h.queries.requestContext.mockResolvedValue(requestContext({ kind: 'trial' }));
    await h.call({ method: 'POST', url: URL, body: { ...BODY, kind: 'subscription', teacherId: 'x' } });
    expect(h.queries.issue.mock.calls[0]?.[0]).toMatchObject({ kind: 'trial' });
  });

  it('a second press while the link is alive rebuilds the same token: the outbox replays it', async () => {
    h.queries.find.mockResolvedValue(feedbackRow());
    h.outbox.send.mockResolvedValue({ replayed: true, view: { status: 'sent' } });
    const res = await h.call({ method: 'POST', url: URL, body: BODY });
    expect(res.json()).toMatchObject({ replayed: true, message_status: 'sent' });
    expect(h.queries.issue).not.toHaveBeenCalled();
    expect(h.outbox.send.mock.calls[0]?.[0].template_params.button).toBe(tokenFor());
  });

  it('resend replaces the link: a new row hash, so the old link stops working', async () => {
    h.queries.find.mockResolvedValue(feedbackRow({ expires_at: new Date(NOW.getTime() + 1000).toISOString() }));
    const res = await h.call({ method: 'POST', url: URL, body: { ...BODY, resend: true } });
    expect(res.statusCode).toBe(200);
    expect(h.queries.issue).toHaveBeenCalledOnce();
  });

  it('an expired link is replaced without asking for resend', async () => {
    h.queries.find.mockResolvedValue(feedbackRow({ expires_at: new Date(NOW.getTime() - 1000).toISOString() }));
    await h.call({ method: 'POST', url: URL, body: BODY });
    expect(h.queries.issue).toHaveBeenCalledOnce();
  });

  it('409 already_submitted once the family answered (never reset), also when it races the update', async () => {
    h.queries.find.mockResolvedValue(feedbackRow({ submitted_at: NOW.toISOString(), rating: 5, recommend: 'yes' }));
    const res = await h.call({ method: 'POST', url: URL, body: { ...BODY, resend: true } });
    expect(res.statusCode).toBe(409);
    expect(res.json().code).toBe('already_submitted');
    h.queries.find.mockResolvedValue(null);
    h.queries.issue.mockResolvedValue(null);
    expect((await h.call({ method: 'POST', url: URL, body: BODY })).statusCode).toBe(409);
    expect(h.outbox.send).not.toHaveBeenCalled();
  });

  it('409 template_not_approved while Meta has not approved it; nothing is written', async () => {
    h.templates.approved.mockResolvedValue(null);
    const res = await h.call({ method: 'POST', url: URL, body: BODY });
    expect(res.statusCode).toBe(409);
    expect(res.json().code).toBe('template_not_approved');
    expect(h.queries.issue).not.toHaveBeenCalled();
  });

  it('only a lesson that took place: scheduled / cancelled → 409 lesson_not_eligible; late is fine', async () => {
    for (const lessonStatus of ['scheduled', 'cancelled_by_admin', 'no_show'] as const) {
      h.queries.requestContext.mockResolvedValue(requestContext({ lessonStatus }));
      const res = await h.call({ method: 'POST', url: URL, body: BODY });
      expect([res.statusCode, res.json().code]).toEqual([409, 'lesson_not_eligible']);
    }
    h.queries.requestContext.mockResolvedValue(requestContext({ lessonStatus: 'late' }));
    expect((await h.call({ method: 'POST', url: URL, body: BODY })).statusCode).toBe(200);
  });

  it('404 for a student who is not on the lesson; 400 for a bad body', async () => {
    h.queries.requestContext.mockResolvedValue(null);
    expect((await h.call({ method: 'POST', url: URL, body: BODY })).statusCode).toBe(404);
    expect((await h.call({ method: 'POST', url: URL, body: { studentId: 'nope' } })).statusCode).toBe(400);
  });

  it('admin only: a teacher, a guardian and no login are refused', async () => {
    expect((await h.call({ method: 'POST', url: URL, body: BODY, token: 'teacher' })).statusCode).toBe(403);
    expect((await h.call({ method: 'POST', url: URL, body: BODY, token: 'guardian' })).statusCode).toBe(403);
    expect((await h.call({ method: 'POST', url: URL, body: BODY, token: null })).statusCode).toBe(401);
    expect(h.outbox.send).not.toHaveBeenCalled();
  });
});

describe('POST /lessons/:id/feedback-request without FEEDBACK_TOKEN_SECRET', () => {
  it('503 not_configured', async () => {
    const h = await feedbackApp(null);
    h.reset();
    const res = await h.call({ method: 'POST', url: URL, body: BODY });
    expect([res.statusCode, res.json().code]).toEqual([503, 'not_configured']);
    await h.app.close();
  });
});
