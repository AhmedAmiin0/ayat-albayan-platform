import type { TrialHistory } from '@ab/shared';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { FormAlert } from '@/components/ui/form-alert';
import { t } from '@/lib/i18n';
import { BookingWizard } from '../BookingWizard';
import type { BookingDraft, PickedStudent } from '../draft';
import type { BookHint } from '../hint';
import { BookingModeContext, ChatReturnContext, type BookingMode } from '../mode';
import { trialHistoryQuery } from './api';
import { trialDateDraft, trialHint, type TrialStudentFacts } from './draft';
import { TrialHistoryBody, TrialHistoryTitle } from './TrialHistoryBody';

export interface TrialDateDialogProps {
  student: PickedStudent;
  /** admin (the student file) or sales (the family chat): the booking base and the override. */
  mode: BookingMode;
  /** The admin's profile: program, teacher preference and zone; sales: none. */
  facts?: TrialStudentFacts | undefined;
  onClose: () => void;
}

const noop = () => undefined;
type Start = { draft: BookingDraft; hint: BookHint | null };

/** The history behind «عرض المواعيد» (collapsed: the wizard comes first), with its count. */
function HistoryToggle({ query }: { query: UseQueryResult<TrialHistory> }) {
  const [open, setOpen] = useState(false);
  return (
    <section aria-label={t.trialDate.historyTitle} className="mb-4 grid gap-2 border-b border-rule pb-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TrialHistoryTitle history={query.data} />
        <Button type="button" size="sm" variant="ghost" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {open ? t.trialDate.web.hideHistory : t.trialDate.showHistory}
        </Button>
      </div>
      {open && <TrialHistoryBody query={query} />}
    </section>
  );
}

/**
 * «موعد تجريبي جديد» (owner 2026-10-25; R-SCH-06, R-SCH-07, R-ASST-01): the booking wizard's reduced
 * flow teacher → slot → review in a dialog, for one existing student without a running subscription.
 * The last trial's teacher is preselected (changeable); the grid leaves out the trial being moved;
 * the review says whether it moves the upcoming trial or books a new one, and warns from the 3rd
 * date. A subscriber gets the reason instead. The first draft is held: the refetch after booking
 * never resets the done panel.
 */
export function TrialDateDialog({ student, mode, facts, onClose }: TrialDateDialogProps) {
  const history = useQuery(trialHistoryQuery(student.id, mode));
  const [start, setStart] = useState<Start | null>(null);
  const data = history.data;
  if (!start && data?.allowed) setStart({ draft: trialDateDraft({ student, history: data, facts }), hint: trialHint(data) });
  const blocked = !start && data && !data.allowed;
  return (
    <Dialog title={t.trialDate.title.replace('{name}', student.name)} onClose={onClose} wide>
      <div data-testid="trial-date-dialog">
        <HistoryToggle query={history} />
        {blocked && <p role="status" className="rounded-md bg-sunk px-3.5 py-2.5 text-sm">{t.trialDate.notAllowed}</p>}
        {!start && history.isPending && <p className="text-sm text-ink-3">{t.common.loading}</p>}
        {!start && history.isError && (
          <FormAlert>
            {t.trialDate.loadError}{' '}
            <Button type="button" size="sm" variant="ghost" onClick={() => void history.refetch()}>{t.trialDate.retry}</Button>
          </FormAlert>
        )}
        {start && (
          <BookingModeContext.Provider value={mode}>
            <ChatReturnContext.Provider value={onClose}>
              <BookingWizard initial={start.draft} primary={null} siblings={[]} onOpenStudent={noop} hint={start.hint} />
            </ChatReturnContext.Provider>
          </BookingModeContext.Provider>
        )}
      </div>
    </Dialog>
  );
}
