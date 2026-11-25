import { Button, FormAlert, ButtonRow, t, MoveReason } from '@ab/web-kit';
import { lessonErrorText } from '@/features/teaching/schedule/api';
import type { ProposalWords } from './proposal-words';

interface ProposalAnswerProps {
  words: ProposalWords;
  busy: boolean;
  /** The last failed answer, if any. */
  error: unknown;
  /** The family's request only: the note they read with a decline. */
  note: { value: string; onChange: (value: string) => void };
  onApprove: () => void;
  onReject: () => void;
  /** A family's request opens the move form on the week they asked for. */
  onPickOther: () => void;
}

const P = t.lessons.proposal;

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
