// Evolution pacing slots and the sender's wake-up (docs/19 «Evolution driver», messaging review).
// Each paced row gets its OWN slot after the number's last reserved one, so a backlog spreads out
// over time (a pass reads only the rows already due: other lines are never crowded out of the
// batch), and the sender is woken at the earliest slot instead of waiting for the 30 s poll.
// In memory: the API runs one sender; a restart only forgets the slots (rows keep their time).

const tails = new Map<string, number>();

/** The next free slot (ms) of a number: not before `earliest`, one gap after the last slot. */
export function reserveSlot(numberId: string, at: { earliest: number; gapMs: number }): number {
  const slot = Math.max(at.earliest, (tails.get(numberId) ?? 0) + at.gapMs);
  tails.set(numberId, slot);
  return slot;
}

let wake: (() => void) | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let timerAt = Number.POSITIVE_INFINITY;

/** The sender registers its kick (one process, one sender). */
export function onPaceDue(kick: () => void): void {
  wake = kick;
}

const fire = (): void => {
  timer = null;
  timerAt = Number.POSITIVE_INFINITY;
  wake?.();
};

/** Wake the sender at `at` (ms) unless an earlier wake-up is already set. */
export function wakeAt(at: number): void {
  if (wake === null || at >= timerAt) return;
  if (timer) clearTimeout(timer);
  timerAt = at;
  timer = setTimeout(fire, Math.max(0, at - Date.now()));
  timer.unref();
}

/** Tests only: forget every slot and timer. */
export function resetPaceSlots(): void {
  tails.clear();
  if (timer) clearTimeout(timer);
  timer = null;
  timerAt = Number.POSITIVE_INFINITY;
  wake = null;
}
