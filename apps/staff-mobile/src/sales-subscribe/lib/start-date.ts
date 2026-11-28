import { salesStartDate, usedBeforeProblem } from '@ab/shared';
import { t } from '@ab/mobile-kit';
import { usedBefore } from '@/subscribe';

// docs/16 row 24: days are the academy's (Riyadh) and never typed (rule 6), as the API checks.

export interface StartDraft {
  /** The chip picked (academy YYYY-MM-DD). */
  day: string;
  alreadyStarted: boolean;
  /** The past day picked while it is on (YYYY-MM-DD, from the DatePickerField). */
  past: string;
  /** Zero when off. */
  usedBefore: number;
}

/** The used lessons that count: 0 with the switch off, else clamped to the package now picked. */
export const usedBeforeOf = (draft: StartDraft, lessonsTotal: number): number =>
  draft.alreadyStarted ? usedBefore(draft.usedBefore, lessonsTotal) : 0;

/** What POST /sales/subscriptions gets: nothing, a day, or a past day with alreadyStarted (and the used lessons). */
interface StartBody {
  startsOn?: string;
  alreadyStarted?: true;
  lessonsUsedBefore?: number;
}
type StartCheck = { ok: true; body: StartBody } | { ok: false; error: string };

interface StartContext {
  canSet: boolean;
  /** The academy's (Riyadh) day, as the API checks it. */
  today: string;
  /** The picked package's lessons (the quote's). */
  lessonsTotal: number;
}

export function checkStart(draft: StartDraft, context: StartContext): StartCheck {
  if (!context.canSet) return { ok: true, body: {} };
  const startsOn = draft.alreadyStarted ? draft.past : draft.day;
  const alreadyStarted = draft.alreadyStarted ? true : undefined;
  const result = salesStartDate({ startsOn, alreadyStarted, canSet: true, today: context.today });
  if (!result.ok) return { ok: false, error: t.salesMoney.error[result.code] };
  if (!alreadyStarted) return { ok: true, body: { startsOn: result.startsOn } };
  const lessonsUsedBefore = usedBeforeOf(draft, context.lessonsTotal);
  const problem = usedBeforeProblem({
    lessonsUsedBefore,
    startsOn: result.startsOn,
    today: context.today,
    canSet: true,
    lessonsTotal: context.lessonsTotal,
  });
  if (problem) return { ok: false, error: t.salesMoney.error[problem] };
  return {
    ok: true,
    body: {
      startsOn: result.startsOn,
      alreadyStarted,
      ...(lessonsUsedBefore > 0 ? { lessonsUsedBefore } : {}),
    },
  };
}
