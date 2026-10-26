import { describe, expect, it } from 'vitest';
import { LessonEvents } from '../../../../common/events/lesson-events';
import { fakeDb } from '../../../people/guardians/fake-db';
import { fakePolicy, type FakePolicyInput } from '../../../messaging/notification-rules/policy/policy.fakes';
import type { ChangeSet, QueuedMessage, TimeEditChange } from '../../scheduling/change-set';
import { LessonWriter } from '../../scheduling/occurrences/lesson-writer';
import type { BookingPayload } from './booking.mapper';
import { BookingQueries } from './booking.queries';
import { CourseChangeWriter } from '../course-change/course-change.writer';

// The booking_confirmation rule at each write that carries confirmations (create_booking,
// apply_lesson_changes, edit_lesson_time, change_course): on = the payload unchanged; off = no confirmation.

const OFF: FakePolicyInput = { mode: 'module', rows: [{ key: 'booking_confirmation', enabled: false }] };
const msg = { phone_e164: '+966500000001', guardian_id: 'g1', lesson_id: 'l1', template_key: 'booking_confirmation', template_params: {}, dedup_key: 'booking_confirmation:l1:g1' } satisfies QueuedMessage;
const BOOKED = { rule_id: 'R1', student_ids: [], guardian_ids: [], lessons: [], message_ids: [], invoice_id: null };

const rpcArg = (calls: { table: string; args: unknown[] }[], fn: string) => calls.find((c) => c.table === `rpc:${fn}`)?.args[0];

describe('booking_confirmation at the writes', () => {
  it.each([
    ['legacy, no rows', {}, [msg]],
    ['the rule off', OFF, []],
    ['rules unreadable', { fail: true }, []],
  ])('apply_lesson_changes — %s', async (_name, rules, messages) => {
    const { db, calls } = fakeDb({ 'rpc:apply_lesson_changes': [{ data: null }] });
    const change: ChangeSet = { actor: 'a1', lessons: [], messages: [msg] };
    await new LessonWriter(db, fakePolicy(rules)).apply(change);
    expect(rpcArg(calls, 'apply_lesson_changes')).toEqual({ p: { ...change, messages } });
  });

  it('apply_lesson_changes without messages: the change set as it was (no key added)', async () => {
    const { db, calls } = fakeDb({ 'rpc:apply_lesson_changes': [{ data: null }] });
    await new LessonWriter(db, fakePolicy(OFF)).apply({ actor: null, changes: [] });
    expect(rpcArg(calls, 'apply_lesson_changes')).toEqual({ p: { actor: null, changes: [] } });
  });

  it('edit_lesson_time — the rule off drops the confirmation', async () => {
    const { db, calls } = fakeDb({ 'rpc:edit_lesson_time': [{ data: null }] });
    const change = { lesson_id: 'l1', messages: [msg] } as unknown as TimeEditChange;
    await new LessonWriter(db, fakePolicy(OFF)).retime(change);
    expect(rpcArg(calls, 'edit_lesson_time')).toEqual({ p: { ...change, messages: [] } });
    const on = fakeDb({ 'rpc:edit_lesson_time': [{ data: null }] });
    await new LessonWriter(on.db, fakePolicy()).retime(change);
    expect(rpcArg(on.calls, 'edit_lesson_time')).toEqual({ p: change });
  });

  it.each([
    ['legacy, no rows', {}, [msg]],
    ['the rule off', OFF, []],
  ])('create_booking — %s', async (_name, rules, messages) => {
    const { db, calls } = fakeDb({ 'rpc:create_booking': [{ data: BOOKED }] });
    const payload = { rule: {}, messages: [msg] } as unknown as BookingPayload;
    await new BookingQueries(db, fakePolicy(rules)).createBooking(payload, 'actor');
    expect(rpcArg(calls, 'create_booking')).toEqual({ p_booking: { ...payload, messages }, p_actor: 'actor' });
  });

  it.each([
    ['legacy, no rows', {}, [msg]],
    ['the rule off', OFF, []],
  ])('change_course — %s', async (_name, rules, messages) => {
    const { db, calls } = fakeDb({ 'rpc:change_course': [{ data: { rule_ids: ['r2'], ends_on: null } }] });
    const payload = { actor: 'a1', messages: [msg] };
    await new CourseChangeWriter(db, new LessonEvents(), fakePolicy(rules)).apply({ payload, subscriptionId: 's1', moved: [] });
    expect(rpcArg(calls, 'change_course')).toEqual({ p: { ...payload, messages } });
  });
});
