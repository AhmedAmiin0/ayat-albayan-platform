import { Button } from '@ab/web-kit/components/ui/form/Button';
import type { CodeStepActionButtonProps } from '@ab/web-kit/auth/code/CodeStep/CodeStepAction/CodeStepAction.types';

export function BackButton({ flow, backLabel }: CodeStepActionButtonProps) {
  return (
    <Button type="button" variant="ghost" onClick={flow.back}>
      {backLabel}
    </Button>
  );
}
