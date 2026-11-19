import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRecorder } from './use-recorder';

// The microphone and MediaRecorder as the test says: each stream counts its stopped tracks.
const stops = vi.fn();
const stream = () => ({ getTracks: () => [{ stop: stops }] }) as unknown as MediaStream;
let failRecorder = false;

class FakeRecorder {
  static isTypeSupported = () => true;
  mimeType = 'audio/webm';
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  start() {
    if (failRecorder) throw new Error('recorder failed');
  }
  stop() {
    this.onstop?.();
  }
}

function deferred() {
  let open: (s: MediaStream) => void = () => undefined;
  const promise = new Promise<MediaStream>((resolve) => (open = resolve));
  return { promise, open: () => open(stream()) };
}

let ask = vi.fn(() => Promise.resolve(stream()));
beforeEach(() => {
  stops.mockClear();
  failRecorder = false;
  ask = vi.fn(() => Promise.resolve(stream()));
  vi.stubGlobal('MediaRecorder', FakeRecorder);
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: () => ask() },
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('useRecorder', () => {
  it('a second tap while the browser still asks opens no second stream', async () => {
    const pending = deferred();
    ask.mockReturnValueOnce(pending.promise);
    const { result } = renderHook(() => useRecorder());
    const first = result.current.start();
    void result.current.start();
    expect(ask).toHaveBeenCalledTimes(1);
    pending.open();
    await act(() => first);
    expect(result.current.state).toBe('recording');
  });

  it('leaving during the permission prompt frees the stream once it opens', async () => {
    const pending = deferred();
    ask.mockReturnValueOnce(pending.promise);
    const { result, unmount } = renderHook(() => useRecorder());
    const first = result.current.start();
    unmount();
    pending.open();
    await first;
    expect(stops).toHaveBeenCalled();
  });

  it('a recorder that fails to start frees the stream and says «denied»', async () => {
    failRecorder = true;
    const { result } = renderHook(() => useRecorder());
    await act(() => result.current.start());
    expect(stops).toHaveBeenCalled();
    expect(result.current.state).toBe('denied');
  });
});
