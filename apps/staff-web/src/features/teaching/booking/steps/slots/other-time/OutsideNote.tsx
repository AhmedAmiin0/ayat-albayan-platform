import { WarnLine, t } from '@ab/web-kit';
import { isOutside } from '@/features/teaching/booking/draft/draft';
import type { OutsideNoteProps } from './OtherTime';

/** The warning for a start outside the teacher hours (the pick and the review); else nothing. */
export function OutsideNote({ draft }: OutsideNoteProps) {
  return isOutside(draft) ? <WarnLine message={t.booking.outsideHours} /> : null;
}
