import { HttpException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import { ADMIN, CONFIG, OTHER_TEACHER, TEACHER } from './classroom.fakes';
import { MEETING_ID, meetingQueries, meetingRow, NOW } from './internal-meetings.fakes';
import type { InternalMeetingsQueries } from './internal-meetings.queries';
import { InternalMeetingsService } from './internal-meetings.service';
import { hashMeetingToken } from './internal-meetings.token';
import { LivekitApi } from './livekit-api';
import { http } from './moderation.fakes';

const ORIGIN = 'https://app.example.test';
let mq: ReturnType<typeof meetingQueries>;
let post: ReturnType<typeof http>;
const service = (config: typeof CONFIG | null = CONFIG) =>
  new InternalMeetingsService(mq as unknown as InternalMeetingsQueries, new LivekitApi(config, post), ORIGIN);
const fail = async (p: Promise<unknown>) => (await p.catch((e: HttpException) => e)) as HttpException;
const tokenOf = (url: string) => url.slice(`${ORIGIN}/m/`.length);

beforeEach(() => {
  mq = meetingQueries();
  post = http();
});

describe('InternalMeetingsService', () => {
  it('create: a /m/<token> link, only its hash stored, the default title when none is typed', async () => {
    const r = await service().create({ user: TEACHER, body: {} });
    expect(r.id).toBe(MEETING_ID);
    expect(r.url).toMatch(/^https:\/\/app\.example\.test\/m\/[A-Za-z0-9_-]{43}$/);
    expect(mq.insert).toHaveBeenCalledWith({ title: 'اجتماع', createdBy: TEACHER.id, hash: hashMeetingToken(tokenOf(r.url)) });
    await service().create({ user: ADMIN, body: { title: ' مراجعة الأسبوع ' } });
    expect(mq.insert).toHaveBeenLastCalledWith(expect.objectContaining({ title: 'مراجعة الأسبوع' }));
    expect(post).not.toHaveBeenCalled();
  });

  it('create: 400 for a bad title', async () => {
    expect((await fail(service().create({ user: TEACHER, body: { title: 'x'.repeat(61) } }))).getStatus()).toBe(400);
  });

  it('list: everyone for an admin, the caller own otherwise, with state and can_manage', async () => {
    mq.latest.mockResolvedValue([meetingRow(), meetingRow({ id: 'm2', created_by: ADMIN.id, ends_at: '2026-10-05T09:30:00Z' })]);
    const all = await service().list(ADMIN, NOW);
    expect(mq.latest).toHaveBeenCalledWith(null);
    expect(all.map((m) => [m.state, m.can_manage])).toEqual([['open', true], ['ended', true]]);
    const own = await service().list(TEACHER, NOW);
    expect(mq.latest).toHaveBeenLastCalledWith(TEACHER.id);
    expect(own.map((m) => m.can_manage)).toEqual([true, false]);
  });

  it('end: the creator or an admin; stamps ends_at and closes the LiveKit room', async () => {
    await service().end({ user: TEACHER, id: MEETING_ID }, NOW);
    expect(mq.end).toHaveBeenCalledWith(MEETING_ID, NOW.toISOString());
    const [url, init] = post.mock.calls[0] ?? [];
    expect(url).toBe('https://livekit.example.test/twirp/livekit.RoomService/DeleteRoom');
    expect(JSON.parse(init?.body ?? '{}')).toEqual({ room: `meeting-${MEETING_ID}` });
    await service(null).end({ user: ADMIN, id: MEETING_ID }, NOW);
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('end: 403 for another staff login, 404 for an unknown meeting', async () => {
    expect((await fail(service().end({ user: OTHER_TEACHER, id: MEETING_ID }, NOW))).getStatus()).toBe(403);
    mq.byId.mockResolvedValueOnce(null);
    expect((await fail(service().end({ user: ADMIN, id: MEETING_ID }, NOW))).getResponse()).toMatchObject({ code: 'meeting_not_found' });
    expect(mq.end).not.toHaveBeenCalled();
  });

  it('newLink: replaces the hash with a fresh link; 403 for others', async () => {
    const r = await service().newLink({ user: ADMIN, id: MEETING_ID });
    expect(mq.rotate).toHaveBeenCalledWith(MEETING_ID, hashMeetingToken(tokenOf(r.url)));
    expect((await fail(service().newLink({ user: OTHER_TEACHER, id: MEETING_ID }))).getStatus()).toBe(403);
  });
});
