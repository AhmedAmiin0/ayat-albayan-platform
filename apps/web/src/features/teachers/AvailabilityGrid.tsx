import type { AvailabilitySlot } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { Toast } from '@/components/ui/overlay/toast';
import { apiSend } from '@/lib/api';
import { t } from '@/lib/i18n';
import { availabilityQuery, type AvailabilityRow } from './api';
import { AvailabilityFoot } from './AvailabilityFoot';
import { AvailabilityHead } from './AvailabilityHead';
import { AvailabilityWeek } from './AvailabilityWeek';
import { gridFromRows, gridIsValid, gridToSlots } from './grid';
import { weeklyHours } from './track';

type Props = { teacherId: string; tz: string; rows: readonly AvailabilitySlot[] };

/** Weekday × time-ranges editor (docs/07 §8); Save replaces the whole weekly grid (PUT). R-TCH-02. */
export function AvailabilityGrid({ teacherId, tz: savedTz, rows }: Props) {
  const queryClient = useQueryClient();
  const table = useRef<HTMLDivElement>(null);
  const [grid, setGrid] = useState(() => gridFromRows(rows));
  const [tz, setTz] = useState(savedTz);
  const [saved, setSaved] = useState(false);

  const save = useMutation({
    mutationFn: () =>
      apiSend<AvailabilityRow[]>('PUT', `/teachers/${teacherId}/availability`, {
        slots: gridToSlots(grid, tz),
      }),
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
