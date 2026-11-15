import type { ReactNode } from 'react';
import { View } from 'react-native';
import { CorrectionContext } from './correction-context';

/** How far a corrected original fades, as a struck-out draft (still readable). */
export const CORRECTED_OPACITY = 0.6;

interface CorrectedProps {
  /** Its newest correction's id; undefined: not corrected, the bubble as it is. */
  to: string | undefined;
  onJump: (id: string) => void;
  children: ReactNode;
}

/**
 * A corrected original (owner 2026-11-07): greyed, and its time row carries «صُحِّحت»
 * (CorrectedMark), a tap on which goes to the correction.
 */
export function Corrected({ to, onJump, children }: CorrectedProps) {
  if (!to) return children;
  return (
    <CorrectionContext value={{ to, onJump }}>
      <View testID={`corrected-${to}`} style={{ opacity: CORRECTED_OPACITY }}>
        {children}
      </View>
    </CorrectionContext>
  );
}
