import { HttpException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import { ADMIN, CONFIG, OTHER_TEACHER, TEACHER } from '@/modules/teaching/classroom/classroom.fakes';
import { MEETING_ID, meetingQueries, meetingRow, NOW, scheduledRow } from './internal-meetings.fakes';
import type { InternalMeetingsRepo } from './internal-meetings.repo';
import { InternalMeetingsService } from './internal-meetings.service';
import { hashMeetingToken } from './internal-meetings.token';
import { LivekitApi } from '@/modules/teaching/classroom/livekit/livekit-api';
import { sentBody } from '@/modules/teaching/classroom/livekit/livekit.fakes';
import { http } from '@/modules/teaching/classroom/moderation/moderation.fakes';

const ORIGIN = 'https://app.example.test';
let mq: ReturnType<typeof meetingQueries>;
let post: ReturnType<typeof http>;
const service = (config: typeof CONFIG | null = CONFIG) =>
  new InternalMeetingsService(mq as unknown as InternalMeetingsRepo, new LivekitApi(config, post), ORIGIN);
const fail = async (p: Promise<unknown>) => (await p.catch((e: HttpException) => e)) as HttpException;
const tokenOf = (url: string) => url.slice(`${ORIGIN}/m/`.length);

beforeEach(() => {
  mq = meetingQueries();
  post = http();
});

describe('InternalMeetingsService', () => {
  it('end: the creator or an admin; stamps ends_at and closes the LiveKit room', async () => {
    await service().end({ user: TEACHER, id: MEETING_ID }, NOW);
    expect(mq.end).toHaveBeenCalledWith(MEETING_ID, NOW.toISOString());
    const [url, init] = post.mock.calls[0] ?? [];
    expect(url).toBe('https://livekit.example.test/twirp/livekit.RoomService/DeleteRoom');
    expect(sentBody(init)).toEqual({ room: `meeting-${MEETING_ID}` });
    await service(null).end({ user: ADMIN, id: MEETING_ID }, NOW);
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('end: 403 for another staff login, 404 for an unknown meeting', async () => {
    expect((await fail(service().end({ user: OTHER_TEACHER, id: MEETING_ID }, NOW))).getStatus()).toBe(403);
    mq.byId.mockResolvedValueOnce(null);
    expect((await fail(service().end({ user: ADMIN, id: MEETING_ID }, NOW))).getResponse()).toMatchObject({ code: 'meeting_not_found' });
    expect(mq.end).not.toHaveBeenCalled();
  });

  it('end: 409 meeting_not_started for a scheduled meeting before its window; inside it, it ends', async () => {
    mq.byId.mockResolvedValueOnce(scheduledRow());
    const e = await fail(service().end({ user: TEACHER, id: MEETING_ID }, NOW));
    expect([e.getStatus(), e.getResponse()]).toEqual([409, expect.objectContaining({ code: 'meeting_not_started' })]);
    expect(post).not.toHaveBeenCalled();
    mq.byId.mockResolvedValueOnce(scheduledRow());
    await service().end({ user: TEACHER, id: MEETING_ID }, new Date('2026-10-05T12:10:00Z'));
    expect(mq.end).toHaveBeenCalledTimes(1);
  });

  it('newLink: replaces the hash with a fresh link; 403 for others, 410 once ended or cancelled', async () => {
    const r = await service().newLink({ user: ADMIN, id: MEETING_ID });
    expect(mq.rotate).toHaveBeenCalledWith(MEETING_ID, hashMeetingToken(tokenOf(r.url)));
    expect((await fail(service().newLink({ user: OTHER_TEACHER, id: MEETING_ID }))).getStatus()).toBe(403);
    mq.byId.mockResolvedValueOnce(meetingRow({ ends_at: '2026-10-05T09:30:00Z' }));
    expect((await fail(service().newLink({ user: ADMIN, id: MEETING_ID }, NOW))).getResponse()).toMatchObject({ code: 'meeting_ended' });
    mq.byId.mockResolvedValueOnce(meetingRow({ cancelled_at: '2026-10-05T09:30:00Z' }));
    expect((await fail(service().newLink({ user: ADMIN, id: MEETING_ID }, NOW))).getStatus()).toBe(410);
  });
});
