import { Logger } from '@nestjs/common';

// docs/42 R1 / 42-1: a job that queues notification rows (reminders, renewals, follow-ups,
// report-ready) wakes the outbound sender at once instead of leaving the rows for its 30 s poll.
// Module-level like pace-slots' onPaceDue: the sender registers its kick (one process, one sender;
// in an `api` process its kick goes to the worker), the repos call wakeSender() after a write.
// A wake only starts a normal pass: the pass still reads the send gate (uncached) before every
// row (docs/42 §3, docs/26 26-P4).

type Kick = () => Promise<unknown>;

const log = new Logger('SenderWake');
let kick: Kick | null = null;
let inflight = false;
let again = false;

/** The sender registers its kick at boot (null: forget it, e.g. on shutdown). */
export function onSenderWake(next: Kick | null): void {
  kick = next;
}

const warn = (e: unknown): void => {
  log.warn(`sender wake failed (${e instanceof Error ? e.message : String(e)}), left for its poll`);
};

function settle(): void {
  inflight = false;
  if (again) wakeSender();
}

function fire(run: Kick): void {
  inflight = true;
  again = false;
  // In a microtask: a kick that throws at once still never reaches the caller.
  void Promise.resolve().then(run).catch(warn).finally(settle);
}

/**
 * Fire and forget: never throws, never waits for the pass. Coalesced: wakes while a kick is in
 * flight become ONE more kick after it (a burst of rows = one extra pass, as Ticker.kick does).
 * No sender registered (tests, a process without one): nothing happens, the poll still runs.
 */
export function wakeSender(): void {
  again = inflight;
  if (inflight || kick === null) return;
  fire(kick);
}

/** A repo's write: one wake when it queued rows (none queued: no wake); returns `queued`. */
export function wakeOn(queued: number): number {
  if (queued > 0) wakeSender();
  return queued;
}

/** Tests only: forget the kick and any wake in flight. */
export function resetSenderWake(): void {
  kick = null;
  inflight = false;
  again = false;
}
