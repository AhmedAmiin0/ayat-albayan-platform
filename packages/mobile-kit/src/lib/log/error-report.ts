import { installErrorReporting, type UncaughtSource } from '@ab/client-core';
import type { ErrorReporter, ReportTransport } from '@ab/core';
import { z } from 'zod';

type GlobalHandler = (error: unknown, isFatal?: boolean) => void;

/** React Native's global error hook (the `ErrorUtils` global). */
interface ErrorUtilsLike {
  getGlobalHandler(): GlobalHandler;
  setGlobalHandler(handler: GlobalHandler): void;
}

interface MobileErrorOptions {
  dsn?: string;
  errorUtils?: ErrorUtilsLike;
  send?: ReportTransport;
}

/** The build's DSN, inlined by Expo at build time (written out in full for that). */
const buildDsn = (): string | undefined =>
  z.string().optional().parse(process.env.EXPO_PUBLIC_SENTRY_DSN);

/** The RN global; absent under jest and on web. */
const rnErrorUtils = (): ErrorUtilsLike | undefined =>
  (globalThis as { ErrorUtils?: ErrorUtilsLike }).ErrorUtils;

/** Our report first, then React Native's own handler (the red box, or the crash), as before. */
const globalErrors = (utils: ErrorUtilsLike | undefined): UncaughtSource => (handler) => {
  const previous = utils?.getGlobalHandler();
  utils?.setGlobalHandler((error, isFatal) => {
    handler(error);
    previous?.(error, isFatal);
  });
};

/**
 * Each app's entry (index.ts): uncaught JS errors go to EXPO_PUBLIC_SENTRY_DSN (Sentry or
 * GlitchTip) when the build sets it. Unset (as in git and eas.json) = nothing is hooked or sent.
 * Pure JS: no native module, so an OTA update can turn it on.
 */
export function installMobileErrorReporting(
  app: string,
  opts: MobileErrorOptions = { dsn: buildDsn(), errorUtils: rnErrorUtils() },
): ErrorReporter {
  const dsn = opts.dsn?.trim() || undefined;
  const listen = globalErrors(opts.errorUtils);
  return installErrorReporting({ dsn, app, listen, send: opts.send });
}
