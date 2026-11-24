import { WarnLine } from '@ab/web-kit/components/ui/surface/warn-line';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { isOutside } from '@/features/teaching/booking/draft/draft';
import type { OutsideNoteProps } from './OtherTime';

/** The warning for a start outside the teacher hours (the pick and the review); else nothing. */
export function OutsideNote({ draft }: OutsideNoteProps) {
  return isOutside(draft) ? <WarnLine message={t.booking.outsideHours} /> : null;
}
