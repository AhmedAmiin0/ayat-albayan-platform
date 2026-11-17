import { useState } from 'react';
import type { AudioOutput } from '../model/audio-output';
import type { RoomAudio, RoomClient, RoomSnapshot } from '../model/room-types';

/**
 * «كتمك المعلم» (canvas RoomXNotice): the microphone went off without one's own «كتم». Derived on
 * the change (no effect): it goes once the microphone is on again.
 */
function useMutedByStaff(micOn: boolean) {
  const [was, setWas] = useState(micOn);
  const [selfOff, setSelfOff] = useState(false);
  const [byStaff, setByStaff] = useState(false);
  if (was !== micOn) {
    setWas(micOn);
    setByStaff(was && !selfOff);
    setSelfOff(false);
  }
  return { byStaff, mutingSelf: () => setSelfOff(true) };
}

/**
 * The in-room controls: كتم, الكاميرا, تبديل الكاميرا, the audio output. Joining never forces an
 * output (a headset stays the headset); `syncOutput` reads what LiveKit chose so the button names
 * it, and the button steps to the next one. `reset` on every join: the client starts each join on
 * the front camera, so one's own tile is mirrored again after a rejoin.
 */
export function useRoomControls(client: RoomClient, audio: RoomAudio, snap: RoomSnapshot) {
  const [output, setOutput] = useState<AudioOutput | null>(null);
  const [front, setFront] = useState(true);
  const muted = useMutedByStaff(snap.micOn);
  return {
    output,
    front,
    mutedByStaff: muted.byStaff,
    toggleMic: () => {
      if (snap.micOn) muted.mutingSelf();
      void client.setMic(!snap.micOn);
    },
    toggleCam: () => void client.setCamera(!snap.camOn),
    switchCamera: async () => setFront(await client.switchCamera()),
    nextOutput: async () => setOutput(await audio.next(output)),
    syncOutput: async () => setOutput(await audio.current()),
    reset: () => setFront(true),
  };
}
