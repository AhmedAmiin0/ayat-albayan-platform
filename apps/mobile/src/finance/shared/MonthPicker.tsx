import { MonthHeader } from '@/core/ui/form/date-picker';
import { canGoNext, shiftMonth } from './month';

interface MonthPickerProps {
  month: string;
  onChange: (month: string) => void;
}

/** «سبتمبر 2026» between two 44pt arrows (no date-picker dependency); it stops at this month. */
export function MonthPicker({ month, onChange }: MonthPickerProps) {
  return (
    <MonthHeader
      month={month}
      can={{ prev: true, next: canGoNext(month) }}
      onStep={(delta) => onChange(shiftMonth(month, delta))}
    />
  );
}
