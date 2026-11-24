import { createErrorReporter, type ErrorReporter, type ReportTransport } from '@ab/core';
import { Logger } from '@nestjs/common';
import { z } from 'zod';

/** Optional: a Sentry or GlitchTip DSN; unset (as in git) = no reporting at all. */
const telemetryEnv = z.object({ SENTRY_DSN: z.string().trim().optional() });

interface ReporterDeps {
  send?: ReportTransport;
  warn?: (text: string) => void;
}

const log = new Logger('ErrorReport');
const DEFAULTS: Required<ReporterDeps> = {
  send: (url, init) => fetch(url, init),
  warn: (text) => log.warn(text),
};

/** The API's and the worker's error tracker, from SENTRY_DSN (never logged). */
export function apiErrorReporter(
  source: NodeJS.ProcessEnv,
  deps: ReporterDeps = {},
): ErrorReporter {
  const { send, warn } = { ...DEFAULTS, ...deps };
  const dsn = telemetryEnv.parse(source).SENTRY_DSN || undefined;
  const reporter = createErrorReporter({ dsn, app: 'api', send });
  const invalid = dsn !== undefined && !reporter.enabled;
  if (invalid) warn('SENTRY_DSN is set but is not a valid DSN: error reporting stays off');
  return reporter;
}
