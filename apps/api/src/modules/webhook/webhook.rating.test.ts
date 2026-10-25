import { describe, expect, it } from 'vitest';
import { AT, event, GUARDIAN_ID, LESSON_ID, nobody, outbound, services } from './webhook.fakes';
import { ratingOf } from './inbound/webhook.inbound';

// A guardian's lesson_rating tap (migration 195): stored on lesson_feedback, the inbound row kept
// (it is what reopens the 24 h window), replay-safe on the wamid.

const guardian = { ...nobody(), guardian: { id: GUARDIAN_ID, name: 'أم سهيلة' } };
const OTHER_LESSON = '00000000-0000-4000-8000-0000000000a2';

function asGuardian() {
  const s = services();
  s.queries.identify.mockResolvedValue(guardian);
  return s;
}

const tap = (over: Parameters<typeof event>[0] = {}) =>
  event({ type: 'button', body: 'جيدة', replyKey: `rate_good:${LESSON_ID}`, payload: { type: 'button' }, ...over });

describe('ratingOf', () => {
  it('our payload, else the exact button text of a template button; never typed text', () => {
    expect(ratingOf(tap())).toBe('good');
    expect(ratingOf(tap({ replyKey: 'جيدة', body: 'تحتاج تحسينًا' }))).toBe('needs_work');
    expect(ratingOf(event({ body: 'ممتازة' }))).toBeNull();
    expect(ratingOf(event({ type: 'button', body: 'تمام، هنحضر', replyKey: `confirm:${LESSON_ID}` }))).toBeNull();
  });
});

describe('webhook: lesson_rating taps', () => {
  it('the payload’s lesson (theirs) is rated; the inbound row stays, linked to the lesson', async () => {
    const s = asGuardian();
    await s.inbound.handle(tap());
    expect(s.queries.guardianLesson).toHaveBeenCalledWith({ lessonId: LESSON_ID, guardianId: GUARDIAN_ID });
    expect(s.ratings.record).toHaveBeenCalledWith({ lessonId: LESSON_ID, guardianId: GUARDIAN_ID, rating: 'good', waMessageId: 'wamid.IN1', at: AT });
    expect(s.queries.stored).toHaveLength(1);
    expect(s.queries.stored[0]).toMatchObject({ direction: 'inbound', lesson_id: LESSON_ID, body: 'جيدة' });
    expect(s.lessons.confirm).not.toHaveBeenCalled();
    expect(s.push.notifyAdmins).toHaveBeenCalledWith('new_message', expect.anything());
  });

  it('idempotent: Meta re-sending the same wamid rates once', async () => {
    const s = asGuardian();
    await s.inbound.handle(tap());
    await s.inbound.handle(tap());
    expect(s.ratings.record).toHaveBeenCalledTimes(1);
    expect(s.queries.stored).toHaveLength(1);
  });

  it('text only (no payload): the lesson of the lesson_rating message it answers', async () => {
    const s = asGuardian();
    s.queries.outboundByWaId.mockResolvedValue(outbound({ lesson_id: OTHER_LESSON, template_key: 'lesson_rating' }));
    await s.inbound.handle(tap({ replyKey: 'ممتازة', body: 'ممتازة', replyTo: 'wamid.OUT1' }));
    expect(s.ratings.record).toHaveBeenCalledWith(expect.objectContaining({ lessonId: OTHER_LESSON, rating: 'excellent' }));
  });

  it('text only answering another template, or nothing: stored, not rated, no 48 h guess', async () => {
    const s = asGuardian();
    s.queries.outboundByWaId.mockResolvedValue(outbound({ lesson_id: OTHER_LESSON, template_key: 'lesson_reminder' }));
    s.queries.recentLessonOutbound.mockResolvedValue(LESSON_ID);
    await s.inbound.handle(tap({ replyKey: 'ممتازة', body: 'ممتازة', replyTo: 'wamid.OUT1' }));
    await s.inbound.handle(tap({ waMessageId: 'wamid.IN2', replyKey: 'ممتازة', body: 'ممتازة' }));
    expect(s.queries.recentLessonOutbound).not.toHaveBeenCalled();
    expect(s.ratings.record).not.toHaveBeenCalled();
    expect(s.queries.stored).toHaveLength(2);
  });

  it('someone else’s lesson in the payload, or a sender who is not a guardian: stored only', async () => {
    const s = asGuardian();
    s.queries.guardianLesson.mockResolvedValue(false);
    await s.inbound.handle(tap());
    const lead = services();
    await lead.inbound.handle(tap());
    expect(s.ratings.record).not.toHaveBeenCalled();
    expect(lead.ratings.record).not.toHaveBeenCalled();
    expect(s.queries.stored[0]?.lesson_id).toBeNull();
  });

  it('a failed rating write unstores the row so Meta’s re-send rates again (500 path)', async () => {
    const s = asGuardian();
    s.ratings.record.mockRejectedValueOnce(new Error('db down'));
    await expect(s.inbound.handle(tap())).rejects.toThrow('db down');
    expect(s.queries.stored).toHaveLength(0);
    await s.inbound.handle(tap());
    expect(s.ratings.record).toHaveBeenCalledTimes(2);
    expect(s.queries.stored).toHaveLength(1);
  });
});
