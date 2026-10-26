/** Default tick of the outbound sender, and its first run after boot. */
export const SENDER_POLL_MS = 30_000;
/** Soon after boot, not at once: every API test boots AppModule (as ReportPdfJob notes). */
export const SENDER_FIRST_RUN_MS = 30_000;

/** env MESSAGE_SENDER_POLL_MS (e2e) replaces both; unset keeps the 30 s production cadence. */
export function senderTiming(pollMs: number | undefined): { firstMs: number; everyMs: number } {
  return pollMs ? { firstMs: pollMs, everyMs: pollMs } : { firstMs: SENDER_FIRST_RUN_MS, everyMs: SENDER_POLL_MS };
}
