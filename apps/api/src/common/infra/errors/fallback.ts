import { errorMessage } from '@ab/core';
import { Logger } from '@nestjs/common';

const log = new Logger('Fallback');

/** The promise's value, or the fallback after one warning when it rejects; never silent. */
export function orFallback<T, F>(promise: Promise<T>, fallback: F, what: string): Promise<T | F> {
  return promise.catch((e: unknown) => {
    log.warn(`${what} failed, using the fallback: ${errorMessage(e)}`);
    return fallback;
  });
}
