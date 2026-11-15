import type { Room } from 'livekit-client';
import type { MediaWish } from '@/classroom/room/model/room-types';
import type { LiveKitNative } from './livekit-native';

/** A device that cannot turn on (refused, busy) stays off: never a failed join or a thrown tap. */
const quiet = async (on: () => Promise<unknown>): Promise<boolean> =>
  on().then(
    () => true,
    () => false,
  );

/** One's own microphone and camera in the room: on / off, and the front ↔ back camera. */
export function localControls({ lk }: Pick<LiveKitNative, 'lk'>, room: Room, emit: () => void) {
  let front = true;
  const me = () => room.localParticipant;
  const facing = () => (front ? 'user' : 'environment');
  return {
    start: async (media: MediaWish) => {
      front = true;
      if (media.mic) await quiet(() => me().setMicrophoneEnabled(true));
      if (media.cam) await quiet(() => me().setCameraEnabled(true, { facingMode: facing() }));
    },
    setMic: async (on: boolean) => {
      await quiet(() => me().setMicrophoneEnabled(on));
      emit();
    },
    setCamera: async (on: boolean) => {
      await quiet(() => me().setCameraEnabled(on, { facingMode: facing() }));
      emit();
    },
    switchCamera: async () => {
      const track = me().getTrackPublication(lk.Track.Source.Camera)?.videoTrack;
      const next = front ? 'environment' : 'user';
      if (track && (await quiet(() => track.restartTrack({ facingMode: next })))) front = !front;
      emit();
      return front;
    },
  };
}
