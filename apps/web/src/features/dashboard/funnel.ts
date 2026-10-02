import type { LeadStatus } from '@ab/shared';

// R-RPT-01 funnel new → trial_booked → trial_done → converted, from the leads' CURRENT status
// (issue F3: statuses, not formulas). A lead counts at every stage up to the one it is in now; a
// lead that is now no_reply / lost / contacted counts only as «new».
// ponytail: no status history is read, so a lost lead that once had a trial is not counted at
// trial_done; add a lead status log when the owner wants the true stage-reached funnel.

export const FUNNEL_STAGES = ['new', 'trial_booked', 'trial_done', 'converted'] as const;
export type FunnelStage = (typeof FUNNEL_STAGES)[number];

const STAGE_OF: Record<LeadStatus, number> = {
  new: 0,
  contacted: 0,
  interested_no_slot: 0,
  no_reply: 0,
  lost: 0,
  trial_booked: 1,
  trial_done: 2,
  converted: 3,
};

export interface FunnelStep {
  stage: FunnelStage;
  /** Leads at this stage or past it. */
  reached: number;
  /** reached ÷ the previous stage's reached; null for the first stage or when it had none. */
  rate: number | null;
}

export function funnelSteps(funnel: Readonly<Record<LeadStatus, number>>): FunnelStep[] {
  const entries = Object.entries(funnel) as [LeadStatus, number][];
  const reached = FUNNEL_STAGES.map((_, i) => entries.reduce((n, [s, c]) => (STAGE_OF[s] >= i ? n + c : n), 0));
  return FUNNEL_STAGES.map((stage, i) => {
    const prev = i === 0 ? 0 : (reached[i - 1] ?? 0);
    const here = reached[i] ?? 0;
    return { stage, reached: here, rate: i === 0 || prev === 0 ? null : here / prev };
  });
}
