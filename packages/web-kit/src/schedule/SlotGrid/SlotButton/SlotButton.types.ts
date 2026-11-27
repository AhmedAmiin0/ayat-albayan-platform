import type { SlotView } from '@ab/schedule';

export interface SlotButtonProps {
  slot: SlotView;
  studentTz: string;
  picked: boolean;
  onPick: (slot: SlotView) => void;
}
