import type { CaptureGuard } from './capture-guard.port';

/** A platform without the native module (web): nothing to block. */
export const noCaptureGuard: CaptureGuard = {
  block: () => Promise.resolve(),
  allow: () => Promise.resolve(),
};
