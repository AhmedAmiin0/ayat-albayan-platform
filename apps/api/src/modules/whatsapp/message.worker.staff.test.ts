import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PushService } from '../../common/push/push.service';
import { fakeDb, type FakeResult } from '../guardians/fake-db';
import type { MessageDispatch } from './message.dispatch';
import { MessageWorker } from './message.worker';
import { dueMessage } from './sender.fakes';
import type { DueMessage, SenderQueries } from './sender.queries';
import { staffAtSend } from './staff-at-send';
import { templateRow } from './whatsapp.fakes';

// Review of #172 (PR #175 «Not fixed»): a staff alert queued while the send gate was closed is
// checked again when sent; the teacher made inactive or disabled meanwhile hears nothing.
const TEACHER = 'a0000000-0000-4000-8000-000000000001';
const PHONE = '+966500000001';
const NOW = new Date('2026-10-02T08:00:00Z');
const dispatch = { send: vi.fn(), ready: vi.fn(() => true), multi: false };
const queries = { claim: vi.fn(async () => 1), sent: vi.fn(async () => true), failure: vi.fn(), expire: vi.fn(), staffAtSend: vi.fn() };
const teacherRow = (over: Partial<DueMessage> = {}) =>
  dueMessage({ phone_e164: PHONE, template_key: 'teacher_lesson_reminder', dedup_key: `teacher_lesson_reminder:l1:${TEACHER}`, ...over });

function run(row: DueMessage, teachers: FakeResult) {
  const { db, calls } = fakeDb({ teachers: [teachers] });
  queries.staffAtSend.mockImplementation((r: DueMessage) => staffAtSend(db, r));
  const w = new MessageWorker(queries as unknown as SenderQueries, dispatch as unknown as MessageDispatch, {} as PushService);
  return { calls, outcome: w.process({ row, template: templateRow({ key: row.template_key ?? '' }), now: NOW, autoOn: true }) };
}

describe('staff WhatsApp checked at send time', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dispatch.send.mockResolvedValue({ waMessageId: 'wamid.1' });
  });

  it('queued → teacher made inactive → not sent: failed «stale» with the reason', async () => {
    const { outcome, calls } = run(teacherRow(), { data: [{ status: 'inactive', phone_e164: PHONE, profile: null }] });
    await expect(outcome).resolves.toBe('stale');
    expect(calls).toContainEqual({ table: 'teachers', method: 'eq', args: ['id', TEACHER] });
    expect(queries.expire).toHaveBeenCalledWith(expect.any(String), { code: 'stale', text: 'teacher inactive or login disabled' });
    expect(dispatch.send).not.toHaveBeenCalled();
  });

  it('queued → login disabled, removed, or a new number → not sent', async () => {
    const disabled = { status: 'active', phone_e164: PHONE, profile: { disabled_at: '2026-10-01T00:00:00Z' } };
    for (const [teachers, text] of [
      [{ data: [disabled] }, 'teacher inactive or login disabled'],
      [{ data: [] }, 'teacher not on record'],
      [{ data: [{ status: 'active', phone_e164: '+966500000009', profile: null }] }, 'teacher number changed'],
    ] as const) {
      vi.clearAllMocks();
      await expect(run(teacherRow({ template_key: 'teacher_new_student' }), teachers).outcome).resolves.toBe('stale');
      expect(queries.expire).toHaveBeenCalledWith(expect.any(String), { code: 'stale', text });
    }
    expect(dispatch.send).not.toHaveBeenCalled();
  });

  it('queued → teacher still active → sent', async () => {
    const { outcome } = run(teacherRow(), { data: [{ status: 'active', phone_e164: PHONE, profile: { disabled_at: null } }] });
    await expect(outcome).resolves.toBe('sent');
    expect(dispatch.send).toHaveBeenCalledTimes(1);
  });

  it('no teacher id in the key: found by the number it goes to', async () => {
    const { outcome, calls } = run(teacherRow({ dedup_key: null }), { data: [{ status: 'active', phone_e164: PHONE, profile: null }] });
    await expect(outcome).resolves.toBe('sent');
    expect(calls).toContainEqual({ table: 'teachers', method: 'eq', args: ['phone_e164', PHONE] });
  });

  it('the teacher read fails → not sent this pass (skipped, still queued)', async () => {
    await expect(run(teacherRow(), { error: { message: 'down' } }).outcome).resolves.toBe('skipped');
    expect(dispatch.send).not.toHaveBeenCalled();
    expect(queries.expire).not.toHaveBeenCalled();
  });

  it('a guardian’s / family’s row is unchanged: no teacher read, sent', async () => {
    const { outcome, calls } = run(dueMessage({ template_key: 'lesson_reminder' }), {});
    await expect(outcome).resolves.toBe('sent');
    expect(calls.some((c) => c.table === 'teachers')).toBe(false);
  });
});
