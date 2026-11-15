import { useState } from 'react';
import type { RoomAudio, RoomClient, RoomSnapshot } from '@/classroom/room/model/room-types';

/**
 * The in-room controls: كتم, الكاميرا, تبديل الكاميرا, مكبر الصوت ↔ السماعة. The loudspeaker is the
 * default (a video room); a route chosen before joining is applied once the session starts.
 */
export function useRoomControls(client: RoomClient, audio: RoomAudio, snap: RoomSnapshot) {
  const [speaker, setSpeaker] = useState(true);
  const [front, setFront] = useState(true);
  return {
    speaker,
    front,
    toggleMic: () => void client.setMic(!snap.micOn),
    toggleCam: () => void client.setCamera(!snap.camOn),
    switchCamera: async () => setFront(await client.switchCamera()),
    toggleSpeaker: () => {
      const next = !speaker;
      setSpeaker(next);
      void audio.route(next);
    },
  };
}
