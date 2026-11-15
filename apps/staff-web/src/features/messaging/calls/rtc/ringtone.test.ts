import { afterEach, describe, expect, it, vi } from 'vitest';
import { startRingtone } from './ringtone';

function fakeAudio(state: AudioContextState) {
  const node = () => ({ connect: vi.fn(() => ({ connect: vi.fn() })), start: vi.fn(), stop: vi.fn(), frequency: { value: 0 } });
  const gain = () => ({ connect: vi.fn(() => ({ connect: vi.fn() })), gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() } });
  const ctx = { state, currentTime: 0, destination: {}, resume: vi.fn(async () => undefined), close: vi.fn(async () => undefined), createOscillator: node, createGain: gain };
  // A constructor that hands out the fake context (`new` on a function returning an object yields it).
  const Ctor = function () {
    return ctx;
  } as unknown as new () => AudioContext;
  return { ctx, Ctor };
}

afterEach(() => vi.useRealTimers());

describe('the incoming ring', () => {
  it('a suspended context is resumed now and again on the next pointerdown; stop closes it', () => {
    vi.useFakeTimers();
    const { ctx, Ctor } = fakeAudio('suspended');
    const tone = startRingtone(Ctor);
    expect(ctx.resume).toHaveBeenCalledTimes(1);
    window.dispatchEvent(new Event('pointerdown'));
    expect(ctx.resume).toHaveBeenCalledTimes(2);
    tone.stop();
    expect(ctx.close).toHaveBeenCalled();
  });

  it('a running context is not resumed; no WebAudio rings silently', () => {
    const { ctx, Ctor } = fakeAudio('running');
    startRingtone(Ctor).stop();
    expect(ctx.resume).not.toHaveBeenCalled();
    expect(() => startRingtone(null).stop()).not.toThrow();
  });
});
