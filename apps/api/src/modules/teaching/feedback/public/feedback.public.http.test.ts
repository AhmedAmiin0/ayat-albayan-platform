import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { EXP, GUARDIAN_PHONE, NOW, publicContext, SECRET, tokenFor } from '../feedback.fakes';
import { hashToken } from './feedback.token';
import { feedbackApp } from '../test-app';

const url = (token = tokenFor()) => `/public/feedback/${token}`;
const ANSWER = { rating: 5, recommend: 'yes', note: 'جزاكم الله خيرًا' };

describe('public «رأيك يهمّنا» page (no login)', () => {
  let h: Awaited<ReturnType<typeof feedbackApp>>;
  let visitor = 0; // each test is a new visitor: the limiter keys on the IP
  beforeAll(async () => {
    h = await feedbackApp();
  });
  afterAll(() => h.app.close());
  beforeEach(() => {
    visitor += 1;
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    h.reset();
    h.queries.byTokenHash.mockResolvedValue(publicContext());
    h.queries.answer.mockImplementation(async () => publicContext().row);
  });
  afterEach(() => vi.useRealTimers());

  const ip = () => `10.0.0.${visitor}`;
  const get = (token?: string) => h.call({ method: 'GET', url: url(token), token: null, ip: ip() });
  const post = (body: object, token?: string) => h.call({ method: 'POST', url: url(token), token: null, body, ip: ip() });

  it('GET prefill: the teacher, the kind, the phone and whether it was answered, nothing else', async () => {
    const res = await get();
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ teacherName: 'أبرار', kind: 'subscription', contactPhone: GUARDIAN_PHONE, alreadySubmitted: false });
    expect(h.queries.byTokenHash).toHaveBeenCalledWith(hashToken(tokenFor()));
  });

  it('GET on an answered link says so (200), the page shows «شكرًا»', async () => {
    h.queries.byTokenHash.mockResolvedValue(publicContext({ submitted_at: NOW.toISOString() }));
    expect((await get()).json().alreadySubmitted).toBe(true);
  });

  it('a wrong, tampered or foreign-secret token is 404 feedback_not_found and never reaches the DB', async () => {
    const [body, sig] = tokenFor().split('.') as [string, string];
    for (const t of ['garbage', `${body}.${sig.slice(0, -1)}${sig.endsWith("A") ? "B" : "A"}`, tokenFor(EXP, 't'.repeat(40)), 'a.b.c']) {
      const res = await get(t);
      expect([res.statusCode, res.json().code]).toEqual([404, 'feedback_not_found']);
    }
    expect(h.queries.byTokenHash).not.toHaveBeenCalled();
    expect((await post(ANSWER, 'garbage')).statusCode).toBe(404);
    expect(h.queries.answer).not.toHaveBeenCalled();
  });

  it('an expired link is 410 feedback_expired, GET and POST', async () => {
    vi.setSystemTime(new Date((EXP + 1) * 1000));
    for (const res of [await get(), await post(ANSWER)]) {
      expect([res.statusCode, res.json().code]).toEqual([410, 'feedback_expired']);
    }
  });

  it('a link replaced by a resend (its hash is gone) is 404, not a way in', async () => {
    h.queries.byTokenHash.mockResolvedValue(null);
    expect((await get()).statusCode).toBe(404);
    expect((await post(ANSWER)).statusCode).toBe(404);
  });

  it('a token that names another lesson than its row is refused', async () => {
    h.queries.byTokenHash.mockResolvedValue(publicContext({ lesson_id: '00000000-0000-4000-8000-0000000000ee' }));
    expect((await get()).statusCode).toBe(404);
  });

  it('POST saves the answer once; teacher and kind come from the row, never from the body', async () => {
    const res = await post({ ...ANSWER, kind: 'trial', teacherId: 'x', teacher_id: 'x', contactPhone: '0501234567' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ submitted: true });
    expect(h.queries.answer).toHaveBeenCalledOnce();
    const [id, patch] = h.queries.answer.mock.calls[0] ?? [];
    expect(id).toBe(publicContext().row.id);
    expect(patch).toEqual({
      rating: 5,
      recommend: 'yes',
      note: 'جزاكم الله خيرًا',
      contact_phone: '+966501234567',
      submitted_at: NOW.toISOString(),
    });
  });

  it('POST without a phone keeps the one the link went to', async () => {
    await post({ rating: 3, recommend: 'maybe' });
    expect(h.queries.answer.mock.calls[0]?.[1]).toMatchObject({ contact_phone: GUARDIAN_PHONE, note: null });
  });

  it('a second answer is 409 already_submitted: before the write, and when it loses the race', async () => {
    h.queries.byTokenHash.mockResolvedValue(publicContext({ submitted_at: NOW.toISOString() }));
    const first = await post(ANSWER);
    expect([first.statusCode, first.json().code]).toEqual([409, 'already_submitted']);
    expect(h.queries.answer).not.toHaveBeenCalled();
    h.queries.byTokenHash.mockResolvedValue(publicContext());
    h.queries.answer.mockResolvedValue(null);
    expect((await post(ANSWER)).statusCode).toBe(409);
  });

  it('the required answers are checked: rating 1-5 and a recommend choice', async () => {
    for (const bad of [{}, { rating: 6, recommend: 'yes' }, { rating: 0, recommend: 'yes' }, { rating: 4 }, { rating: 4, recommend: 'sure' }, { rating: 4.5, recommend: 'no' }]) {
      expect((await post(bad)).statusCode).toBe(400);
    }
    expect((await post({ ...ANSWER, contactPhone: 'abc' })).statusCode).toBe(400);
    expect((await post({ ...ANSWER, note: 'x'.repeat(2001) })).statusCode).toBe(400);
    expect(h.queries.answer).not.toHaveBeenCalled();
  });

  it('is not usable at all while the secret is unset (every link is 404)', async () => {
    const off = await feedbackApp(null);
    off.reset();
    expect((await off.call({ method: 'GET', url: url(tokenFor(EXP, SECRET)), token: null })).statusCode).toBe(404);
    await off.app.close();
  });
});
