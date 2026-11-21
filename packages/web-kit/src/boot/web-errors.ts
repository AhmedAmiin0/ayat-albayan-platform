import { installErrorReporting, type UncaughtSource } from '@ab/client-core';
import type { ErrorReporter, ReportTransport } from '@ab/shared';
import { z } from 'zod';

/** The build's DSN (Sentry or GlitchTip); unset in git and in every build = no reporting at all. */
const buildEnv = z.object({ VITE_SENTRY_DSN: z.string().trim().optional() });

/** What the browser puts on the event: the thrown error, or the rejection's reason. */
const thrown = z.object({ error: z.unknown() });
const rejected = z.object({ reason: z.unknown() });

interface WebErrorOptions {
  env?: Record<string, unknown>;
  target?: Pick<EventTarget, 'addEventListener'>;
  send?: ReportTransport;
}

const windowErrors = (target: Pick<EventTarget, 'addEventListener'>): UncaughtSource =>
  (handler) => {
    target.addEventListener('error', (e) => handler(thrown.parse(e).error));
    target.addEventListener('unhandledrejection', (e) => handler(rejected.parse(e).reason));
  };

/** Both web apps (startApp): uncaught errors and rejections go to VITE_SENTRY_DSN when set. */
export function installWebErrorReporting(opts: WebErrorOptions = {}): ErrorReporter {
  const { VITE_SENTRY_DSN } = buildEnv.parse(opts.env ?? import.meta.env);
  const listen = windowErrors(opts.target ?? window);
  const dsn = VITE_SENTRY_DSN || undefined;
  return installErrorReporting({ dsn, app: 'web', listen, send: opts.send });
}
