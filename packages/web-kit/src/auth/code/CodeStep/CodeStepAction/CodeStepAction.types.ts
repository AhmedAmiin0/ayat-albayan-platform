import type { CodeStepAction } from '@ab/client-core';
import type { CodeFlow } from '@ab/web-kit/auth/code/use-code-flow';

export interface CodeStepActionButtonProps {
  flow: CodeFlow;
  backLabel: string;
}

export interface CodeStepActionProps extends CodeStepActionButtonProps {
  action: CodeStepAction;
}
