import type { SlotView } from '@ab/schedule';

export interface SlotGridProps {
  /** Saturday of the week shown (the viewer's zone). */
  week: string;
  slots: readonly SlotView[];
  /** Zone of the small times under each slot (the student's). */
  studentTz: string;
  /** starts_at of the picked slot. */
  value: string | null;
  /** A package's other picked starts (one per weekday): shown picked too. */
  also?: readonly string[] | undefined;
  onPick: (slot: SlotView) => void;
}

export interface PickableSlot {
  slot: SlotView;
  picked: boolean;
}

export interface GridDay {
  day: string;
  label: string;
  slots: readonly PickableSlot[];
}
