import { overlayNumbers, type OverlayNumber } from '@/common/configuration/integrations/numbers-overlay';
import type { NumberRoute } from '@/modules/messaging/whatsapp/numbers/number-route';
import type { DueMessage } from '@/modules/messaging/whatsapp/sender/sender.due';
import type { EvolutionPaceRepo } from './evolution-pace.repo';

// An Evolution Baileys number's pace and daily cap at claim time (docs/19 «Evolution driver», ban
// risk). Never a sleep: a row that must wait is moved to later (next_attempt_at) and the pass goes
// on with the next row, so a paced number never delays another line's (Kapso, CRM, Meta) rows.

/** What the claim asks the number's client (absent / null = no pacing: every other driver). */
interface PaceSource {
  pace(row: DueMessage, via: NumberRoute): { waitMs: number; dailyCap: number } | null;
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

/** When the row may go: null = now; else the gap's end, or the next UTC day once capped. */
async function laterOf(repo: EvolutionPaceRepo, at: PaceAt & { waitMs: number; dailyCap: number }) {
  if (at.waitMs > 0) return new Date(at.now.getTime() + at.waitMs);
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
  if (later) await repo.defer(at.row.id, later);
  return later !== null;
}

/** The row is pinned to an Evolution number that cannot send now (off, restricted, no config). */
export function evolutionOff(row: Pick<DueMessage, 'number_id' | 'template_key'>): boolean {
  const n = overlayNumbers()?.find((x) => x.id === row.number_id && x.evolution === true);
  return row.template_key === null && n !== undefined && !canSend(n);
}

const canSend = (n: OverlayNumber): boolean => n.enabled && n.env !== null;
