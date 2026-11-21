import type { OutsideSlot } from '@ab/shared';
import type { BookingDraft } from '@/features/teaching/booking/draft/draft';

/** What GET /booking/outside-slots is asked: no from / to, the server counts from its own now. */
export interface OutsideParams {
  teacherId: string;
  durationMin: number;
  studentIds: readonly string[];
  excludeLessonId?: string | undefined;
}

export interface OtherTimeProps {
  draft: BookingDraft;
  /** A start of the server's list, with whether it lies outside the teacher hours. */
  onPick: (slot: OutsideSlot) => void;
}

export interface OutsideNoteProps {
  draft: Pick<BookingDraft, 'outsideHours' | 'kind'>;
}

export interface OtherTimeStatusProps {
  isError: boolean;
  isPending: boolean;
}
