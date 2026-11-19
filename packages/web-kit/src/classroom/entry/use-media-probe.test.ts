import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useMediaProbe } from './use-media-probe';

const track = { stop: vi.fn(), getSettings: () => ({}) };
const stream = { getTracks: () => [track] } as unknown as MediaStream;

function browser(listing: () => Promise<MediaDeviceInfo[]>) {
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: vi.fn(() => Promise.resolve(stream)), enumerateDevices: vi.fn(listing) },
  });
}

describe('useMediaProbe', () => {
  it('frees the device when listing the devices fails after it opened', async () => {
    track.stop.mockClear();
    browser(() => Promise.reject(new Error('listing failed')));
    const input = { device: 'mic' as const, enabled: true, deviceId: undefined, attempt: 0 };
    const { result } = renderHook(() => useMediaProbe(input));
    await waitFor(() => expect(result.current.status).not.toBe('starting'));
    expect(track.stop).toHaveBeenCalled();
    expect(result.current.status).not.toBe('on');
  });

  it('keeps the track live when the listing answers', async () => {
    track.stop.mockClear();
    browser(() => Promise.resolve([]));
    const input = { device: 'cam' as const, enabled: true, deviceId: undefined, attempt: 0 };
    const { result } = renderHook(() => useMediaProbe(input));
    await waitFor(() => expect(result.current.status).toBe('on'));
    expect(track.stop).not.toHaveBeenCalled();
  });
});
