import { HttpException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { fakeDb } from '../guardians/fake-db';
import { MEETING_ID } from './internal-meetings.fakes';
import { MeetingInviteesQueries } from './meeting-invitees.queries';

const row = { meeting_id: MEETING_ID, kind: 'staff', profile_id: 'p', display_name: 'مريم', channel: 'in_app' };

describe('MeetingInviteesQueries (R-MEET-02, migration 414)', () => {
  it("the invitee cap trigger answers 400 too_many_invitees like the fast check", async () => {
    const f = fakeDb({ meeting_invitees: [{ error: { code: 'P0001', message: 'too_many_invitees' } }] });
    const e = (await new MeetingInviteesQueries(f.db).insert([row]).catch((x: HttpException) => x)) as HttpException;
    expect([e.getStatus(), e.getResponse()]).toEqual([400, expect.objectContaining({ code: 'too_many_invitees' })]);
  });

  it("dropQueuedInvites: this meeting's queued invitation texts only, never a row being sent", async () => {
    const f = fakeDb({ messages: [{ data: [{ id: 'm1' }, { id: 'm2' }] }] });
    expect(await new MeetingInviteesQueries(f.db).dropQueuedInvites(MEETING_ID)).toBe(2);
    expect(f.argsOf('messages', 'update')?.[0]).toMatchObject({ status: 'failed', error_code: 'stale', next_attempt_at: null });
    expect(f.argsOf('messages', 'like')).toEqual(['dedup_key', `meeting_invite:${MEETING_ID}:%`]);
    const eqs = f.calls.filter((c) => c.method === 'eq').map((c) => c.args);
    expect(eqs).toEqual([['direction', 'outbound'], ['status', 'queued']]);
    expect(f.argsOf('messages', 'or')).toEqual(['error_code.is.null,error_code.neq.sending']);
  });
});
