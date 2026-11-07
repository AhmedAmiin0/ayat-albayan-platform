import { correctionsOf, type MessageView } from '@ab/shared';
import { createContext, use } from 'react';

/** A corrected bubble's link (owner 2026-11-07): its newest correction and the list's jump. */
export interface CorrectionLink {
  to: string;
  onJump: (id: string) => void;
}

/** Set by Corrected around a corrected bubble only; null everywhere else. */
export const CorrectionContext = createContext<CorrectionLink | null>(null);

export const useCorrection = (): CorrectionLink | null => use(CorrectionContext);

/** Original id → its newest correction, over the list's loaded messages (calls skipped). */
export const rowCorrections = (rows: ReadonlyArray<{ message?: MessageView }>) =>
  correctionsOf(rows.flatMap((r) => (r.message ? [r.message] : [])));
