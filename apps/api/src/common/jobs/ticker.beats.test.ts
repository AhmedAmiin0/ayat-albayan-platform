import { describe, expect, it, vi } from 'vitest';
import type { BeatSink } from './beats/beat-book.types';
import { Ticker } from './ticker';

function fakeBeats() {
  return {
    register: vi.fn<BeatSink['register']>(),
    ok: vi.fn<BeatSink['ok']>(),
    fail: vi.fn<BeatSink['fail']>(),
    forget: vi.fn<BeatSink['forget']>(),
  };
}

describe('Ticker heartbeats (docs/09 «Readiness»)', () => {
  it('start() registers an interval job with the timing it runs on', () => {
    const beats = fakeBeats();
    const ticker = new Ticker({ name: 'j', firstMs: 5, everyMs: 60, run: async () => undefined, beats });
    ticker.start({ firstMs: 7, everyMs: 90 });
    expect(beats.register).toHaveBeenCalledWith({ name: 'j', firstMs: 7, everyMs: 90 });
    ticker.stop();
    expect(beats.forget).toHaveBeenCalledWith('j');
  });

  it('a one-shot job (no interval) has no heartbeat', () => {
    const beats = fakeBeats();
    const ticker = new Ticker({ name: 'boot', firstMs: 5, run: async () => undefined, beats });
    ticker.start();
    expect(beats.register).not.toHaveBeenCalled();
    ticker.stop();
  });

  it('each finished pass is a success, a rejected one an error', async () => {
    const beats = fakeBeats();
    const boom = new Error('db down');
    const run = vi.fn().mockRejectedValueOnce(boom).mockResolvedValue(undefined);
    const ticker = new Ticker({ name: 'j', firstMs: 1, everyMs: 1, run, beats });
    await ticker.tick();
    expect(beats.fail).toHaveBeenCalledWith('j', boom);
    expect(beats.ok).not.toHaveBeenCalled();
    await ticker.tick();
    expect(beats.ok).toHaveBeenCalledWith('j');
  });
});
