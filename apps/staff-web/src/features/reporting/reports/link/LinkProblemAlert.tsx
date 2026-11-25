import { Button, FormAlert, t } from '@ab/web-kit';
import { linkProblemText, type LinkProblem } from './link-api';

const RETRYABLE: Record<LinkProblem, boolean> = {
  invalid: false,
  expired: false,
  not_open: false,
  too_many: true,
  failed: true,
};

export interface LinkProblemAlertProps {
  problem: LinkProblem;
  onRetry: () => void;
}

/** Why the link opens no form; too many tries or a server hiccup keep a retry. */
export function LinkProblemAlert({ problem, onRetry }: LinkProblemAlertProps) {
  return (
    <div className="grid gap-3">
      <FormAlert>{linkProblemText(problem)}</FormAlert>
      {RETRYABLE[problem] && (
        <Button variant="secondary" onClick={onRetry} className="justify-self-start">
          {t.reports.teacherLink.retry}
        </Button>
      )}
    </div>
  );
}
