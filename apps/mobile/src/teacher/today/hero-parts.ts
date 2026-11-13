import type { LessonPlan, PlanAction, WayIn } from '@ab/client-core';
import type { ClockCycle, joinWindow } from '@ab/shared';
import { opensAtLine } from '@/classroom';
import type { LeadAction } from '@/teacher/lessons/TeacherRowAction';

// What the teacher's hero shows besides its frame (docs/48). Pure.

const isButton = (a: PlanAction | null | undefined): a is LeadAction =>
  a !== null && a !== undefined && a !== 'cancel';

interface HeroButtons {
  lead: LeadAction | null;
  peer: LeadAction | null;
}

/** The filled lead, and ONE outlined peer: her fixed link or the report (cancel is the sheet's). */
export function heroButtons(plan: LessonPlan): HeroButtons {
  const peer = plan.peers.find((a) => a === 'join' || a === 'report');
  return { lead: isButton(plan.lead) ? plan.lead : null, peer: isButton(peer) ? peer : null };
}

type JoinWindow = ReturnType<typeof joinWindow>;

interface EarlyInput {
  win: JoinWindow | null;
  way: WayIn;
  clock: { tz: string; cycle: ClockCycle };
}

/** «تُفتح الساعة 19:45» while the classroom is not open yet (room mode only). */
export function earlyLine({ win, way, clock }: EarlyInput): string | null {
  if (way !== 'room' || win?.state !== 'early') return null;
  return opensAtLine(win.opens_at, clock.cycle, clock.tz);
}
