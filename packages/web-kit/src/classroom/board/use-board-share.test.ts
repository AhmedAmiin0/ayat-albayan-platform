import { describe, expect, it, vi } from 'vitest';
import { canCaptureBoard, captureBoard } from './use-board-share';

describe('captureBoard', () => {
  it('null without a canvas or without captureStream (jsdom, old browsers)', () => {
    expect(captureBoard(null)).toBeNull();
    expect(captureBoard(document.createElement('canvas'))).toBeNull();
    expect(canCaptureBoard()).toBe(false);
  });

  it('the first video track of the canvas stream at the asked fps', () => {
    const track = { id: 'v' } as unknown as MediaStreamTrack;
    const canvas = document.createElement('canvas');
    const captureStream = vi.fn(() => ({ getVideoTracks: () => [track] }) as unknown as MediaStream);
    Object.assign(canvas, { captureStream });
    expect(captureBoard(canvas, 10)).toBe(track);
    expect(captureStream).toHaveBeenCalledWith(10);
  });
});
