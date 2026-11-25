import type { HttpException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import type { ClassroomRepo } from '@/modules/teaching/classroom/classroom.repo';
import {
  admissionOf,
  moderation,
  recorder,
} from '@/modules/teaching/classroom/moderation/moderation.fakes';
import {
  CONFIG,
  LESSON,
  LINK_TOKEN,
  linkRow,
  OPEN,
  queries,
} from '@/modules/teaching/classroom/classroom.fakes';
import { resolverOf } from '@/modules/teaching/classroom/family-link/family-link.fakes';
import { GuestJoinService } from '@/modules/teaching/classroom/join/guest-join.service';
import { PublicJoinLimit } from '@/modules/teaching/classroom/join/join-limit';

// Room server bugs (owner 2026-11-16): the /join door reads the lesson as it is NOW.

let q: ReturnType<typeof queries>;
let rec: ReturnType<typeof recorder>;
const service = () =>
  new GuestJoinService(
    q as unknown as ClassroomRepo,
    new PublicJoinLimit(),
    admissionOf({ q, mod: moderation(), rec, config: CONFIG }),
    resolverOf(q),
  );
const join = (now = OPEN) =>
  service().join({ linkToken: LINK_TOKEN, ip: '9.9.9.9', body: { name: 'سهيلة' } }, now);
const fail = async (p: Promise<unknown>) =>
  (await p.catch((e: unknown) => e)) as HttpException;

beforeEach(() => {
  q = queries();
  rec = recorder();
});

describe('the /join door and the lesson behind the link', () => {
  it('a lesson moved later keeps its link: the stored expiry was the old time, the new window decides', async () => {
    q.linkByHash.mockResolvedValue(linkRow({ expires_at: '2026-10-05T19:00:00.000Z' }));
    q.lesson.mockResolvedValue({
      ...LESSON,
      starts_at: '2026-10-06T16:00:00.000Z',
      ends_at: '2026-10-06T17:00:00.000Z',
    });
    await expect(join(new Date('2026-10-06T16:05:00Z'))).resolves.toMatchObject({ role: 'guest' });
  });

  it.each(['cancelled_by_teacher', 'cancelled_by_admin', 'rescheduled'] as const)(
    '410 join_closed for a %s lesson, and nothing is recorded',
    async (status) => {
      q.lesson.mockResolvedValue({ ...LESSON, status });
      const err = await fail(join());
      expect(err.getStatus()).toBe(410);
      expect(err.getResponse()).toMatchObject({ code: 'join_closed' });
      expect(rec.startFor).not.toHaveBeenCalled();
    },
  );

  it('410 lesson_ended once the teacher ended it for everyone, inside the window too', async () => {
    q.lesson.mockResolvedValue({ ...LESSON, room_ended_at: '2026-10-05T16:30:00.000Z' });
    const err = await fail(join());
    expect(err.getStatus()).toBe(410);
    expect(err.getResponse()).toMatchObject({ code: 'lesson_ended' });
  });
});
