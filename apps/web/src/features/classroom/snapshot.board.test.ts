import { describe, expect, it } from 'vitest';
import { BOARD_TRACK_NAME, snapshotOf, type ParticipantLike, type PublicationLike } from './snapshot';

const screen = (trackName?: string): PublicationLike => ({ source: 'screen_share', isMuted: false, trackName, track: { sid: 'S', mediaStreamTrack: { id: 'm' } } });

function person(identity: string, o: Partial<ParticipantLike> = {}): ParticipantLike {
  return {
    identity,
    isLocal: false,
    isSpeaking: false,
    isMicrophoneEnabled: true,
    isCameraEnabled: false,
    isScreenShareEnabled: false,
    trackPublications: new Map(),
    ...o,
  };
}

const room = (me: ParticipantLike, remotes: ParticipantLike[] = [], isRecording?: boolean) => ({
  localParticipant: me,
  remoteParticipants: new Map(remotes.map((r) => [r.identity, r])),
  canPlaybackAudio: true,
  isRecording,
});

describe('snapshotOf: roles, board share, recording', () => {
  it('reads each role from the token metadata (null when missing or malformed) and keeps the identity', () => {
    const s = snapshotOf(
      room(person('me', { isLocal: true, metadata: '{"role":"teacher"}' }), [person('g', { metadata: 'oops' }), person('x')]),
      'connected',
      new Set(),
    );
    expect(s.tiles.map((x) => [x.identity, x.role])).toEqual([['me', 'teacher'], ['g', null], ['x', null]]);
  });

  it('the board published as the screen share is a board tile and not «وقّف المشاركة»', () => {
    const pubs = new Map([['0', screen(BOARD_TRACK_NAME)]]);
    const s = snapshotOf(room(person('me', { isLocal: true, isScreenShareEnabled: true, trackPublications: pubs })), 'connected', new Set());
    expect(s).toMatchObject({ shareOn: false, boardShareOn: true });
    expect(s.tiles[1]).toMatchObject({ kind: 'screen', isBoard: true });
  });

  it('a real screen share stays a screen; the recording flag passes through, false when absent', () => {
    const pubs = new Map([['0', screen()]]);
    const s = snapshotOf(room(person('me', { isLocal: true, isScreenShareEnabled: true, trackPublications: pubs }), [], true), 'connected', new Set());
    expect(s).toMatchObject({ shareOn: true, boardShareOn: false, isRecording: true });
    expect(s.tiles[1]?.isBoard).toBe(false);
    expect(snapshotOf(room(person('me', { isLocal: true })), 'connected', new Set()).isRecording).toBe(false);
  });
});
