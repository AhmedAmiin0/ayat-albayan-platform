import type { CodeStepActionProps } from './CodeStepAction.types';
import { ACTIONS } from './code-step-action.helpers';

export function CodeStepAction({ action, flow, backLabel }: CodeStepActionProps) {
  const Action = ACTIONS[action];
  return <Action flow={flow} backLabel={backLabel} />;
}
