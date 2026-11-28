import type { GateStatus } from '@ab/mobile-kit';

export interface StaffStackProps {
  gate: GateStatus;
  /** Fonts, language, overrides and the session gate are settled. */
  settled: boolean;
  fontsLoaded: boolean;
}
