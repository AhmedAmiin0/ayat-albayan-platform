import { HttpException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import { ADMIN, ASSISTANT, CONFIG, GUARDIAN, TEACHER } from '../classroom.fakes';
import { MEETING_ID, meetingQueries } from './internal-meetings.fakes';
import { InternalMeetingKickService } from './internal-meetings.kick.service';
import type { InternalMeetingsQueries } from './internal-meetings.queries';
import { LivekitApi } from '../livekit/livekit-api';
import { http } from '../moderation/moderation.fakes';

let mq: ReturnType<typeof meetingQueries>;
let post: ReturnType<typeof http>;
const service = (config: typeof CONFIG | null = CONFIG) =>
  new InternalMeetingKickService(mq as unknown as InternalMeetingsQueries, new LivekitApi(config, post));
const fail = async (p: Promise<unknown>) => (await p.catch((e: HttpException) => e)) as HttpException;
const GUEST = 'guest-0123456789ab';

beforeEach(() => {
  mq = meetingQueries();
  post = http();
});

describe('InternalMeetingKickService', () => {
  it('the creator (as teacher) removes a guest from meeting-<id>', async () => {
    await service().remove({ user: TEACHER, id: MEETING_ID, identity: GUEST });
    const [url, init] = post.mock.calls[0] ?? [];
    expect(url).toContain('RemoveParticipant');
    expect(JSON.parse(init?.body ?? '{}')).toEqual({ room: `meeting-${MEETING_ID}`, identity: GUEST });
  });

  it('403 cannot_remove: an assistant may not remove, nobody removes an admin', async () => {
    expect((await fail(service().remove({ user: ASSISTANT, id: MEETING_ID, identity: GUEST }))).getResponse()).toMatchObject({ code: 'cannot_remove' });
    expect((await fail(service().remove({ user: ADMIN, id: MEETING_ID, identity: 'admin-0123456789ab' }))).getStatus()).toBe(403);
    expect((await fail(service().remove({ user: GUARDIAN, id: MEETING_ID, identity: GUEST }))).getStatus()).toBe(403);
    expect(post).not.toHaveBeenCalled();
  });

  it('404 for an unknown meeting or identity, 503 without LiveKit, 502 when LiveKit refuses', async () => {
    mq.byId.mockResolvedValueOnce(null);
    expect((await fail(service().remove({ user: ADMIN, id: MEETING_ID, identity: GUEST }))).getStatus()).toBe(404);
    expect((await fail(service().remove({ user: ADMIN, id: MEETING_ID, identity: 'boss-0123456789ab' }))).getStatus()).toBe(404);
    expect((await fail(service(null).remove({ user: ADMIN, id: MEETING_ID, identity: GUEST }))).getStatus()).toBe(503);
    post = http({ status: 500, body: { code: 'internal' } });
    expect((await fail(service().remove({ user: ADMIN, id: MEETING_ID, identity: GUEST }))).getStatus()).toBe(502);
  });
});
