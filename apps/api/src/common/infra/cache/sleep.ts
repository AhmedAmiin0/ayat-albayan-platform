/** Waits `ms` (the retry helper's default wait in the api; @ab/shared has no timers). */
export function sleep(ms: number): Promise<void> {
  return new Promise((done) => setTimeout(done, ms));
}
