import { ApiError } from '../../core/http/index.js';

// The words for a failed report call (docs/11 §3), shared by both apps (docs/27 E5). Each app injects its `t`;
// what a call that never reached the API says (no ApiError) stays the app's choice.

/** The domain `code` of an API error, else its first validation issue (`missing_grades`, `attachment_type`, …). */
export function reportErrorCode(error: unknown): string | null {
  if (!(error instanceof ApiError) || typeof error.body !== 'object' || error.body === null) return null;
  const body = error.body as { code?: unknown; issues?: { message?: unknown }[] };
  const code = typeof body.code === 'string' ? body.code : body.issues?.[0]?.message;
  return typeof code === 'string' ? code : null;
}

/** The app's `t.reports.error`, `t.lessons.invalidTransition` and `t.common.error`. */
export interface ReportErrorText {
  errors: Record<string, string>;
  invalidTransition: string;
  generic: string;
}

/** The error's code in the app's words (read on every call), else the generic error. */
export function reportErrorWords(text: () => ReportErrorText): (error: unknown) => string {
  return (error) => {
    const { errors, invalidTransition, generic } = text();
    const words: Record<string, string> = { ...errors, invalid_transition: invalidTransition };
    return words[reportErrorCode(error) ?? ''] ?? generic;
  };
}
