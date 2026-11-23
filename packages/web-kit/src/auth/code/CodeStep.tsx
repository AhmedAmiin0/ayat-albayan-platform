import { CODE_STEP_ACTIONS, type CodeStepAction, canResend, resendLabel } from '@ab/client-core';
import { Fragment, type ReactNode } from 'react';
import { Button, FormAlert } from '#/components/ui/index.ts';
import { t } from '#/lib/i18n/index.ts';
import { StatusNote } from '#/auth/login/StatusNote.tsx';
import { CodeBoxes } from './CodeBoxes';
import type { CodeFlow } from './use-code-flow';

interface Props {
  flow: CodeFlow;
  submitLabel: string;
  busyLabel: string;
  onSubmit: () => void;
  /** «غيّر الرقم» / «رجوع»: back to the first step. */
  backLabel: string;
  /** Fields between the code and the submit button (the new password). */
  children?: ReactNode;
  /** Above the boxes instead of «إن كان الحساب موجودًا…» (the family sign-in names the number). */
  note?: ReactNode;
}

const BOX_ERRORS = new Set([t.familyAuth.errors.invalid_code, t.familyAuth.errors.code_incomplete]);

/** «أعد إرسال الرمز» then «غيّر الرقم», in the order every code step uses (client-core). */
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

/**
 * The code sent on WhatsApp, as the family app: the note, the six boxes, the submit, then one
 * centred column of «أعد إرسال الرمز» (after a countdown) and «غيّر الرقم».
 */
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
