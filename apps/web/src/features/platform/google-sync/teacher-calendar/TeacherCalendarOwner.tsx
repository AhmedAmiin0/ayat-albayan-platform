import { TEACHER_CALENDAR_OWNERS, type TeacherCalendarOwner as Owner } from '@ab/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useId, useState } from 'react';
import { FormAlert } from '@/components/ui/form/form-alert';
import { RadioChips } from '@/components/ui/form/radio-chips';
import { meQuery } from '@/features/people/auth';
import { useClock } from '@/lib/clock';
import { useViewerTz } from '@/lib/viewer-tz';
import { t } from '@/lib/i18n/i18n';
import { putTeacherCalendarOwner, teacherCalendarQuery } from '@/features/platform/google-sync/google-api';
import { fill, formatAt } from '@/features/platform/google-sync/google-format';

/**
 * «تقويم المعلم» on the admin teacher page (docs/24 «نقل تقويم معلم إلى المنصة»): who builds this
 * teacher's Google Calendar — the old script from the sheet, or the platform — with the one-line
 * warning and the sync status. Base-role admins only (the API refuses everyone else too).
 */
export function TeacherCalendarOwner({ teacherId }: { teacherId: string }) {
  const T = t.googleSync.teacherCalendar;
  const noteId = useId();
  const clock = { ...useClock(), tz: useViewerTz() };
  const admin = useQuery(meQuery).data?.role === 'admin';
  const query = useQuery({ ...teacherCalendarQuery(teacherId), enabled: admin });
  const client = useQueryClient();
  const [saved, setSaved] = useState(false);
  const save = useMutation({
    mutationFn: (owner: Owner) => putTeacherCalendarOwner({ teacherId, owner }),
    onSuccess: (view) => {
      client.setQueryData(teacherCalendarQuery(teacherId).queryKey, view);
      setSaved(true);
    },
  });
  if (!admin) return null;
  const view = query.data;
  const options = TEACHER_CALENDAR_OWNERS.map((value) => ({ value, label: T[value] }));
  return (
    <section aria-label={T.title} className="mt-6 grid max-w-3xl gap-2 rounded-md border border-rule p-4 text-sm">
      {view ? (
        <>
          <RadioChips
            name="calendar_owner"
            legend={T.title}
            options={options}
            value={view.owner}
            disabled={save.isPending}
            onChange={(owner) => {
              setSaved(false);
              save.mutate(owner);
            }}
            describedBy={noteId}
          />
          <p id={noteId} className="text-xs text-ink-2">{T.warning}</p>
          <p className="text-xs text-ink-3 tabular-nums">
            {fill(T.managed, { n: view.managed })}
            {t.common.listSeparator}
            {fill(T.scriptPresent, { n: view.script_event_present })}
            {view.changed_at && `${t.common.listSeparator}${fill(T.changedAt, { at: formatAt(view.changed_at, clock) })}`}
          </p>
          {saved && <p role="status" className="text-xs text-ok">{T.saved}</p>}
          {save.isError && <FormAlert>{t.common.error}</FormAlert>}
        </>
      ) : query.isError ? (
        <FormAlert>{T.loadError}</FormAlert>
      ) : null}
    </section>
  );
}
