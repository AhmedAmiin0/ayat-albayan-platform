import { HttpException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import type { ClassroomQueries } from '../classroom.queries';
import { admissionOf, moderation, recorder } from '../moderation.fakes';
import { CLOSED, CONFIG, decode, EARLY, LESSON_ID, LINK_TOKEN, linkRow, OPEN, queries } from '../classroom.fakes';
import { GuestJoinService } from './guest-join.service';
import { PublicJoinLimit } from './join-limit';
import { hashLinkToken } from './join-link.token';

let q: ReturnType<typeof queries>;
let mod: ReturnType<typeof moderation>;
let rec: ReturnType<typeof recorder>;
const service = (config: typeof CONFIG | null = CONFIG, limit = new PublicJoinLimit()) =>
  new GuestJoinService(q as unknown as ClassroomQueries, limit, admissionOf({ q, mod, rec, config }));
const join = (over: { linkToken?: string; body?: unknown; now?: Date; svc?: GuestJoinService } = {}) =>
  (over.svc ?? service()).join({ linkToken: over.linkToken ?? LINK_TOKEN, ip: '9.9.9.9', body: over.body !== undefined ? over.body : { name: 'سهيلة' } }, over.now ?? OPEN);
const fail = async (p: Promise<unknown>) => (await p.catch((e: HttpException) => e)) as HttpException;

beforeEach(() => {
  q = queries();
  mod = moderation();
  rec = recorder();
});

describe('guest join', () => {
  it('mints a guest token for the typed name, in the lesson room', async () => {
    const r = await join();
    expect(r).toMatchObject({ role: 'guest', room: `lesson-${LESSON_ID}`, url: CONFIG.url });
    const c = decode(r.token);
    expect(c.name).toBe('سهيلة');
    expect(c.video.canPublishSources).toEqual(['camera', 'microphone']);
    expect(q.linkByHash).toHaveBeenCalledWith(hashLinkToken(LINK_TOKEN));
  });

  it('gives every call a fresh identity (two windows of one link never kick each other)', async () => {
    const svc = service(CONFIG, new PublicJoinLimit());
    const a = decode((await join({ svc })).token).sub;
    const b = decode((await join({ svc })).token).sub;
    expect(a).not.toBe(b);
    expect(a.startsWith('guest-')).toBe(true);
  });

  it('the token ends where the classroom closes, never later', async () => {
    const c = decode((await join({ now: new Date('2026-10-05T18:30:00Z') })).token);
    expect(c.exp).toBe(Date.parse('2026-10-05T19:00:00Z') / 1000);
  });

  it('is valid from 15 minutes before the lesson: 403 join_not_open_yet earlier', async () => {
    expect((await fail(join({ now: EARLY }))).getResponse()).toMatchObject({ code: 'join_not_open_yet', opens_at: '2026-10-05T15:45:00.000Z' });
    expect((await join({ now: new Date('2026-10-05T15:45:00Z') })).role).toBe('guest');
  });

  it('and until 2 hours after it: 410 join_closed later', async () => {
    const link = linkRow({ expires_at: '2026-10-05T23:00:00.000Z' });
    q.linkByHash.mockResolvedValue(link);
    const err = await fail(join({ now: CLOSED }));
    expect(err.getStatus()).toBe(410);
    expect(err.getResponse()).toMatchObject({ code: 'join_closed' });
  });
});

describe('a bad link', () => {
  it('404 link_invalid for an unknown token and for one of the wrong shape (no lookup)', async () => {
    q.linkByHash.mockResolvedValue(null);
    expect((await fail(join())).getResponse()).toMatchObject({ code: 'link_invalid' });
    q.linkByHash.mockClear();
    expect((await fail(join({ linkToken: 'short' }))).getStatus()).toBe(404);
    expect(q.linkByHash).not.toHaveBeenCalled();
  });

  it('410 link_expired after its expiry, and when revoked', async () => {
    q.linkByHash.mockResolvedValue(linkRow({ expires_at: '2026-10-05T16:00:00.000Z' }));
    expect((await fail(join())).getResponse()).toMatchObject({ code: 'link_expired' });
    q.linkByHash.mockResolvedValue(linkRow({ revoked_at: '2026-10-05T10:00:00Z' }));
    expect((await fail(join())).getStatus()).toBe(410);
  });

  it('404 when the link points at a lesson that is gone', async () => {
    q.lesson.mockResolvedValue(null);
    expect((await fail(join())).getStatus()).toBe(404);
  });
});

describe('the name, the switch and the limit', () => {
  it.each([{}, { name: '' }, { name: '   ' }, { name: 'x'.repeat(31) }, null])('400 for the body %j', async (body) => {
    expect((await fail(join({ body }))).getStatus()).toBe(400);
  });

  it('503 when LIVEKIT_* are not set', async () => {
    expect((await fail(join({ svc: service(null) }))).getStatus()).toBe(503);
  });

  it('429 after 10 tries on one link from one IP', async () => {
    const svc = service();
    for (let i = 0; i < 10; i++) await join({ svc });
    expect((await fail(join({ svc }))).getStatus()).toBe(429);
  });

  it('the window comes from the settings: 90 minutes before lets the early guest in', async () => {
    expect((await fail(join({ now: EARLY }))).getStatus()).toBe(403);
    q.joinWindow.mockResolvedValue({ opensBeforeMin: 90, closesAfterMin: 120 });
    expect(await join({ now: EARLY })).toMatchObject({ role: 'guest' });
  });
});
