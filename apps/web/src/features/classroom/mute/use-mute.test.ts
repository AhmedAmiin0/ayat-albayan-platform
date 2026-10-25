import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { tile } from '../room/livekit/fake-client';
import type { TileView } from '../room/components/room-types';
import type { MuteCall } from './mute-api';
import { useMute, type MuteOptions } from './use-mute';

const guest = tile({ key: 'g1', name: 'سهيلة', role: 'guest', hasVideo: true });
const guest2 = tile({ key: 'g2', name: 'مريم', role: 'guest' });
const TILES: TileView[] = [tile({ key: 'me', isLocal: true, role: 'teacher' }), guest, guest2, tile({ key: 'a', role: 'admin' })];

function setup(o: Partial<MuteOptions> = {}) {
  const call = vi.fn<MuteCall>(() => Promise.resolve());
  const { result } = renderHook(() => useMute({ role: 'teacher', tiles: TILES, call, ...o }));
  return { result, call };
}

describe('useMute', () => {
  it('offers mute on someone below me with that source on; never myself, my seniors, or without a route', () => {
    const { result } = setup();
    expect(result.current.canMute(guest, 'microphone')).toBe(true);
    expect(result.current.canMute(guest, 'camera')).toBe(true);
    expect(result.current.canMute(guest2, 'camera')).toBe(false);
    expect(result.current.canMute({ ...guest, micOn: false }, 'microphone')).toBe(false);
    expect(result.current.canMute(tile({ key: 'a', role: 'admin' }), 'microphone')).toBe(false);
    expect(result.current.canMute(tile({ key: 'me', isLocal: true, role: 'guest' }), 'microphone')).toBe(false);
    expect(result.current.canMute({ ...guest, kind: 'screen' }, 'microphone')).toBe(false);
    expect(setup({ call: null }).result.current.canMute(guest, 'microphone')).toBe(false);
  });

  it('mute calls the API with the identity and source, then says so', async () => {
    const { result, call } = setup();
    act(() => result.current.mute(guest, 'camera'));
    expect(call).toHaveBeenCalledWith({ identity: 'g1', source: 'camera' });
    await waitFor(() => expect(result.current.toast).toEqual({ message: t.classroom.mute.camDone.replace('{name}', 'سهيلة'), tone: 'info' }));
    act(() => result.current.dismiss());
    expect(result.current.toast).toBeNull();
  });

  it('a refusal becomes an error toast with the code’s words', async () => {
    const { result, call } = setup();
    call.mockRejectedValue(new ApiError(403, { code: 'cannot_mute' }));
    act(() => result.current.mute(guest, 'microphone'));
    await waitFor(() => expect(result.current.toast).toEqual({ message: t.classroom.error.cannot_mute, tone: 'error' }));
  });

  it('«كتم الجميع» mutes every guest microphone that is on; the teacher and admin only', async () => {
    const { result, call } = setup();
    expect(result.current.canMuteAll).toBe(true);
    act(() => result.current.muteAll());
    expect(call.mock.calls.map(([x]) => x)).toEqual([
      { identity: 'g1', source: 'microphone' },
      { identity: 'g2', source: 'microphone' },
    ]);
    await waitFor(() => expect(result.current.toast?.message).toBe(t.classroom.mute.allDone));
    expect(setup({ role: 'assistant' }).result.current.canMuteAll).toBe(false);
    expect(setup({ tiles: [{ ...guest, micOn: false }] }).result.current.canMuteAll).toBe(false);
  });

  it('«كتم الجميع» reports the first refusal', async () => {
    const { result, call } = setup();
    call.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new ApiError(404, { code: 'participant_not_found' }));
    act(() => result.current.muteAll());
    await waitFor(() => expect(result.current.toast).toEqual({ message: t.classroom.error.participant_not_found, tone: 'error' }));
  });
});
