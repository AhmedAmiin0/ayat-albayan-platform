/**
 * docs/42 42-4: a kick follows an enqueue or a retry, so its pass skips the idle probe (anyDue) and
 * reads the queue at once. The timers' passes keep the probe. A kick during a run is taken by the
 * run it queued.
 */
export class KickFlag {
  private kicked = false;

  set(): void {
    this.kicked = true;
  }

  /** Whether a kick asked for this pass; clears it. */
  take(): boolean {
    const kicked = this.kicked;
    this.kicked = false;
    return kicked;
  }
}
