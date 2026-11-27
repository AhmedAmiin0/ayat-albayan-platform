import type { ReactNode } from 'react';
import type { StepMotion } from '../use-step-motion';

export interface StepStageProps<K extends string> {
  motion: StepMotion<K>;
  render: (step: K) => ReactNode;
  still: boolean;
}
