import { canResend, resendLabel } from '@ab/client-core';
import { Button } from '@ab/web-kit/components/ui/form/Button';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import type { CodeStepActionButtonProps } from '@ab/web-kit/auth/code/CodeStep/CodeStepAction/CodeStepAction.types';

export function ResendButton({ flow }: CodeStepActionButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      disabled={!canResend(flow)}
      onClick={() => void flow.resend()}
    >
      {resendLabel(flow.left, t.familyAuth)}
    </Button>
  );
}
