import { DisconnectReason, Room, RoomEvent, type Participant, type Track } from 'livekit-client';
import { boardSharer } from '@ab/web-kit/classroom/room/livekit/livekit-board-share';
import { listenData, sendData } from '@ab/web-kit/classroom/room/livekit/livekit-data';
import { watchModeration } from '@ab/web-kit/classroom/room/livekit/livekit-moderated';
import { attachTrack } from '@ab/web-kit/classroom/room/livekit/media-attach';
import { BOTH_ON, EMPTY_SNAPSHOT, type MediaFailure, type RoomClient, type RoomSnapshot, type RoomStatus } from '@ab/web-kit/classroom/room/components/room-types';
import { stopRevokedShare } from '@ab/web-kit/classroom/share/stop-revoked';
import { snapshotOf } from '@ab/web-kit/classroom/room/livekit/snapshot';

const REFRESH: readonly RoomEvent[] = [
  RoomEvent.TrackSubscribed,
  RoomEvent.TrackUnsubscribed,
  RoomEvent.LocalTrackPublished,
  RoomEvent.LocalTrackUnpublished,
  RoomEvent.TrackMuted,
  RoomEvent.TrackUnmuted,
  RoomEvent.ParticipantConnected,
  RoomEvent.ParticipantDisconnected,
  RoomEvent.ParticipantNameChanged,
  RoomEvent.AudioPlaybackStatusChanged,
  RoomEvent.RecordingStatusChanged,
  RoomEvent.ParticipantMetadataChanged,
  // A staff grant or stop (UpdateParticipant) changes who may share the screen.
  RoomEvent.ParticipantPermissionsChanged,
];

/** Kicked, opened elsewhere and ended for everyone get their own screens; else plain left. */
const CLOSING: Partial<Record<DisconnectReason, RoomStatus>> = {
  [DisconnectReason.DUPLICATE_IDENTITY]: 'duplicate',
  [DisconnectReason.PARTICIPANT_REMOVED]: 'removed',
  [DisconnectReason.ROOM_DELETED]: 'closed',
  [DisconnectReason.ROOM_CLOSED]: 'closed',
};
const closingStatus = (reason: DisconnectReason | undefined): RoomStatus =>
  (reason === undefined ? undefined : CLOSING[reason]) ?? 'ended';

/** The real client: one livekit-client Room behind the RoomClient interface (ported from tools/livekit/join.html). */
export function createLivekitRoom(): RoomClient {
  const room = new Room({ adaptiveStream: true, dynacast: true });
  const listeners = new Set<(s: RoomSnapshot) => void>();
  const audio = new Map<string, HTMLMediaElement[]>();
  let status: RoomStatus = 'connecting';
  let speaking = new Set<string>();
  let last = EMPTY_SNAPSHOT;

  const emit = () => {
    last = snapshotOf(room, status, speaking);
    listeners.forEach((l) => l(last));
  };
  const setStatus = (next: RoomStatus) => {
    status = next;
    emit();
  };
  const key = (track: Track, p: Participant) => `${p.identity}:${track.sid ?? track.mediaStreamTrack.id}`;

  REFRESH.forEach((ev) => room.on(ev, emit));
  room
    .on(RoomEvent.TrackSubscribed, (track, _pub, p) => {
      if (track.kind === 'audio') audio.set(key(track, p), [track.attach()]);
    })
    .on(RoomEvent.TrackUnsubscribed, (track, _pub, p) => {
      track.detach().forEach((el) => el.remove());
      audio.delete(key(track, p));
    })
    .on(RoomEvent.ActiveSpeakersChanged, (list) => {
      speaking = new Set(list.map((s) => s.identity));
      emit();
    })
    .on(RoomEvent.ParticipantPermissionsChanged, () => stopRevokedShare(room.localParticipant))
    .on(RoomEvent.Reconnecting, () => setStatus('reconnecting'))
    .on(RoomEvent.Reconnected, () => setStatus('connected'))
    // The same token opened elsewhere: stay out, rejoining would kick that window back.
    .on(RoomEvent.Disconnected, (reason) => setStatus(closingStatus(reason)));
  const setBoard = boardSharer(room);
  const moderation = watchModeration(room);

  const attempt = async (device: MediaFailure['device'], on: () => Promise<unknown>): Promise<MediaFailure[]> => {
    try {
      await on();
      return [];
    } catch (error) {
      return [{ device, error }];
    }
  };

  return {
    async connect(url, token, media = BOTH_ON) {
      await room.connect(url, token);
      room.startAudio().catch(() => undefined);
      const me = room.localParticipant;
      // Only what the device check left on starts (staff: both); a chosen device is asked for by id.
      const mic = { deviceId: media.micId };
      const cam = { deviceId: media.camId };
      const failures = [
        ...(media.mic ? await attempt('mic', () => me.setMicrophoneEnabled(true, mic)) : []),
        ...(media.cam ? await attempt('cam', () => me.setCameraEnabled(true, cam)) : []),
      ];
      setStatus('connected');
      return failures;
    },
    disconnect: () => void room.disconnect(),
    snapshot: () => last,
    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    setMic: (on) => moderation.self(async () => void (await room.localParticipant.setMicrophoneEnabled(on))),
    setCamera: (on) => moderation.self(async () => void (await room.localParticipant.setCameraEnabled(on))),
    onModerated: (listener) => moderation.on(listener),
    setShare: async (on) => {
      if (on && last.boardShareOn) await setBoard(null);
      await room.localParticipant.setScreenShareEnabled(on);
      emit();
    },
    setBoardTrack: async (track) => {
      await setBoard(track);
      emit();
    },
    sendData: (bytes, opts) => sendData(room, bytes, opts),
    onData: (listener) => listenData(room, listener),
    startAudio: async () => {
      await room.startAudio();
      emit();
    },
    attachVideo: (tileKey, el) => attachTrack(room, tileKey, el),
  };
}

