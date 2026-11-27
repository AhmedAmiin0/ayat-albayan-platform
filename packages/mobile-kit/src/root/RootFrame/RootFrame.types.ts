import type { ReactNode } from 'react';

export interface RootFrameProps {
  /** Settled and /auth/me loaded: the stack mounts. */
  ready: boolean;
  fontsLoaded: boolean;
  children: ReactNode;
}
