import { deviceTimeZone, resolveViewerTz } from '@ab/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setViewerPersonTz, subscribeViewerTz, viewerTz, viewerTzFor } from './viewer-tz.js';

const device = resolveViewerTz({ device: deviceTimeZone() });

describe('viewer tz store (docs/34 §2)', () => {
  afterEach(() => setViewerPersonTz(null));

  it('starts on the device zone', () => {
    expect(viewerTz()).toBe(device);
  });

  it('follows the person’s tz, then back to the device on sign-out', () => {
    const other = device === 'Africa/Cairo' ? 'Asia/Riyadh' : 'Africa/Cairo';
    const listener = vi.fn();
    const stop = subscribeViewerTz(listener);
    setViewerPersonTz(other);
    expect(viewerTz()).toBe(other);
    setViewerPersonTz(other);
    expect(listener).toHaveBeenCalledTimes(1);
    setViewerPersonTz(null);
    expect(viewerTz()).toBe(device);
    expect(listener).toHaveBeenCalledTimes(2);
    stop();
  });

  it('ignores a zone the engine cannot read', () => {
    setViewerPersonTz('Mars/Base');
    expect(viewerTz()).toBe(device);
  });

  it('viewerTzFor reads the device zone captured at start, even after the engine zone moves', () => {
    expect(viewerTzFor('Africa/Cairo')).toBe('Africa/Cairo');
    const moved = device === 'Asia/Dubai' ? 'Asia/Qatar' : 'Asia/Dubai';
    const spy = vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions');
    spy.mockReturnValue({ ...new Intl.DateTimeFormat().resolvedOptions(), timeZone: moved });
    expect(viewerTzFor(null)).toBe(device);
    setViewerPersonTz(null);
    expect(viewerTzFor(null)).toBe(viewerTz());
    spy.mockRestore();
  });
});
