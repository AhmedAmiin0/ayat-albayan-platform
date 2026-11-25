import type { GoogleFound, GoogleTeacherMapRow } from '@ab/catalog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button, FormAlert, t } from '@ab/web-kit';
import { googleTeachersQuery, putTeacherCalendar } from '@/features/platform/google-sync/google-api';
import { NO_CALENDAR as NONE } from '@/features/platform/google-sync/google-input';
import { CalendarSelect, TeacherState } from './TeacherCalendarSelect';
import { googleKeys } from '@/features/platform/keys';

interface Props {
  row: GoogleTeacherMapRow;
  calendars: readonly GoogleFound[];
  onNote: (message: string) => void;
}

export function TeacherRow({ row, calendars, onNote }: Props) {
  const queryClient = useQueryClient();
  const initial = row.confirmed_at ? (row.calendar_id ?? NONE) : (row.suggestion?.id ?? '');
  const [pick, setPick] = useState(initial);
  const save = useMutation({
    mutationFn: putTeacherCalendar,
    onSuccess: async (rows) => {
      queryClient.setQueryData(googleTeachersQuery.queryKey, rows);
      onNote(t.googleSync.common.saved);
      // The live confirmation names the mapped calendars from the status; the API re-queued items.
      await Promise.all(
        [googleKeys.status(), googleKeys.items()].map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      );
    },
  });
  const unchanged = row.confirmed_at !== null && pick === initial;
  return (
    <li className="grid gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] sm:items-center sm:gap-4">
      <TeacherState row={row} />
      <CalendarSelect row={row} calendars={calendars} value={pick} onChange={setPick} />
      <Button
        size="sm"
        variant="secondary"
        disabled={pick === '' || unchanged || save.isPending}
        onClick={() => save.mutate({ teacherId: row.teacher_id, calendarId: pick === NONE ? null : pick })}
      >
        {t.googleSync.common.confirm}
      </Button>
      {save.isError && <FormAlert className="sm:col-span-3">{t.googleSync.common.saveError}</FormAlert>}
    </li>
  );
}
