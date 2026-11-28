import type { AvailabilitySlot } from '@ab/schedule';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { Toast, t } from '@ab/web-kit';
import { availabilityQuery, saveAvailability } from '@/features/people/teachers/api';
import { AvailabilityFoot } from '@/features/people/teachers/availability/AvailabilityFoot';
import { AvailabilityHead } from '@/features/people/teachers/availability/AvailabilityHead';
import { AvailabilityWeek } from '@/features/people/teachers/availability/AvailabilityWeek';
import { gridFromRows, gridIsValid, gridToSlots } from '@/features/people/teachers/availability/grid';
import { weeklyHours } from '@/features/people/teachers/availability/track';

interface Props { teacherId: string; tz: string; rows: readonly AvailabilitySlot[] }

/** Weekday × time-ranges editor (docs/07 §8); Save replaces the whole weekly grid (PUT). R-TCH-02. */
export function AvailabilityGrid({ teacherId, tz: savedTz, rows }: Props) {
  const queryClient = useQueryClient();
  const table = useRef<HTMLDivElement>(null);
  const [grid, setGrid] = useState(() => gridFromRows(rows));
  const [tz, setTz] = useState(savedTz);
  const [saved, setSaved] = useState(false);

  const save = useMutation({
    mutationFn: () => saveAvailability(teacherId, gridToSlots(grid, tz)),
    onSuccess: (data) => {
      queryClient.setQueryData(availabilityQuery(teacherId).queryKey, data);
      setSaved(true);
    },
  });

  const onSave = () => {
    if (gridIsValid(grid)) save.mutate();
    else table.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  };
  const onCancel = () => {
    setGrid(gridFromRows(rows));
    setTz(savedTz);
  };

  return (
    <div>
      <AvailabilityHead
        tz={tz}
        onTz={(next) => {
          setSaved(false);
          setTz(next);
        }}
      />
      <AvailabilityWeek
        ref={table}
        grid={grid}
        tz={tz}
        onDay={(day, ranges) => {
          setSaved(false);
          setGrid((g) => ({ ...g, [day]: ranges }));
        }}
      />
      <AvailabilityFoot
        hours={weeklyHours(grid)}
        pending={save.isPending}
        failed={save.isError}
        onCancel={onCancel}
        onSave={onSave}
      />
      {saved && <Toast message={t.availability.saved} onDismiss={() => setSaved(false)} />}
    </div>
  );
}
