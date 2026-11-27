import type { ReportAccessView } from '@ab/shared';
import type { Notice } from './CodeChoices.types';

/** Why no number can be chosen, or null when some can. */
export const noticeOf = (access: ReportAccessView): Notice | null =>
  [
    { when: !access.available, notice: 'unavailable' as const },
    { when: access.to.length === 0, notice: 'noPhone' as const },
  ].find((r) => r.when)?.notice ?? null;
