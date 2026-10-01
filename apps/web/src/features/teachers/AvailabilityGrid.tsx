import { WEEKDAYS, type AvailabilitySlot } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { apiSend } from '@/lib/api';
import { t } from '@/lib/i18n';
import { availabilityQuery, type AvailabilityRow } from './api';
import { AvailabilityDay } from './AvailabilityDay';
import { gridFromRows, gridIsValid, gridToSlots } from './grid';

type Props = { teacherId: string; tz: string; rows: readonly AvailabilitySlot[] };

/** Weekday × time-ranges editor; Save replaces the whole weekly grid (PUT). R-TCH-02. */
export function AvailabilityGrid({ teacherId, tz, rows }: Props) {
  const queryClient = useQueryClient();
  const [grid, setGrid] = useState(() => gridFromRows(rows));
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

  const valid = gridIsValid(grid);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        {t.availability.tzHint.replace('{tz}', tz)}
      </p>
      <ul>
        {WEEKDAYS.map((day) => (
          <AvailabilityDay
            key={day}
            day={day}
            ranges={grid[day]}
            onChange={(ranges) => {
              setSaved(false);
              setGrid((g) => ({ ...g, [day]: ranges }));
            }}
          />
        ))}
      </ul>
      <div className="flex items-center gap-3">
        <Button type="button" disabled={!valid || save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? t.common.saving : t.availability.save}
        </Button>
        {saved && <span role="status">{t.availability.saved}</span>}
        {save.isError && (
          <span role="alert" className="text-sm text-destructive">
            {t.common.error}
          </span>
        )}
      </div>
    </div>
  );
}
