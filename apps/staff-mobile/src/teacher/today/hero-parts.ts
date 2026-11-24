import {
  isRoomLive,
  type Hero,
  type LessonPlan,
  type PlanAction,
  type WayIn,
} from '@ab/client-core';
import type { joinWindow, LessonView } from '@ab/schedule';
import type { ClockCycle } from '@ab/time';
import { opensAtLine } from '@/classroom';
import type { LeadAction } from '@/teacher/lessons/TeacherRowAction';
import { teacherWord } from '@/teacher/lessons/teacher-word';

// What the teacher's hero shows besides its frame (docs/48). Pure.

const isButton = (a: PlanAction | null | undefined): a is LeadAction =>
  a !== null && a !== undefined && a !== 'cancel';

interface HeroButtons {
  lead: LeadAction | null;
  peer: LeadAction | null;
}

/** Cancel lives in the sheet; one outlined peer at most. */
export function heroButtons(plan: LessonPlan): HeroButtons {
  const peer = plan.peers.find(isButton);
  return { lead: isButton(plan.lead) ? plan.lead : null, peer: isButton(peer) ? peer : null };
}

type JoinWindow = ReturnType<typeof joinWindow>;

interface EarlyInput {
  win: JoinWindow | null;
  way: WayIn;
  clock: { tz: string; cycle: ClockCycle };
}

/** Room mode only. */
export function earlyLine({ win, way, clock }: EarlyInput): string | null {
  if (way !== 'room' || win?.state !== 'early') return null;
  return opensAtLine(win.opens_at, clock.cycle, clock.tz);
}

/** Null unless next, or running with a live room. */
export const heroWord = (hero: Hero<LessonView>, now: Date) =>
  hero.kind === 'next' || isRoomLive(hero.lesson.room) ? teacherWord(hero.lesson, now) : null;
