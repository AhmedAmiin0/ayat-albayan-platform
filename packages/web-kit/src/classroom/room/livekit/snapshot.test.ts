import { describe, expect, it } from 'vitest';
import { snapshotOf, type ParticipantLike, type PublicationLike } from './snapshot';

const pub = (source: string, sid: string, isMuted = false): PublicationLike => ({ source, isMuted, track: { sid, mediaStreamTrack: { id: `m-${sid}` } } });

function person(identity: string, pubs: PublicationLike[], o: Partial<ParticipantLike> = {}): ParticipantLike {
  return {
    identity,
    name: identity.toUpperCase(),
    isLocal: false,
    isSpeaking: false,
    isMicrophoneEnabled: true,
    isCameraEnabled: pubs.some((p) => p.source === 'camera'),
    isScreenShareEnabled: pubs.some((p) => p.source === 'screen_share'),
    trackPublications: new Map(pubs.map((p, i) => [String(i), p])),
    ...o,
  };
}

describe('snapshotOf', () => {
  const me = person('me', [pub('camera', 'c1')], { isLocal: true });
  const room = (remotes: ParticipantLike[], canPlaybackAudio = true) => ({
    localParticipant: me,
    remoteParticipants: new Map(remotes.map((r) => [r.identity, r])),
    canPlaybackAudio,
  });

  it('has a camera tile per person, the local one first, with names and video state', () => {
    const s = snapshotOf(room([person('ali', [])]), 'connected', new Set());
    expect(s.tiles.map((x) => [x.key, x.name, x.hasVideo, x.isLocal])).toEqual([
      ['me', 'ME', true, true],
      ['ali', 'ALI', false, false],
    ]);
    expect(s.camOn).toBe(true);
    expect(s.status).toBe('connected');
  });

  it('a muted camera shows no video', () => {
    const s = snapshotOf(room([person('ali', [pub('camera', 'c2', true)])]), 'connected', new Set());
    expect(s.tiles[1]?.hasVideo).toBe(false);
  });

  it('flags the active speakers, from the speaker list or the participant', () => {
    const s = snapshotOf(room([person('ali', []), person('sara', [], { isSpeaking: true })]), 'connected', new Set(['ali']));
    expect(s.tiles.filter((x) => x.speaking).map((x) => x.key)).toEqual(['ali', 'sara']);
  });

  it('a shared screen gets its own tile; the audio-blocked flag passes through', () => {
    const s = snapshotOf(room([person('ali', [pub('screen_share', 's1')])], false), 'connected', new Set());
    expect(s.tiles.map((x) => x.key)).toEqual(['me', 'ali', 'ali:screen']);
    expect(s.tiles[2]).toMatchObject({ kind: 'screen', hasVideo: true, videoRev: 's1' });
    expect(s.canPlayAudio).toBe(false);
  });
});
