import { Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { ButtonRow } from '@/components/ui/layout/button-row';
import { t } from '@/lib/i18n/i18n';
import { lessonErrorText } from '@/features/teaching/schedule/api';
import { MoveReason } from '@/features/teaching/schedule/reschedule/MoveReason';
import type { ProposalWords } from './proposal-words';

interface ProposalAnswerProps {
  words: ProposalWords;
  busy: boolean;
  /** The last failed answer, if any. */
  error: unknown;
  /** The family's request only: the note they read with a «ارفض». */
  note: { value: string; onChange: (value: string) => void };
  onApprove: () => void;
  onReject: () => void;
  /** «اختر موعدًا آخر» (a family's request): the move form on the week they asked for. */
  onPickOther: () => void;
}

const P = t.lessons.proposal;

/**
 * «وافق على الموعد» / «ارفض» (canvas LessonXWebStaff); a family's request adds the reply they
 * read, «اختر موعدًا آخر» (the move form on the requested week) and «ارفض الطلب».
 */
export function ProposalAnswer(props: ProposalAnswerProps) {
  const { words, busy, error, note, onApprove, onReject, onPickOther } = props;
  return (
    <>
      {error ? <FormAlert>{lessonErrorText(error)}</FormAlert> : null}
      {words.family && (
        <MoveReason
          {...note}
          label={P.decisionNote}
          hint={P.decisionNoteHint}
          placeholder={P.decisionNotePlaceholder}
        />
      )}
      <ButtonRow>
        <Button type="button" disabled={busy} onClick={onApprove}>
          {P.approve}
        </Button>
        {words.family && (
          <Button type="button" variant="secondary" disabled={busy} onClick={onPickOther}>
            {P.pickOther}
          </Button>
        )}
        <Button type="button" variant="secondary" disabled={busy} onClick={onReject}>
          {words.reject}
        </Button>
      </ButtonRow>
      {words.family && <p className="text-xs text-ink-3">{P.pickOtherHint}</p>}
    </>
  );
}
