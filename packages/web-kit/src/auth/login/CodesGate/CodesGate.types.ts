import type { CodesSide } from '@ab/client-core';
import type { ReactNode } from 'react';

export interface CodesGateProps {
  side?: CodesSide;
  fallback: ReactNode;
  children: ReactNode;
}
