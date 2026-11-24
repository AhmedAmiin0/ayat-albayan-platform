import { createErrorReporter, type ErrorReporter, type ReportTransport } from '@ab/core';

/** How a host hands its uncaught errors over (window events on web, ErrorUtils on a phone). */
export type UncaughtSource = (handler: (error: unknown) => void) => void;

interface InstallOptions {
  /** The build's DSN (VITE_SENTRY_DSN, EXPO_PUBLIC_SENTRY_DSN); unset in git = off. */
  dsn: string | undefined;
  app: string;
  listen: UncaughtSource;
  /** The HTTP call (tests pass a fake). */
  send?: ReportTransport;
}

/** keepalive: a report sent as the page unloads still leaves. */
const post: ReportTransport = (url, init) => fetch(url, { ...init, keepalive: true });

/**
 * Optional error tracker for the web and phone apps (Sentry or GlitchTip). Without a valid DSN
 * nothing is listened to and nothing is sent: the app runs exactly as before.
 */
export function installErrorReporting(opts: InstallOptions): ErrorReporter {
  const reporter = createErrorReporter({ dsn: opts.dsn, app: opts.app, send: opts.send ?? post });
  if (reporter.enabled) opts.listen((error) => reporter.capture(error));
  return reporter;
}
