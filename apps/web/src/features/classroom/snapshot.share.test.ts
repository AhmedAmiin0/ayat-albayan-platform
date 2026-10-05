import { participantMeta } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { mayShareScreen, snapshotOf, type ParticipantLike } from './snapshot';

// «اطلب مشاركة الشاشة»: who may share comes from LiveKit's live permission, never a guess.

const person = (identity: string, o: Partial<ParticipantLike> = {}): ParticipantLike => ({
  identity,
  isLocal: false,
  isSpeaking: false,
  isMicrophoneEnabled: true,
  isCameraEnabled: false,
  isScreenShareEnabled: false,
  trackPublications: new Map(),
  ...o,
});
const guestMeta = participantMeta('guest');

describe('mayShareScreen', () => {
  it('no permission yet: staff may, a guest may not', () => {
    expect(mayShareScreen({ metadata: participantMeta('teacher') })).toBe(true);
    expect(mayShareScreen({ metadata: guestMeta })).toBe(false);
  });

  it('empty sources = everything; a guest list without SCREEN_SHARE (3) may not; after «سماح» may', () => {
    expect(mayShareScreen({ metadata: guestMeta, permissions: { canPublish: true, canPublishSources: [] } })).toBe(true);
    expect(mayShareScreen({ metadata: guestMeta, permissions: { canPublish: true, canPublishSources: [1, 2] } })).toBe(false);
    expect(mayShareScreen({ metadata: guestMeta, permissions: { canPublish: true, canPublishSources: [1, 2, 3, 4] } })).toBe(true);
    expect(mayShareScreen({ metadata: guestMeta, permissions: { canPublish: false, canPublishSources: [] } })).toBe(false);
  });

  it('the snapshot carries it for me and on every tile', () => {
    const me = person('me', { isLocal: true, metadata: guestMeta, permissions: { canPublish: true, canPublishSources: [1, 2] } });
    const ali = person('ali', { metadata: guestMeta, permissions: { canPublish: true, canPublishSources: [1, 2, 3, 4] } });
    const s = snapshotOf({ localParticipant: me, remoteParticipants: new Map([['ali', ali]]), canPlaybackAudio: true }, 'connected', new Set());
    expect(s.shareAllowed).toBe(false);
    expect(s.tiles.map((x) => [x.identity, x.shareAllowed])).toEqual([
      ['me', false],
      ['ali', true],
    ]);
  });
});
