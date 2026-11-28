/**
 * Blocks or allows screenshots and screen recording of the whole app. Both calls are idempotent;
 * a rejection means the native side refused (the caller logs it, the app goes on).
 */
export interface CaptureGuard {
  block(): Promise<void>;
  allow(): Promise<void>;
}

export interface ExpoGuardOptions {
  /** iOS only: also blur the app-switcher snapshot (Android's secure window already hides it). */
  switcher: boolean;
}
