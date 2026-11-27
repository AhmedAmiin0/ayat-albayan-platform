import type { ReactNode } from 'react';
import type { CodeFlow } from '@ab/web-kit/auth/code/use-code-flow';

export interface CodeStepProps {
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
