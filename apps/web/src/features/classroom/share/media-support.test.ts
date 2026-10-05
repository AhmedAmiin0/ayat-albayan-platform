import { describe, expect, it } from 'vitest';
import { canShareScreen } from './media-support';

describe('canShareScreen', () => {
  it('true only where getDisplayMedia is a function (desktop browsers)', () => {
    expect(canShareScreen({ mediaDevices: { getDisplayMedia: () => undefined } })).toBe(true);
  });

  it('false on phones (no getDisplayMedia), or without mediaDevices (an http page)', () => {
    expect(canShareScreen({ mediaDevices: {} })).toBe(false);
    expect(canShareScreen({})).toBe(false);
    expect(canShareScreen({ mediaDevices: undefined })).toBe(false);
  });
});
