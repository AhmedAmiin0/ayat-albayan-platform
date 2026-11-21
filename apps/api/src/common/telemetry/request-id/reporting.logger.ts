import type { ErrorReporter, ReportTags } from '@ab/shared';
import { currentRequestId } from './request-id';
import { RequestIdLogger } from './request-id.logger';

const STACK = /\n\s+at /;

/** Nest logs an unhandled error as (message, stack, context); a job as (message[, context]). */
function asError(message: unknown, stack: unknown): unknown {
  if (message instanceof Error) return message;
  const error = new Error(String(message));
  if (typeof stack === 'string' && STACK.test(stack)) error.stack = stack;
  return error;
}

function tagsOf(rest: readonly unknown[]): ReportTags {
  const id = currentRequestId();
  const context = rest.at(-1);
  const tags: Record<string, string> = id === undefined ? {} : { request_id: id };
  if (rest.length > 0 && typeof context === 'string') tags.context = context;
  return tags;
}

/**
 * RequestIdLogger whose error lines also go to the error tracker (SENTRY_DSN). With no DSN the
 * reporter is off and this logs exactly as RequestIdLogger: nothing else happens.
 */
export class ReportingLogger extends RequestIdLogger {
  constructor(private readonly reporter: ErrorReporter) {
    super();
  }

  override error(message: unknown, ...rest: unknown[]): void {
    super.error(message, ...rest);
    if (!this.reporter.enabled) return;
    this.reporter.capture(asError(message, rest[0]), tagsOf(rest));
  }
}
