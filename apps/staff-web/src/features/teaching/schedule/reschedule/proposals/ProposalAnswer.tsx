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
}

/** «وافق على الموعد» / «ارفض» (a family's request: «ارفض الطلب» with its note). */
export function ProposalAnswer(props: ProposalAnswerProps) {
  const { words, busy, error, note, onApprove, onReject } = props;
  const P = t.lessons.proposal;
  return (
    <>
      {error ? <FormAlert>{lessonErrorText(error)}</FormAlert> : null}
      {words.family && (
        <MoveReason {...note} label={P.decisionNote} hint={P.decisionNoteHint} />
      )}
      <ButtonRow>
        <Button type="button" disabled={busy} onClick={onApprove}>
          {P.approve}
        </Button>
        <Button type="button" variant="secondary" disabled={busy} onClick={onReject}>
          {words.reject}
        </Button>
      </ButtonRow>
    </>
  );
}
