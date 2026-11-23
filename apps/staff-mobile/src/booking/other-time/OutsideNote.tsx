import { t, WarnLine } from '@ab/mobile-kit';
import type { OutsideNoteProps } from './OutsideNote.types';

/** The review's warning for a start outside the teacher hours; nothing otherwise. */
export function OutsideNote({ outside }: OutsideNoteProps) {
  return outside ? <WarnLine message={t.booking.outsideHours} /> : null;
}
