import { CODE_STEP_ACTIONS, type CodeStepAction, canResend, resendLabel } from '@ab/client-core';
import { Fragment, type ReactNode } from 'react';
import { Button } from '@ab/web-kit/components/ui/form/Button';
import { FormAlert } from '@ab/web-kit/components/ui/form/FormAlert';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { StatusNote } from '@ab/web-kit/auth/login/StatusNote';
import { CodeBoxes } from '@ab/web-kit/auth/code/CodeBoxes';
import type { CodeFlow } from '@ab/web-kit/auth/code/use-code-flow';

interface Props {
  flow: CodeFlow;
  submitLabel: string;
  busyLabel: string;
  onSubmit: () => void;
  backLabel: string;
  /** Fields between the code and the submit button (the new password). */
  children?: ReactNode;
  /** Replaces the default note above the boxes (the family sign-in names the number). */
  note?: ReactNode;
}

const BOX_ERRORS = new Set([t.familyAuth.errors.invalid_code, t.familyAuth.errors.code_incomplete]);

/** Resend then change number, the order every code step uses (client-core). */
const ACTIONS: Record<CodeStepAction, (props: Props) => ReactNode> = {
  resend: ({ flow }) => (
    <Button
      type="button"
      variant="ghost"
      disabled={!canResend(flow)}
      onClick={() => void flow.resend()}
    >
      {resendLabel(flow.left, t.familyAuth)}
    </Button>
  ),
  back: ({ flow, backLabel }) => (
    <Button type="button" variant="ghost" onClick={flow.back}>
      {backLabel}
    </Button>
  ),
};

export function CodeStep(props: Props) {
  const { flow, submitLabel, busyLabel, onSubmit, children, note } = props;
  return (
    <form
      noValidate
      className="grid gap-[22px]"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      {note ?? <StatusNote>{t.familyAuth.codeSent}</StatusNote>}
      <CodeBoxes
        digits={flow.digits}
        onDigits={flow.setDigits}
        invalid={flow.error !== undefined && BOX_ERRORS.has(flow.error)}
      />
      {children}
      {flow.error && <FormAlert>{flow.error}</FormAlert>}
      <Button type="submit" disabled={flow.busy} className="min-h-11 w-full">
        {flow.busy && !flow.resending ? busyLabel : submitLabel}
      </Button>
      <div className="grid justify-items-center">
        {CODE_STEP_ACTIONS.map((action) => (
          <Fragment key={action}>{ACTIONS[action](props)}</Fragment>
        ))}
      </div>
    </form>
  );
}
