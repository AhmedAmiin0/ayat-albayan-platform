/**
 * No answer at all: React Native's fetch rejects with «TypeError: Network request failed» (an HTTP
 * error is an ApiError instead, and a cancelled request an AbortError). The app has no NetInfo, so
 * this is how «offline» is known.
 */
export function isNetworkError(error: unknown): boolean {
  return error instanceof TypeError;
}
