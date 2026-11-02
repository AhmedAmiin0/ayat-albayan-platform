import { nextFollowUpAt, type FollowUpNote } from '@ab/shared';
import {
  followUpDedupKey,
  followUpRow,
  followUpStep,
  leadZone,
  pickTwoSlots,
  sameInstant,
  type FollowUpLeadRow,
  type StageRow,
} from './follow-ups.plan';
import type { FollowUpsRepo } from './follow-ups.repo';

export type Outcome =
  | 'queued'
  | 'waiting'
  | 'advanced'
  | 'notDue'
  | 'waitingTemplate'
  | 'noSlots'
  | 'failed';

export interface Tick {
  lead: FollowUpLeadRow;
  hours: readonly number[];
  approved: boolean;
  now: Date;
  /** Free starts, loaded once per tick and only when a lead is due. */
  starts: () => Promise<Date[]>;
}

interface Note {
  due: Date | null;
  note: FollowUpNote | null;
  outcome: Outcome;
}
/** A due lead: its tick, the instant it fell due, and the repo that writes it. */
interface Due {
  repo: FollowUpsRepo;
  t: Tick;
  due: Date;
}
type StepHandler = (d: Due, prior: StageRow | null) => Promise<Outcome>;

const noteChanged = (lead: FollowUpLeadRow, s: Note): boolean =>
  !sameInstant(lead.next_follow_up_at, s.due) || lead.follow_up_note !== s.note;

/** Writes next_follow_up_at / follow_up_note only when they changed, then reports `outcome`. */
async function noteLead(repo: FollowUpsRepo, t: Tick, s: Note): Promise<Outcome> {
  if (noteChanged(t.lead, s)) {
    const next_follow_up_at = s.due?.toISOString() ?? null;
    await repo.sync(t.lead.id, { next_follow_up_at, follow_up_note: s.note });
  }
  return s.outcome;
}

/** The last stage's row left: the stage moves on (compare-and-set) and the next one falls due. */
async function advance({ repo, t }: Due): Promise<Outcome> {
  const { lead, hours } = t;
  const next = nextFollowUpAt({ ...lead, follow_up_stage: lead.follow_up_stage + 1 }, hours);
  await repo.advance({ id: lead.id, stage: lead.follow_up_stage, next });
  return 'advanced';
}

/** Two free slots → the follow_up_slots row (an unsent prior row goes first); else no_slots. */
async function queuePair(d: Due, prior: StageRow | null): Promise<Outcome> {
  const { repo, t, due } = d;
  const zone = leadZone(t.lead);
  const pair = pickTwoSlots(await t.starts(), zone.tz);
  if (!pair) return noteLead(repo, t, { due, note: 'no_slots', outcome: 'noSlots' });
  if (prior) await repo.drop(prior.id);
  const added = await repo.queue(followUpRow({ lead: t.lead, slots: pair, zone, now: t.now }));
  return noteLead(repo, t, { due, note: 'queued', outcome: added > 0 ? 'queued' : 'waiting' });
}

/** The template must be approved before anything is queued: the stage waits (waiting_template). */
async function queue(d: Due, prior: StageRow | null): Promise<Outcome> {
  const waiting: Note = { due: d.due, note: 'waiting_template', outcome: 'waitingTemplate' };
  if (!d.t.approved) return noteLead(d.repo, d.t, waiting);
  return queuePair(d, prior);
}

/** followUpStep → what a due lead does: requeue drops the unsent row, a plain queue drops none. */
const STEPS = {
  advance: (d) => advance(d),
  wait: (d) => noteLead(d.repo, d.t, { due: d.due, note: 'queued', outcome: 'waiting' }),
  queue: (d) => queue(d, null),
  requeue: (d, prior) => queue(d, prior),
} satisfies Record<ReturnType<typeof followUpStep>, StepHandler>;

/** One lead of a tick: not due yet → note only; due → the step its last stage row asks for. */
export async function stepLead(repo: FollowUpsRepo, t: Tick): Promise<Outcome> {
  const due = nextFollowUpAt(t.lead, t.hours);
  if (!due || due > t.now) return noteLead(repo, t, { due, note: null, outcome: 'notDue' });
  const prior = await repo.stageRow(followUpDedupKey(t.lead));
  return STEPS[followUpStep(prior)]({ repo, t, due }, prior);
}
