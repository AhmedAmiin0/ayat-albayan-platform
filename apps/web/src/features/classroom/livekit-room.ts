import { DisconnectReason, Room, RoomEvent, type Participant, type Track } from 'livekit-client';
import { boardSharer } from './livekit-board-share';
import { listenData, sendData } from './livekit-data';
import { attachTrack } from './media-attach';
import { EMPTY_SNAPSHOT, type MediaFailure, type RoomClient, type RoomSnapshot, type RoomStatus } from './room-types';
import { stopRevokedShare } from './share/stop-revoked';
import { snapshotOf } from './snapshot';

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
  // A staff «سماح» / «إيقاف مشاركة» (UpdateParticipant) changes who may share the screen.
  RoomEvent.ParticipantPermissionsChanged,
];

/** Kicked (RemoveParticipant) and opened elsewhere get their own screens; anything else is «خرجت». */
function closingStatus(reason: DisconnectReason | undefined): RoomStatus {
  if (reason === DisconnectReason.DUPLICATE_IDENTITY) return 'duplicate';
  if (reason === DisconnectReason.PARTICIPANT_REMOVED) return 'removed';
  return 'ended';
}

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

  const attempt = async (device: MediaFailure['device'], on: () => Promise<unknown>): Promise<MediaFailure[]> => {
    try {
      await on();
      return [];
    } catch (error) {
      return [{ device, error }];
    }
  };

  return {
    async connect(url, token) {
      await room.connect(url, token);
      room.startAudio().catch(() => undefined);
      const me = room.localParticipant;
      const failures = [
        ...(await attempt('mic', () => me.setMicrophoneEnabled(true))),
        ...(await attempt('cam', () => me.setCameraEnabled(true))),
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
    setMic: async (on) => void (await room.localParticipant.setMicrophoneEnabled(on)),
    setCamera: async (on) => void (await room.localParticipant.setCameraEnabled(on)),
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

