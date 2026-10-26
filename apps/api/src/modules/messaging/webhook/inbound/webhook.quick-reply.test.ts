import { ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { lead } from '../../../sales/leads/leads.fakes';
import { AT, event, GUARDIAN_ID, LESSON_ID, NEW_LEAD_ID, nobody, outbound, services } from '../webhook.fakes';

const guardian = { ...nobody(), guardian: { id: GUARDIAN_ID, name: 'أم سهيلة' } };
const OTHER_LESSON = '00000000-0000-4000-8000-0000000000a2';

function asGuardian() {
  const s = services();
  s.queries.identify.mockResolvedValue(guardian);
  return s;
}

describe('confirm by reply (R-SCH-03)', () => {
  it('a tapped «confirm:<lesson>» button confirms that lesson, audited as system:whatsapp', async () => {
    const s = asGuardian();
    await s.inbound.handle(event({ type: 'button', body: 'تمام، هنحضر', replyKey: `confirm:${LESSON_ID}` }));
    expect(s.lessons.confirm).toHaveBeenCalledWith({ lessonId: LESSON_ID, actor: null });
    expect(s.audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: null, entityId: LESSON_ID, after: expect.objectContaining({ actor: 'system:whatsapp' }) }),
    );
    expect(s.queries.stored[0]?.lesson_id).toBe(LESSON_ID);
  });

  it('a typed «نعم» answering our reminder confirms the reminder’s lesson', async () => {
    const s = asGuardian();
    s.queries.outboundByWaId.mockResolvedValue(outbound({ lesson_id: OTHER_LESSON }));
    await s.inbound.handle(event({ body: 'نعم', replyTo: 'wamid.OUT1' }));
    expect(s.queries.outboundByWaId).toHaveBeenCalledWith('wamid.OUT1');
    expect(s.lessons.confirm).toHaveBeenCalledWith({ lessonId: OTHER_LESSON, actor: null });
  });

  it('ignores a replied-to message sent to another phone', async () => {
    const s = asGuardian();
    s.queries.outboundByWaId.mockResolvedValue(outbound({ lesson_id: OTHER_LESSON, phone_e164: '+201001234567' }));
    s.queries.recentLessonOutbound.mockResolvedValue(LESSON_ID);
    await s.inbound.handle(event({ body: 'نعم', replyTo: 'wamid.OUT1' }));
    expect(s.lessons.confirm).toHaveBeenCalledWith({ lessonId: LESSON_ID, actor: null });
  });

  it('a plain «تمام» confirms the open lesson we messaged them about in the last 48 h', async () => {
    const s = asGuardian();
    s.queries.recentLessonOutbound.mockResolvedValue(LESSON_ID);
    await s.inbound.handle(event({ body: 'تمام' }));
    const since = new Date(AT.getTime() - 48 * 3_600_000);
    expect(s.queries.recentLessonOutbound).toHaveBeenCalledWith({ phone: '+966501234567', since });
    expect(s.lessons.confirm).toHaveBeenCalledWith({ lessonId: LESSON_ID, actor: null });
  });

  it('a shorter quick_reply_window_hours looks back less far', async () => {
    const s = asGuardian();
    s.queries.replyWindowMs.mockResolvedValue(6 * 3_600_000);
    await s.inbound.handle(event({ body: 'تمام' }));
    const since = new Date(AT.getTime() - 6 * 3_600_000);
    expect(s.queries.recentLessonOutbound).toHaveBeenCalledWith({ phone: '+966501234567', since });
  });

  it('a plain «تمام» with no lesson message in 48 h: only stored, no lesson linked', async () => {
    const s = asGuardian();
    await s.inbound.handle(event({ body: 'تمام' }));
    expect(s.lessons.confirm).not.toHaveBeenCalled();
    expect(s.queries.stored[0]?.lesson_id).toBeNull();
  });

  it('nothing to confirm for a lead or a teacher: only stored, no lookup', async () => {
    for (const who of [nobody(), { ...nobody(), teacher: { id: 't1', name: 'أ. فاطمة' } }]) {
      const s = services();
      s.queries.identify.mockResolvedValue(who);
      await s.inbound.handle(event({ body: 'تمام', replyKey: `confirm:${LESSON_ID}` }));
      expect(s.lessons.confirm).not.toHaveBeenCalled();
      expect(s.queries.recentLessonOutbound).not.toHaveBeenCalled();
      expect(s.queries.stored).toHaveLength(1);
    }
  });

  it('a payload lesson that is not theirs (or no longer exists) is neither confirmed nor linked', async () => {
    const s = asGuardian();
    s.queries.guardianLesson.mockResolvedValue(false);
    await s.inbound.handle(event({ type: 'button', body: 'تمام، هنحضر', replyKey: `confirm:${OTHER_LESSON}` }));
    expect(s.queries.guardianLesson).toHaveBeenCalledWith({ lessonId: OTHER_LESSON, guardianId: GUARDIAN_ID });
    expect(s.lessons.confirm).not.toHaveBeenCalled();
    expect(s.queries.stored).toHaveLength(1);
    expect(s.queries.stored[0]?.lesson_id).toBeNull();
    expect(s.push.notifyAdmins).toHaveBeenCalled();
  });

  it('a lesson that can no longer be confirmed is logged, not an error', async () => {
    for (const err of [new ConflictException({ code: 'invalid_transition' }), new NotFoundException()]) {
      const s = asGuardian();
      s.lessons.confirm.mockRejectedValue(err);
      await expect(s.inbound.handle(event({ replyKey: `confirm:${LESSON_ID}` }))).resolves.toBeUndefined();
      expect(s.audit.record).not.toHaveBeenCalled();
      expect(s.push.notifyAdmins).toHaveBeenCalled();
    }
  });

  it('an unexpected failure propagates (the batch logs it)', async () => {
    const s = asGuardian();
    s.lessons.confirm.mockRejectedValue(new Error('db down'));
    await expect(s.inbound.handle(event({ replyKey: `confirm:${LESSON_ID}` }))).rejects.toThrow('db down');
  });
});

