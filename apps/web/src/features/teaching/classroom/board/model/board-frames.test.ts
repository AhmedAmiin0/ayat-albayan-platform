import { afterEach, describe, expect, it, vi } from 'vitest';
import { keepFrames } from './board-frames';

describe('keepFrames', () => {
  afterEach(() => vi.useRealTimers());

  it('touches the canvas and asks for a frame now and every tick, until stopped', () => {
    vi.useFakeTimers();
    const pixel = { data: new Uint8ClampedArray(4) };
    const ctx = { getImageData: vi.fn(() => pixel), putImageData: vi.fn() };
    const canvas = { getContext: () => ctx } as unknown as HTMLCanvasElement;
    const requestFrame = vi.fn();
    const stop = keepFrames(canvas, { requestFrame } as unknown as MediaStreamTrack, 100);
    expect(ctx.putImageData).toHaveBeenCalledWith(pixel, 0, 0);
    vi.advanceTimersByTime(300);
    expect(requestFrame).toHaveBeenCalledTimes(4);
    stop();
    vi.advanceTimersByTime(300);
    expect(requestFrame).toHaveBeenCalledTimes(4);
  });

  it('works without a 2D context or requestFrame (jsdom, older browsers)', () => {
    const canvas = { getContext: () => null } as unknown as HTMLCanvasElement;
    const stop = keepFrames(canvas, {} as MediaStreamTrack, 100);
    expect(() => stop()).not.toThrow();
  });
});
