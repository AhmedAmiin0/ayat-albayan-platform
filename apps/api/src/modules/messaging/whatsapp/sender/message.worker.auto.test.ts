import { TEMPLATE_KEYS } from '@ab/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PushService } from '../../../../common/push/push.service';
import type { MessageDispatch } from './message.dispatch';
import { MessageWorker } from './message.worker';
import { SENDING } from './send-plan';
import { AUTOMATIC_KEYS, isAutomatic } from './send-stale';
import { dueMessage } from './sender.fakes';
import type { SenderQueries } from './sender.queries';
import { templateRow } from '../whatsapp.fakes';

// The automatic-messages hold (settings.auto_messages_enabled, migration 162, docs/09 cut-over).

const queries = { claim: vi.fn(), sent: vi.fn(), failure: vi.fn(), expire: vi.fn(), staffAtSend: vi.fn() };
const dispatch = { send: vi.fn(), ready: vi.fn(), multi: false };
const push = { notifyAdmins: vi.fn() };
const NOW = new Date('2026-10-02T08:00:00Z');
const ADMIN = 'a0000000-0000-4000-8000-000000000001';
const template = templateRow({ key: 'lesson_reminder', meta_name: 'lesson_reminder_v2' });
const AUTO_OFF = { code: 'auto_off', text: 'automatic messages are off in settings' };

const reminder = (over: Parameters<typeof dueMessage>[0] = {}) =>
  dueMessage({ template_key: 'lesson_reminder', dedup_key: 'lesson_reminder:l1:g1', ...over });

function worker() {
  const w = new MessageWorker(queries as unknown as SenderQueries, dispatch as unknown as MessageDispatch, push as unknown as PushService);
  w.wait = vi.fn(async () => undefined);
  return w;
}

describe('isAutomatic: job-made reminders, classroom links, follow-ups, renewals and lesson ratings', () => {
  it.each([
    'lesson_reminder',
    'lesson_reminder_meet',
    'lesson_reminder_plain',
    'lesson_reminder_24h',
    'teacher_lesson_reminder',
    'teacher_lesson_reminder_meet',
    'lesson_join_link',
    'follow_up_slots',
    'renewal_due',
    'lesson_rating',
  ])('%s queued by a job (created_by null) is automatic; sent by an admin it is not', (key) => {
    expect(isAutomatic({ template_key: key, created_by: null })).toBe(true);
    expect(isAutomatic({ template_key: key, created_by: ADMIN })).toBe(false);
  });

  it.each(['booking_confirmation', 'booking_confirmation_meet', 'report_ready', 'lesson_feedback_request', null])('%s is never automatic', (key) => {
    expect(isAutomatic({ template_key: key, created_by: null })).toBe(false);
  });

  it('every registry key is classified: a new key fails here until it is automatic or sent on an action', () => {
    // Sent because someone acted in the app: a booking made, a report a teacher submitted, the admin's «أرسل طلب الرأي».
    // lesson_join_link is both: the reminders job's (settings.meeting_link_auto) is automatic, the admin's send carries created_by.
    const onAction = ['booking_confirmation', 'booking_confirmation_meet', 'booking_confirmation_plain', 'report_ready', 'lesson_feedback_request', 'teacher_new_student'];
    // A schedule change a person made (owner 2026-10-30): never held by the automatic switch.
    onAction.push('lesson_rescheduled', 'lesson_cancelled', 'course_paused', 'course_resumed');
    expect([...AUTOMATIC_KEYS, ...onAction].sort()).toEqual([...TEMPLATE_KEYS].sort());
  });

  it('the schedule-change notices are not automatic, even job-made (a resume by the daily job)', () => {
    for (const key of ['lesson_rescheduled', 'lesson_cancelled', 'course_paused', 'course_resumed']) {
      expect(isAutomatic({ template_key: key, created_by: null }), key).toBe(false);
    }
  });
});

describe('MessageWorker — automatic messages OFF', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    queries.claim.mockResolvedValue(1);
    queries.sent.mockResolvedValue(true);
    dispatch.send.mockResolvedValue({ waMessageId: 'wamid.1' });
    dispatch.ready.mockReturnValue(true);
  });

  it.each([
    ['a same-day reminder', reminder()],
    ['a follow-up', dueMessage({ template_key: 'follow_up_slots', lesson_id: null, lesson: null })],
    ['a renewal reminder', dueMessage({ template_key: 'renewal_due', lesson_id: null, lesson: null })],
  ])('%s queued by a job is held: failed «auto_off», never claimed or sent, no push', async (_name, row) => {
    await expect(worker().process({ row, template, now: NOW, autoOn: false })).resolves.toBe('held');
    expect(queries.expire).toHaveBeenCalledWith(row.id, AUTO_OFF);
    expect(queries.claim).not.toHaveBeenCalled();
    expect(dispatch.send).not.toHaveBeenCalled();
    expect(push.notifyAdmins).not.toHaveBeenCalled();
  });

  it('the same reminder sent by an admin from the inbox still goes', async () => {
    const row = reminder({ created_by: ADMIN, dedup_key: 'admin:5f0c' });
    await expect(worker().process({ row, template, now: NOW, autoOn: false })).resolves.toBe('sent');
    expect(queries.expire).not.toHaveBeenCalled();
    expect(dispatch.send).toHaveBeenCalledWith(row, template, 'notifications');
  });

  it('booking confirmations and session texts are not automatic: they go', async () => {
    const booking = templateRow();
    await expect(worker().process({ row: dueMessage(), template: booking, now: NOW, autoOn: false })).resolves.toBe('sent');
    const text = dueMessage({ id: 'm2', template_key: null, body: 'وعليكم السلام', created_by: ADMIN });
    await expect(worker().process({ row: text, template: null, now: NOW, autoOn: false })).resolves.toBe('sent');
    expect(queries.expire).not.toHaveBeenCalled();
  });

  it('switch ON: the job-made reminder is sent exactly as before', async () => {
    await expect(worker().process({ row: reminder(), template, now: NOW, autoOn: true })).resolves.toBe('sent');
    expect(queries.expire).not.toHaveBeenCalled();
  });

  it('expired and stale win over the hold (their reason is the truer one)', async () => {
    const late = reminder({ lesson: { starts_at: '2026-10-02T07:59:00Z', status: 'scheduled' } });
    await expect(worker().process({ row: late, template, now: NOW, autoOn: false })).resolves.toBe('expired');
    const cancelled = reminder({ lesson: { starts_at: '2026-10-04T14:00:00Z', status: 'cancelled_by_admin' } });
    await expect(worker().process({ row: cancelled, template, now: NOW, autoOn: false })).resolves.toBe('stale');
    expect(queries.expire).not.toHaveBeenCalledWith(expect.anything(), AUTO_OFF);
  });

  it('a try already made (SENDING) is not held: Meta may have sent it, the admin is asked', async () => {
    const row = reminder({ error_code: SENDING, attempts: 1 });
    await expect(worker().process({ row, template, now: NOW, autoOn: false })).resolves.toBe('failed');
    expect(queries.expire).not.toHaveBeenCalled();
    expect(queries.failure).toHaveBeenCalledWith(row.id, expect.objectContaining({ error_code: 'uncertain' }));
  });
});
