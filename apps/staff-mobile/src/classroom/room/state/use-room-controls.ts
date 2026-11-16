import { useState } from 'react';
import type { AudioOutput } from '@/classroom/room/model/audio-output';
import type { RoomAudio, RoomClient, RoomSnapshot } from '@/classroom/room/model/room-types';

/**
 * The in-room controls: كتم, الكاميرا, تبديل الكاميرا, and the audio output. Joining never forces an
 * output (a headset stays the headset); `syncOutput` reads what LiveKit chose so the button names
 * it, and the button steps to the next one. `reset` on every join: the client starts each join on
 * the front camera, so one's own tile is mirrored again after a rejoin.
 */
export function useRoomControls(client: RoomClient, audio: RoomAudio, snap: RoomSnapshot) {
  const [output, setOutput] = useState<AudioOutput | null>(null);
  const [front, setFront] = useState(true);
  return {
    output,
    front,
    toggleMic: () => void client.setMic(!snap.micOn),
    toggleCam: () => void client.setCamera(!snap.camOn),
    switchCamera: async () => setFront(await client.switchCamera()),
    nextOutput: async () => setOutput(await audio.next(output)),
    syncOutput: async () => setOutput(await audio.current()),
    reset: () => setFront(true),
  };
}
