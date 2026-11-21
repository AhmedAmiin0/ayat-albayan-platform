/**
 * The app's one console line: a warning reaches the device log (logcat, Xcode) in release builds
 * too. Callers decide whether it is for development only. Uncaught errors may also go to an
 * optional tracker (error-report.ts, off without EXPO_PUBLIC_SENTRY_DSN).
 */
export function logWarning(...parts: unknown[]): void {
  console.warn(...parts);
}