describe('reschedule and stop', () => {
  it('reschedule: no lesson change, the admin gets its own push, the lesson is linked', async () => {
    const s = asGuardian();
    await s.inbound.handle(event({ body: 'محتاجين نغيّر الميعاد', replyKey: `reschedule:${LESSON_ID}` }));
    expect(s.lessons.confirm).not.toHaveBeenCalled();
    expect(s.queries.stored[0]?.lesson_id).toBe(LESSON_ID);
    expect(s.push.notifyAdmins).toHaveBeenCalledWith(
      'new_message',
      expect.objectContaining({ subject: '+966501234567:reschedule:wamid.IN1' }),
    );
  });

  it('stop from a lead: follow-ups paused (marketing opt-out), audited', async () => {
    const s = services();
    s.leads.upsertByPhone.mockResolvedValue(lead({ id: NEW_LEAD_ID }));
    await s.inbound.handle(event({ type: 'button', body: 'وقف الرسايل', replyKey: `stop:${NEW_LEAD_ID}` }));
    expect(s.queries.updateLead).toHaveBeenCalledWith(NEW_LEAD_ID, { follow_up_paused: true, follow_up_paused_by: 'lead' });
    expect(s.audit.record).toHaveBeenCalledWith(expect.objectContaining({ entity: 'leads', action: 'follow_up_paused' }));
  });

  it('stop from a guardian with no lead: stored and pushed only', async () => {
    const s = asGuardian();
    await s.inbound.handle(event({ body: 'وقف' }));
    expect(s.queries.updateLead).not.toHaveBeenCalled();
    expect(s.push.notifyAdmins).toHaveBeenCalledWith('new_message', expect.objectContaining({ subject: expect.stringContaining(':stop:') }));
  });
});
