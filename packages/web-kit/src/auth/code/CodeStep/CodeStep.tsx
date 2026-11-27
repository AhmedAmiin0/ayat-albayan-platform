import { CODE_STEP_ACTIONS } from '@ab/client-core';
import { Button } from '@ab/web-kit/components/ui/form/Button';
import { FormAlert } from '@ab/web-kit/components/ui/form/FormAlert';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { StatusNote } from '@ab/web-kit/auth/login/StatusNote';
import { CodeBoxes } from '@ab/web-kit/auth/code/CodeBoxes';
import { CodeStepAction } from './CodeStepAction';
import type { CodeStepProps } from './CodeStep.types';
import { isBoxError, submitWith } from './code-step.helpers';

export function CodeStep({
  flow,
  submitLabel,
  busyLabel,
  onSubmit,
  backLabel,
  children,
  note,
}: CodeStepProps) {
  return (
    <form noValidate className="grid gap-[22px]" onSubmit={submitWith(onSubmit)}>
      {note ?? <StatusNote>{t.familyAuth.codeSent}</StatusNote>}
      <CodeBoxes digits={flow.digits} onDigits={flow.setDigits} invalid={isBoxError(flow.error)} />
      {children}
      {flow.error && <FormAlert>{flow.error}</FormAlert>}
      <Button type="submit" disabled={flow.busy} className="min-h-11 w-full">
        {flow.busy && !flow.resending ? busyLabel : submitLabel}
      </Button>
      <div className="grid justify-items-center">
        {CODE_STEP_ACTIONS.map((action) => (
          <CodeStepAction key={action} action={action} flow={flow} backLabel={backLabel} />
        ))}
      </div>
    </form>
  );
}
