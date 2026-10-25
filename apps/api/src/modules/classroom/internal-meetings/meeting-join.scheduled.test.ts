import { HttpException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import { CONFIG, queries, SALES, TEACHER } from '../classroom.fakes';
import { MEETING_ID, MEETING_TOKEN, meetingQueries, NOW, scheduledRow } from './internal-meetings.fakes';
import { InternalMeetingJoinService } from './internal-meetings.join.service';
import type { InternalMeetingsQueries } from './internal-meetings.queries';
import { hashMeetingToken } from './internal-meetings.token';
import { PublicJoinLimit } from '../join/join-limit';
import { admissionOf } from '../moderation.fakes';

let mq: ReturnType<typeof meetingQueries>;
const service = () => new InternalMeetingJoinService(mq as unknown as InternalMeetingsQueries, new PublicJoinLimit(), admissionOf({ q: queries(), config: CONFIG }));
const fail = async (p: Promise<unknown>) => (await p.catch((e: HttpException) => e)) as HttpException;
const at = (iso: string) => new Date(iso);
let ip = 0;
const guest = (now: Date) => service().guest({ token: MEETING_TOKEN, ip: `9.9.8.${++ip}`, body: { name: 'ضيف' } }, now);

beforeEach(() => {
  mq = meetingQueries();
  mq.byId.mockResolvedValue(scheduledRow());
  mq.byHash.mockResolvedValue(scheduledRow());
});

describe('scheduled meeting: the join window (R-MEET-01)', () => {
  it('staff: 403 join_not_open_yet before 11:45 (with opens_at), 200 inside, 410 after 15:00', async () => {
    const early = await fail(service().staff({ user: SALES, id: MEETING_ID }, NOW));
    expect([early.getStatus(), early.getResponse()]).toEqual([403, expect.objectContaining({ code: 'join_not_open_yet', opens_at: '2026-10-05T11:45:00.000Z' })]);
    expect((await service().staff({ user: TEACHER, id: MEETING_ID }, at('2026-10-05T11:45:00Z'))).role).toBe('teacher');
    expect((await fail(service().staff({ user: SALES, id: MEETING_ID }, at('2026-10-05T15:01:00Z')))).getStatus()).toBe(410);
  });

  it('guest: the same window; the public view says when it opens', async () => {
    expect((await fail(guest(NOW))).getStatus()).toBe(403);
    expect((await guest(at('2026-10-05T12:30:00Z'))).role).toBe('guest');
    const view = await service().view({ token: MEETING_TOKEN, ip: '9.9.7.1' }, NOW);
    expect(view).toEqual({ title: 'اجتماع الإدارة', state: 'open', starts_at: '2026-10-05T12:00:00.000Z', opens_at: '2026-10-05T11:45:00.000Z' });
  });

  it('an instant meeting has no window: open now, no opens_at', async () => {
    mq.byHash.mockResolvedValue(scheduledRow({ starts_at: null, planned_end_at: null }));
    expect(await service().view({ token: MEETING_TOKEN, ip: '9.9.7.2' }, NOW)).toMatchObject({ state: 'open', starts_at: null, opens_at: null });
    expect((await guest(NOW)).role).toBe('guest');
  });

  it('a personal invitee link enters the same room; cancelled → 410 for everyone', async () => {
    mq.byHash.mockResolvedValue(null);
    mq.byInviteHash.mockResolvedValue(scheduledRow());
    expect((await guest(at('2026-10-05T12:00:00Z'))).room).toBe(`meeting-${MEETING_ID}`);
    expect(mq.byInviteHash).toHaveBeenCalledWith(hashMeetingToken(MEETING_TOKEN));
    mq.byInviteHash.mockResolvedValue(scheduledRow({ cancelled_at: '2026-10-05T11:00:00Z' }));
    const gone = await fail(guest(at('2026-10-05T12:00:00Z')));
    expect([gone.getStatus(), gone.getResponse()]).toEqual([410, expect.objectContaining({ code: 'meeting_ended' })]);
    mq.byInviteHash.mockResolvedValue(null);
    expect((await fail(guest(at('2026-10-05T12:00:00Z')))).getResponse()).toMatchObject({ code: 'link_invalid' });
  });
});
