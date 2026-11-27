import type { PortalKind } from '@ab/shared';
import type { ReactElement } from 'react';
import { GuardianHead } from './GuardianHead';
import { StudentHead } from './StudentHead';
import type { WhoProps } from './Who.types';

export const HEADS: Readonly<Record<PortalKind, (props: WhoProps) => ReactElement>> = {
  guardian: GuardianHead,
  student: StudentHead,
};
