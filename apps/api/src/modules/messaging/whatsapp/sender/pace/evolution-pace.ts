import { overlayNumbers } from '@/common/configuration/integrations/numbers-overlay';
import type { NumberRoute } from '@/modules/messaging/whatsapp/numbers/number-route';
import type { DueMessage } from '@/modules/messaging/whatsapp/sender/sender.due';
import type { EvolutionPaceRepo } from './evolution-pace.repo';
import { reserveSlot, wakeAt } from './pace-slots';

// An Evolution Baileys number's pace and daily cap at claim time (docs/19 «Evolution driver», ban
// risk). Never a sleep: a row that must wait is moved to later (next_attempt_at) and the pass goes
// on with the next row, so a paced number never delays another line's (Kapso, CRM, Meta) rows.

interface PaceAnswer {
  waitMs: number;
  dailyCap: number;
  gapMs: number;
}

/** What the claim asks the number's client (absent / null = no pacing: every other driver). */
interface PaceSource {
  pace(row: DueMessage, via: NumberRoute): PaceAnswer | null;
}

interface PaceDeps {
  dispatch: PaceSource;
  repo: EvolutionPaceRepo | undefined;
}

interface PaceAt {
  row: DueMessage;
  route: NumberRoute;
  now: Date;
}

const DAY_MS = 86_400_000;
/** The UTC day of `now` starts (the cap counts per UTC day). */
const dayStart = (now: Date): Date => new Date(Math.floor(now.getTime() / DAY_MS) * DAY_MS);

type Pace = NonNullable<ReturnType<PaceSource['pace']>>;

/** When the row may go: null = now; else its own slot after the gap, or the next UTC day. */
async function laterOf(repo: EvolutionPaceRepo, at: PaceAt & Pace) {
  const earliest = Math.max(at.now.getTime(), Date.now()) + at.waitMs;
  const slot = (): Date => new Date(reserveSlot(at.route.numberId, { earliest, gapMs: at.gapMs }));
  if (at.waitMs > 0) return slot();
  const start = dayStart(at.now);
  const sent = await repo.sentSince(at.route.numberId, start);
  return sent >= at.dailyCap ? new Date(start.getTime() + DAY_MS) : null;
}

/** true = the row was moved to later (not claimed, not sent this pass). */
export async function pacedLater(deps: PaceDeps, at: PaceAt): Promise<boolean> {
  const { repo } = deps;
  const pace = repo ? deps.dispatch.pace(at.row, at.route) : null;
  if (!pace || !repo) return false;
  const later = await laterOf(repo, { ...at, ...pace });
  if (!later) return false;
  await repo.defer(at.row.id, later);
  wakeAt(later.getTime());
  return true;
}

/**
 * The row is pinned to an Evolution number that is switched off (by an admin or a restriction).
 * A missing config (env null while enabled) is a gap to fix, not a reason to fail rows.
 */
export function evolutionOff(row: Pick<DueMessage, 'number_id' | 'template_key'>): boolean {
  const n = overlayNumbers()?.find((x) => x.id === row.number_id && x.evolution === true);
  return row.template_key === null && n !== undefined && !n.enabled;
}
