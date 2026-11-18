/** How often a still board is re-sent while shared (a few frames a second is plenty for a still picture). */
export const KEEP_FRAMES_MS = 250;

interface FrameTrack {
  requestFrame?: () => void;
}

/**
 * A canvas.captureStream track only carries a frame when the canvas is drawn on. Shared while
 * nobody draws, it sent nothing: LiveKit kept the track pending (never forwarded it) and the others
 * never saw «مشاركة السبورة» (seen against a real LiveKit, 2026-10-05). So while shared, the board
 * is touched (one pixel rewritten as it is) and a frame requested a few times a second.
 */
export function keepFrames(canvas: HTMLCanvasElement, track: MediaStreamTrack, every = KEEP_FRAMES_MS): () => void {
  const ctx = canvas.getContext('2d');
  const tick = () => {
    if (ctx) ctx.putImageData(ctx.getImageData(0, 0, 1, 1), 0, 0);
    (track as FrameTrack).requestFrame?.();
  };
  tick();
  const id = setInterval(tick, every);
  return () => clearInterval(id);
}
