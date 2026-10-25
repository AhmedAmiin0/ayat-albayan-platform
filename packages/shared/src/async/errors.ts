/** The error's message, else the thrown value as text (a string, a code, …). */
export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** errorMessage, cut to `max` chars (500 = the error_text column checks). */
export function errorTextOf(e: unknown, max = 500): string {
  return errorMessage(e).slice(0, max);
}

/** An error that carries a stable machine code (for logs, columns and the UI's error-text maps). */
export class CodedError<C extends string = string> extends Error {
  readonly code: C;

  constructor(code: C, message?: string) {
    super(message ?? code);
    this.name = 'CodedError';
    this.code = code;
  }
}

/** The code of a CodedError (or of any error-like object with a string `code`), else null. */
export function errorCode(e: unknown): string | null {
  if (typeof e !== 'object' || e === null || !('code' in e)) return null;
  return typeof e.code === 'string' ? e.code : null;
}
