import { describe, expect, it, vi } from 'vitest';
import { CONFIG } from '../classroom.fakes';
import { LivekitApi, LivekitError, type HttpPost } from './livekit-api';
import { muteTrack, trackSidOf } from './livekit-api.mute';

const PARTICIPANT = { identity: 'guest-0123456789ab', tracks: [{ sid: 'TR_cam', source: 'CAMERA' }, { sid: 'TR_mic', source: 'MICROPHONE' }] };

/** Answers GetParticipant with `participant`, everything else with {}. */
function twirp(participant: object | null) {
  return vi.fn<HttpPost>(async (url) => {
    if (url.endsWith('/GetParticipant') && participant === null) {
      return { ok: false, status: 404, text: async () => JSON.stringify({ code: 'not_found' }) };
    }
    const body = url.endsWith('/GetParticipant') ? participant : {};
    return { ok: true, status: 200, text: async () => JSON.stringify(body) };
  });
}
const INPUT = { room: 'lesson-1', identity: 'guest-0123456789ab' };

describe('trackSidOf', () => {
  it('finds the track by protojson name or enum number; null without one', () => {
    expect(trackSidOf(PARTICIPANT, 'microphone')).toBe('TR_mic');
    expect(trackSidOf({ tracks: [{ sid: 'TR_1', source: 1 }] }, 'camera')).toBe('TR_1');
    expect(trackSidOf({ tracks: [{ sid: 'TR_1', source: 1 }] }, 'microphone')).toBeNull();
    expect(trackSidOf({}, 'camera')).toBeNull();
    expect(trackSidOf({ tracks: ['junk', { source: 'CAMERA' }] }, 'camera')).toBeNull();
  });
});

describe('muteTrack', () => {
  it('looks the track up, then MutePublishedTrack {track_sid, muted: true}', async () => {
    const h = twirp(PARTICIPANT);
    expect(await muteTrack(new LivekitApi(CONFIG, h), { ...INPUT, source: 'microphone' })).toBe('muted');
    expect(h.mock.calls.map(([url]) => url.split('/').at(-1))).toEqual(['GetParticipant', 'MutePublishedTrack']);
    expect(JSON.parse(h.mock.calls[1]?.[1].body ?? '{}')).toEqual({ ...INPUT, track_sid: 'TR_mic', muted: true });
  });

  it('nothing published of that source: no mute call', async () => {
    const h = twirp({ tracks: [] });
    expect(await muteTrack(new LivekitApi(CONFIG, h), { ...INPUT, source: 'camera' })).toBe('none');
    expect(h).toHaveBeenCalledTimes(1);
  });

  it('a participant who left throws not_found', async () => {
    const err = await muteTrack(new LivekitApi(CONFIG, twirp(null)), { ...INPUT, source: 'camera' }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(LivekitError);
    expect(err).toMatchObject({ code: 'not_found' });
  });
});
