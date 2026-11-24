import { useState } from 'react';
import type { AudioOutput } from '../model/audio-output';
import type { RoomAudio, RoomClient, RoomSnapshot } from '../model/room-types';

/** Derived on the change, no effect; it clears once the microphone is on again. */
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

/** Joining never forces an output; `reset` per join since each join starts on the front camera. */
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
