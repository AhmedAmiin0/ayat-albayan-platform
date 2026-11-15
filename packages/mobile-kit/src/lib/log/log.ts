/**
 * The app's one console line (it has no remote error reporter): a warning reaches the device log
 * (logcat, Xcode) in release builds too. Callers decide whether it is for development only.
 */
export function logWarning(...parts: unknown[]): void {
  console.warn(...parts);
}
