import { useEffect, useState } from 'react';
import type { CamMicAnswer, PreviewCamera, RoomPlatform } from '@/classroom/room/model/room-types';

const NONE: CamMicAnswer = { mic: 'denied', cam: 'denied' };

/**
 * The step before joining: what was allowed, what the user leaves on, and one's own camera while
 * the preview shows (closed when it goes, and on unmount).
 */
export function useRoomPreview(platform: RoomPlatform, showing: boolean) {
  const [answer, setAnswer] = useState<CamMicAnswer>(NONE);
  const [wanted, setWanted] = useState({ mic: true, cam: true });
  const [camera, setCamera] = useState<PreviewCamera | null>(null);
  const open = showing && wanted.cam && answer.cam === 'granted';
  useEffect(() => {
    if (!open) return undefined;
    let live = true;
    let opened: PreviewCamera | null = null;
    void platform.openPreview().then((cam) => {
      if (live) {
        opened = cam;
        setCamera(cam);
      } else cam?.stop();
    });
    return () => {
      live = false;
      opened?.stop();
      setCamera(null);
    };
  }, [open, platform]);
  return {
    answer,
    setAnswer,
    wanted,
    streamUrl: open ? (camera?.streamUrl ?? null) : null,
    toggleMic: () => setWanted((w) => ({ ...w, mic: !w.mic })),
    toggleCam: () => setWanted((w) => ({ ...w, cam: !w.cam })),
  };
}
