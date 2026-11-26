import type { ToError } from './errors.types';

/** A `raised` map entry per code, each answered by `toError(code)`. */
export function raisedAs(
  codes: readonly string[],
  toError: (code: string) => Error,
): Readonly<Record<string, ToError>> {
  return Object.fromEntries(codes.map((code) => [code, () => toError(code)]));
}
