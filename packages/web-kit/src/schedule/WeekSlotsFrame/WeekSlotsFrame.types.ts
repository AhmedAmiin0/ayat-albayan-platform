import type { SlotView } from '@ab/schedule';
import type { SlotGridProps } from '@ab/web-kit/schedule/SlotGrid';

/** One week's slot read: staff's GET /booking/slots, or the family's free starts. */
export interface SlotsRead {
  data: readonly SlotView[] | undefined;
  isError: boolean;
  /** The previous week's answer still shown while this one loads. */
  dim?: boolean;
}

export interface WeekSlotsFrameProps {
  /** Saturday of the week shown (the viewer's zone). */
  week: string;
  /** This week: no going before it. */
  first: string;
  onWeek: (week: string) => void;
  studentTz: string;
  read: SlotsRead;
  grid: Pick<SlotGridProps, 'value' | 'also' | 'onPick'>;
}
