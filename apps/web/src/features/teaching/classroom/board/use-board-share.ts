import { useEffect, useRef, type RefObject } from 'react';
import type { RoomController } from '../room/livekit/use-room';
import { keepFrames } from './model/board-frames';

/** Frames per second of the shared-board video (enough for handwriting, cheap to encode). */
export const BOARD_FPS = 15;

/** The canvas as a video track, or null where the browser has no canvas.captureStream. */
export function captureBoard(canvas: HTMLCanvasElement | null, fps = BOARD_FPS): MediaStreamTrack | null {
  if (!canvas || typeof canvas.captureStream !== 'function') return null;
  return canvas.captureStream(fps).getVideoTracks()[0] ?? null;
}

export const canCaptureBoard = (): boolean =>
  typeof HTMLCanvasElement !== 'undefined' && typeof HTMLCanvasElement.prototype.captureStream === 'function';

export interface BoardShare {
  sharing: boolean;
  supported: boolean;
  toggle: () => void;
}

/**
 * «مشاركة السبورة»: publishes the board canvas as the screen share, «إيقاف مشاركة السبورة» stops
 * it. Closing the board (unmounting the canvas) while it is shared stops the share too.
 */
export function useBoardShare(canvas: RefObject<HTMLCanvasElement | null>, room: RoomController): BoardShare {
  const sharing = room.snap.boardShareOn;
  const live = useRef({ sharing, stop: () => room.setBoardTrack(null) });
  const frames = useRef<(() => void) | null>(null);
  const stopFrames = () => {
    frames.current?.();
    frames.current = null;
  };
  useEffect(() => {
    live.current = { sharing, stop: () => room.setBoardTrack(null) };
  });
  useEffect(() => {
    if (!sharing) stopFrames();
  }, [sharing]);
  useEffect(
    () => () => {
      stopFrames();
      if (live.current.sharing) live.current.stop();
    },
    [],
  );

  return {
    sharing,
    supported: canCaptureBoard(),
    toggle: () => {
      if (sharing) return room.setBoardTrack(null);
      const el = canvas.current;
      const track = captureBoard(el);
      if (!el || !track) return;
      stopFrames();
      frames.current = keepFrames(el, track);
      room.setBoardTrack(track);
    },
  };
}
