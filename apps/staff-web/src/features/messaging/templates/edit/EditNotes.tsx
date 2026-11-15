import { t } from '@/lib/i18n/i18n';
import { useClock } from '@/lib/clock';
import { fullTime } from '@/features/messaging/inbox';
import type { EditStage, EditState } from './edit-state';

const S = t.templates.edit;

/** The one line under Meta's rules that says what this save will do, or why it cannot. */
const STAGE_NOTE: Record<EditStage, string | null> = {
  blocked: S.pendingNote,
  limited: null,
  local: S.localNote,
  meta: null,
};

/** Meta's edit rules, the code-bound rule, and this template's own situation (owner 2026-11-14). */
export function EditNotes({ state }: { state: EditState }) {
  const clock = useClock();
  const note = STAGE_NOTE[state.stage];
  const next = state.nextAt ? S.nextAt.replace('{when}', fullTime(state.nextAt, clock)) : null;
  return (
    <section aria-label={S.limitsTitle} className="grid gap-1 rounded-md bg-sunk p-3 text-sm text-ink-2">
      <h3 className="text-sm font-semibold text-ink">{S.limitsTitle}</h3>
      <ul className="grid list-disc gap-1 ps-5">
        <li>{S.limitApproved}</li>
        <li>{S.limitFixed}</li>
        <li>{S.limitReview}</li>
      </ul>
      {state.bound && (
        <p role="note" className="border-s-2 border-s-act ps-3 font-semibold text-ink">
          {S.codeBound}
        </p>
      )}
      {note && <p role="note">{note}</p>}
      {next && (
        <p role="status" className="font-semibold text-act">
          {next}
        </p>
      )}
    </section>
  );
}
