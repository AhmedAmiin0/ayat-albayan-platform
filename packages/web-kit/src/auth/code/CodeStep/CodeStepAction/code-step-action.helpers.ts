import type { CodeStepAction } from '@ab/client-core';
import type { ComponentType } from 'react';
import { BackButton } from './BackButton';
import type { CodeStepActionButtonProps } from './CodeStepAction.types';
import { ResendButton } from './ResendButton';

/** Resend then change number, the order every code step uses (client-core). */
export const ACTIONS: Record<CodeStepAction, ComponentType<CodeStepActionButtonProps>> = {
  resend: ResendButton,
  back: BackButton,
};
