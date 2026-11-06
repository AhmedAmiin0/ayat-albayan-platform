// Evolution pacing slots and the sender's wake-ups (docs/19 «Evolution driver», messaging review).
// Each paced conversation gets its OWN slot after the number's last reserved one, so a backlog
// spreads out over time (a pass reads only the rows already due: other lines are never crowded
// out of the batch). One recipient keeps one slot while it is ahead, so its rows move together and
// stay in order. Every slot is a wake-up: after one fires the next is armed (review fix 7: a
// backlog never waits for the 30 s poll between two sends).
// In memory: the API runs one sender; a restart only forgets the slots (rows keep their time).

const tails = new Map<string, number>();
const phones = new Map<string, number>();

interface SlotAt {
  /** Not before this (ms): now + the pacer's wait. */
  earliest: number;
  gapMs: number;
  /** The recipient: a slot still ahead for it is reused (its rows stay together). */
  phone: string;
  now: number;
}

/** The recipient's slot ahead, else the next free slot of the number (one gap after its last). */
export function reserveSlot(numberId: string, at: SlotAt): number {
  const key = `${numberId}|${at.phone}`;
  const ahead = phones.get(key) ?? 0;
  if (ahead > at.now) return ahead;
  const slot = Math.max(at.earliest, (tails.get(numberId) ?? 0) + at.gapMs);
  tails.set(numberId, slot);
  phones.set(key, slot);
  return slot;
}

let wake: (() => void) | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let timerAt = Number.POSITIVE_INFINITY;
/** Every slot still to wake for (ms), soonest first. */
let pending: number[] = [];

/** The sender registers its kick (one process, one sender). */
export function onPaceDue(kick: () => void): void {
  wake = kick;
}

/** Arms the timer for the soonest pending slot (only when it is sooner than the armed one). */
function arm(): void {
  const next = pending[0];
  if (wake === null || next === undefined || next >= timerAt) return;
  if (timer) clearTimeout(timer);
  timerAt = next;
  timer = setTimeout(fire, Math.max(0, next - Date.now()));
  timer.unref();
}

function fire(): void {
  timer = null;
  timerAt = Number.POSITIVE_INFINITY;
  const now = Date.now();
  pending = pending.filter((at) => at > now);
  wake?.();
  arm();
}

/** Wake the sender at `at` (ms), and at every other slot still pending after it. */
export function wakeAt(at: number): void {
  if (wake === null || pending.includes(at)) return;
  pending = [...pending, at].sort((a, b) => a - b);
  arm();
}

/** Tests only: forget every slot and timer. */
export function resetPaceSlots(): void {
  tails.clear();
  phones.clear();
  if (timer) clearTimeout(timer);
  timer = null;
  timerAt = Number.POSITIVE_INFINITY;
  pending = [];
  wake = null;
}
