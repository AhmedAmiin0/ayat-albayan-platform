import { HttpException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import { ADMIN, ASSISTANT, CONFIG, decode, GUARDIAN, OTHER_TEACHER, queries, TEACHER } from './classroom.fakes';
import { MEETING_ID, MEETING_TOKEN, meetingQueries, meetingRow, NOW } from './internal-meetings.fakes';
import { InternalMeetingJoinService } from './internal-meetings.join.service';
import type { InternalMeetingsQueries } from './internal-meetings.queries';
import { hashMeetingToken } from './internal-meetings.token';
import { PublicJoinLimit } from './join/join-limit';
import { admissionOf } from './moderation.fakes';

let mq: ReturnType<typeof meetingQueries>;
let cq: ReturnType<typeof queries>;
const service = (config: typeof CONFIG | null = CONFIG) =>
  new InternalMeetingJoinService(mq as unknown as InternalMeetingsQueries, new PublicJoinLimit(), admissionOf({ q: cq, config }));
const fail = async (p: Promise<unknown>) => (await p.catch((e: HttpException) => e)) as HttpException;
const guest = (svc = service(), token = MEETING_TOKEN) => svc.guest({ token, ip: '9.9.9.9', body: { name: 'ضيف' } }, NOW);

beforeEach(() => {
  mq = meetingQueries();
  cq = queries();
});

describe('internal meeting: staff join', () => {
  it('mints a token in meeting-<id>; the creator hosts as teacher', async () => {
    const r = await service().staff({ user: TEACHER, id: MEETING_ID }, NOW);
    expect(r).toMatchObject({ room: `meeting-${MEETING_ID}`, role: 'teacher', url: CONFIG.url });
    const c = decode(r.token);
    expect(c.validSignature).toBe(true);
    expect(c.name).toBe('نور');
    expect(c.sub.startsWith('teacher-')).toBe(true);
    expect(JSON.parse(c.metadata ?? '')).toEqual({ role: 'teacher' });
  });

  it('admin joins as admin, another staff login with its own role', async () => {
    expect((await service().staff({ user: ADMIN, id: MEETING_ID }, NOW)).role).toBe('admin');
    expect((await service().staff({ user: ASSISTANT, id: MEETING_ID }, NOW)).role).toBe('assistant');
    expect((await service().staff({ user: OTHER_TEACHER, id: MEETING_ID }, NOW)).role).toBe('teacher');
  });

  it('404 unknown, 410 ended or revoked, 403 a guardian, 503 without LiveKit', async () => {
    mq.byId.mockResolvedValueOnce(null);
    expect((await fail(service().staff({ user: ADMIN, id: MEETING_ID }, NOW))).getStatus()).toBe(404);
    mq.byId.mockResolvedValueOnce(meetingRow({ ends_at: '2026-10-05T09:30:00Z' }));
    const ended = await fail(service().staff({ user: ADMIN, id: MEETING_ID }, NOW));
    expect([ended.getStatus(), ended.getResponse()]).toEqual([410, { code: 'meeting_ended', message: 'meeting_ended' }]);
    mq.byId.mockResolvedValueOnce(meetingRow({ revoked: true }));
    expect((await fail(service().staff({ user: TEACHER, id: MEETING_ID }, NOW))).getStatus()).toBe(410);
    expect((await fail(service().staff({ user: GUARDIAN, id: MEETING_ID }, NOW))).getStatus()).toBe(403);
    const off = await fail(service(null).staff({ user: ADMIN, id: MEETING_ID }, NOW));
    expect(off.getResponse()).toMatchObject({ code: 'classroom_not_configured' });
  });
});

describe('internal meeting: the public link', () => {
  it('shows the title and state, found by the hash, without LiveKit', async () => {
    expect(await service(null).view({ token: MEETING_TOKEN, ip: '1.1.1.1' }, NOW)).toEqual({ title: 'اجتماع الإدارة', state: 'open', starts_at: null, opens_at: null });
    expect(mq.byHash).toHaveBeenCalledWith(hashMeetingToken(MEETING_TOKEN));
    mq.byHash.mockResolvedValueOnce(meetingRow({ ends_at: NOW.toISOString() }));
    expect((await service().view({ token: MEETING_TOKEN, ip: '1.1.1.1' }, NOW)).state).toBe('ended');
  });

  it('404 link_invalid for a malformed or unknown token (no lookup for a malformed one)', async () => {
    expect((await fail(service().view({ token: 'nope', ip: '1.1.1.1' }, NOW))).getResponse()).toMatchObject({ code: 'link_invalid' });
    expect(mq.byHash).not.toHaveBeenCalled();
    mq.byHash.mockResolvedValueOnce(null);
    expect((await fail(guest())).getStatus()).toBe(404);
  });

  it('guest join: a guest token with the typed name; 410 once ended or revoked', async () => {
    const r = await guest();
    expect(r).toMatchObject({ role: 'guest', room: `meeting-${MEETING_ID}` });
    expect(decode(r.token).name).toBe('ضيف');
    expect(decode(r.token).video.canPublishSources).toEqual(['camera', 'microphone']);
    mq.byHash.mockResolvedValueOnce(meetingRow({ ends_at: '2026-10-05T09:00:00Z' }));
    expect((await fail(guest())).getResponse()).toMatchObject({ code: 'meeting_ended' });
    mq.byHash.mockResolvedValueOnce(meetingRow({ revoked: true }));
    expect((await fail(guest())).getStatus()).toBe(410);
  });

  it('guest join: 400 without a name, 503 without LiveKit, 429 past the limit', async () => {
    const noName = await fail(service().guest({ token: MEETING_TOKEN, ip: '9.9.9.8', body: {} }, NOW));
    expect(noName.getStatus()).toBe(400);
    expect((await fail(guest(service(null)))).getStatus()).toBe(503);
    const svc = service();
    for (let i = 0; i < 10; i++) await guest(svc);
    expect((await fail(guest(svc))).getStatus()).toBe(429);
  });
});
