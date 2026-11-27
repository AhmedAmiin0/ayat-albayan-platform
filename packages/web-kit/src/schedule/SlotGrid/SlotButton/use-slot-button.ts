import { clockOf } from '@ab/time';
import { useClock } from '@ab/web-kit/lib/clock';
import { clockDir } from '@ab/web-kit/lib/clock-text';
import { cn } from '@ab/web-kit/lib/utils';
import { useViewerTz } from '@ab/web-kit/lib/viewer-tz';
import { zoneLabel } from '@ab/web-kit/schedule/slots';
import type { SlotButtonProps } from './SlotButton.types';
import { slotLook } from './slot-button.helpers';

export function useSlotButton({ slot, studentTz, picked, onPick }: SlotButtonProps) {
  const busy = slot.conflicts.length > 0;
  const clock = useClock();
  const tz = useViewerTz();
  const small = zoneLabel(slot.starts_at, { tz: studentTz, base: tz }, clock);
  const time = clockOf(new Date(slot.starts_at), { ...clock, tz });
  const className = cn(
    'grid min-h-11 w-full min-w-[76px] content-center justify-items-center rounded-md border px-2 py-1 text-sm tabular-nums transition-colors duration-(--duration-press) sm:min-h-10',
    slotLook(picked, busy),
  );
  const pick = () => onPick(slot);
  return { busy, small, time, dir: clockDir(clock), className, pick };
}
