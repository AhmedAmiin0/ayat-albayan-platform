import type { CodeRoutes } from '@ab/client-core';
import type { ReactNode } from 'react';
import type { CodeFlow } from '../use-code-flow';

export interface CodeSignInProps {
  /** The teacher's routes (default) or the family's (docs/50 §6). */
  codes?: CodeRoutes;
  /** The words above the phone. */
  intro: string;
  /** Under the steps: the way back, other sign-in links. */
  children?: ReactNode;
}

export interface PhoneStepProps {
  flow: CodeFlow;
  intro: string;
}

export interface CodeStepProps {
  flow: CodeFlow;
  target: string;
}
