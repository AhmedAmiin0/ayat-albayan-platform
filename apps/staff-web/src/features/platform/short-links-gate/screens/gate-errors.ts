import { t } from '@ab/web-kit';
import type { GateError } from '@/features/platform/short-links-gate/use-gate-phone';

/** The words of a step's error (shortLinks.gate.errors), or none. */
export const errorText = (error: GateError | null): string | undefined =>
  error === null ? undefined : t.shortLinks.gate.errors[error];
