import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FetchLike } from '@/common/infra/http/failure';
import { CONFIG } from '@/modules/teaching/classroom/classroom.fakes';
import { LivekitApi, LivekitError } from './livekit-api';
import { ignoredAnswer } from './livekit-twirp';

// New in docs/36 h5: a Twirp call had no deadline; a hung LiveKit now ends after 15 s.

const call = { method: 'livekit.RoomService/ListRooms', body: {}, grant: { roomList: true } };

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('LivekitApi deadline', () => {
  it('a transport that never answers (nor honours its signal) ends as LivekitError 504', async () => {
    const hung = vi.fn<FetchLike>(() => new Promise<Response>(() => undefined));
    const pending = new LivekitApi(CONFIG, hung).call(call, ignoredAnswer).catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(14_999);
    expect(hung).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    const err = await pending;
    expect(err).toBeInstanceOf(LivekitError);
    expect(err).toMatchObject({ status: 504, code: 'timeout' });
  });

  it('the error never carries the host or the server token', async () => {
    const hung = vi.fn<FetchLike>(() => new Promise<Response>(() => undefined));
    const pending = new LivekitApi(CONFIG, hung).call(call, ignoredAnswer).catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(15_000);
    const text = JSON.stringify(await pending) + String(await pending);
    expect(text).not.toContain('livekit.example.test');
    expect(text).not.toContain('Bearer');
  });
});
