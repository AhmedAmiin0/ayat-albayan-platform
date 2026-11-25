import type { Participant, Room, Track } from 'livekit-client';
import { snapshotOf, type RoomLike, type SourceName } from '../model/room-snapshot';
import { closedBy } from '../model/room-phase';
import { EMPTY_SNAPSHOT, type RoomStatus } from '../model/room-types';
import type { LiveKitNative } from './livekit-native';

type Lk = LiveKitNative['lk'];

function roomLike(lk: Lk, room: Room): RoomLike<Participant> {
  const source = (s: SourceName): Track.Source =>
    s === 'camera' ? lk.Track.Source.Camera : lk.Track.Source.ScreenShare;
  return {
    local: room.localParticipant,
    remotes: [...room.remoteParticipants.values()],
    recording: room.isRecording,
    publication: (p, s) => p.getTrackPublication(source(s)),
    videoRef: (p, s) => ({
      participant: p,
      publication: p.getTrackPublication(source(s)),
      source: source(s),
    }),
  };
}

/** DeleteRoom and a closed room are final; anything else is a drop with a rejoin offer. */
function closing(lk: Lk, reason: number | undefined): RoomStatus {
  const R = lk.DisconnectReason;
  const why: Partial<Record<number, RoomStatus>> = {
    [R.DUPLICATE_IDENTITY]: 'duplicate',
    [R.PARTICIPANT_REMOVED]: 'removed',
    [R.ROOM_DELETED]: 'ended',
    [R.ROOM_CLOSED]: 'ended',
  };
  return why[reason ?? -1] ?? 'dropped';
}

/** The events that change what the grid shows. */
const refresh = (E: Lk['RoomEvent']) => [
  E.TrackSubscribed,
  E.TrackUnsubscribed,
  E.LocalTrackPublished,
  E.LocalTrackUnpublished,
  E.TrackMuted,
  E.TrackUnmuted,
  E.ParticipantConnected,
  E.ParticipantDisconnected,
  E.ParticipantNameChanged,
  E.ParticipantMetadataChanged,
  E.ActiveSpeakersChanged,
  E.RecordingStatusChanged,
];

/** The room's state and its listeners: emit() rebuilds the snapshot from the Room. */
export function roomStore(lk: Lk, room: Room) {
  const listeners = new Set<() => void>();
  let status: RoomStatus = 'connecting';
  let last = EMPTY_SNAPSHOT;
  const emit = () => {
    last = snapshotOf(roomLike(lk, room), status);
    listeners.forEach((l) => l());
  };
  const setStatus = (next: RoomStatus) => {
    status = next;
    emit();
  };
  refresh(lk.RoomEvent).forEach((ev) => room.on(ev, emit));
  room
    .on(lk.RoomEvent.Reconnecting, () => setStatus('reconnecting'))
    .on(lk.RoomEvent.Reconnected, () => setStatus('connected'))
    .on(lk.RoomEvent.Disconnected, (reason) => setStatus(closing(lk, reason)));
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => void listeners.delete(listener);
  };
  return {
    emit,
    setStatus,
    subscribe,
    snapshot: () => last,
    /** A new join starts from «connecting» (silently: the last room's «ended» is history). */
    reset: () => void (status = 'connecting'),
    /** LiveKit let go of the room (a disconnect event) since the last reset. */
    closed: (): boolean => closedBy(status) !== undefined,
  };
}
