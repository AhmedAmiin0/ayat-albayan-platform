import { describe, expect, it, vi } from 'vitest';
import type { FetchLike } from '@/common/infra/http/failure';
import { CONFIG } from '@/modules/teaching/classroom/classroom.fakes';
import { LivekitApi } from '@/modules/teaching/classroom/livekit/livekit-api';
import { ignoredAnswer } from '@/modules/teaching/classroom/livekit/livekit-twirp';

// T1: a signed server token is never sent on to wherever a redirect points.
describe('LivekitApi redirects', () => {
  it("asks fetch to fail on a redirect (redirect: 'error')", async () => {
    const ok = vi.fn<FetchLike>(() => Promise.resolve(new Response('{}', { status: 200 })));
    const call = { method: 'livekit.RoomService/ListRooms', body: {}, grant: { roomList: true } };
    await new LivekitApi(CONFIG, ok).call(call, ignoredAnswer);
    expect(ok.mock.calls[0]?.[1]).toMatchObject({ redirect: 'error' });
  });
});
