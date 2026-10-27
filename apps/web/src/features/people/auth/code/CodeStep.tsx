import type { ReactNode } from 'react';
import { Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { t } from '@/lib/i18n/i18n';
import { StatusNote } from '../login/StatusNote';
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
}

/** The code sent on WhatsApp: «إن كان الحساب موجودًا…», the six boxes, resend after a countdown. */
export function CodeStep({ flow, submitLabel, busyLabel, onSubmit, backLabel, children }: Props) {
  const resend = () => {
    if (flow.target !== null) void flow.request(flow.target);
  };
  return (
    <form
      noValidate
      className="grid gap-[22px]"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <StatusNote>{t.familyAuth.codeSent}</StatusNote>
      <CodeBoxes digits={flow.digits} onDigits={flow.setDigits} invalid={flow.error === t.familyAuth.errors.invalid_code || flow.error === t.familyAuth.errors.code_incomplete} />
      {children}
      {flow.error && <FormAlert>{flow.error}</FormAlert>}
      <Button type="submit" disabled={flow.busy} className="min-h-11 w-full">
        {flow.busy ? busyLabel : submitLabel}
      </Button>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button type="button" variant="ghost" size="sm" disabled={flow.left > 0 || flow.busy} onClick={resend}>
          {flow.left > 0 ? t.familyAuth.resendIn.replace('{seconds}', String(flow.left)) : t.familyAuth.resend}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={flow.back}>
          {backLabel}
        </Button>
      </div>
    </form>
  );
}
