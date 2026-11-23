import { t } from '#/lib/i18n/index.ts';
import { RoomIcon } from '#/classroom/room/components/room-icons.tsx';
import type { ProbeState } from './media-probe';

const C = t.roomFlow.check;

/** The words on the dark box while there is no picture. */
const NO_PICTURE: Readonly<Record<Exclude<ProbeState['status'], 'on'>, string>> = {
  starting: C.starting,
  off: t.mobileRoom.preview.camOff,
  denied: C.camDenied,
  missing: t.mobileRoom.preview.camOff,
};

/** The element still shows a stream of another track (or none), and the browser has MediaStream. */
const needsTrack = (el: HTMLVideoElement, track: MediaStreamTrack): boolean =>
  typeof MediaStream === 'function' &&
  !(el.srcObject instanceof MediaStream && el.srcObject.getTracks().includes(track));

/** Shows one live camera track in the <video> (a ref callback: no effect needed). */
const showTrack = (track: MediaStreamTrack) => (el: HTMLVideoElement | null) => {
  if (!el || !needsTrack(el, track)) return;
  el.srcObject = new MediaStream([track]);
};

/**
 * One's own camera before joining (board FamRoomWebCheck): mirrored like the room's own tile, or
 * a calm dark box with the reason there is no picture. «أنت» in the corner.
 */
export function CheckPreview({ cam }: { cam: ProbeState }) {
  return (
    <div className="relative grid aspect-video w-full place-items-center overflow-hidden rounded-md bg-inverse text-on-inverse">
      {cam.status === 'on' ? (
        <video
          ref={showTrack(cam.track)}
          autoPlay
          playsInline
          muted
          className="size-full -scale-x-100 object-cover"
        />
      ) : (
        <p role="status" className="grid justify-items-center gap-2 text-sm font-semibold">
          <RoomIcon name="cam" className="size-8" />
          {NO_PICTURE[cam.status]}
        </p>
      )}
      <span className="absolute inset-s-3 bottom-3 rounded-md bg-inverse/85 px-2 py-0.5 text-xs font-semibold">
        {t.classroom.you}
      </span>
    </div>
  );
}
