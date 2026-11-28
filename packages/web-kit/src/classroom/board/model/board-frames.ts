/**
 * How often a still board is re-sent while shared (a few frames a second is plenty for a still
 * picture).
 */
export const KEEP_FRAMES_MS = 250;

interface FrameTrack {
  requestFrame?: () => void;
}

/** captureStream sends no frame unless drawn, so LiveKit kept it pending; frames are forced. */
export function keepFrames(
  canvas: HTMLCanvasElement,
  track: MediaStreamTrack,
  every = KEEP_FRAMES_MS,
): () => void {
  const ctx = canvas.getContext('2d');
  const tick = () => {
    if (ctx) ctx.putImageData(ctx.getImageData(0, 0, 1, 1), 0, 0);
    (track as FrameTrack).requestFrame?.();
  };
  tick();
  const id = setInterval(tick, every);
  return () => clearInterval(id);
}
