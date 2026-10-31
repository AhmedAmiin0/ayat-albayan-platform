import { TEACHER_CALENDAR_OWNERS, type TeacherCalendarOwner as Owner, type TeacherCalendarView } from '@ab/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useIsAdmin } from '@/auth';
import { apiFetch, apiSend } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { pathKey } from '@/core/lib/query/query-keys';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { FilterPills } from '@/core/ui/form/FilterPills';
import { Note } from '@/core/ui/feedback/Note';
import { Section } from '@/core/ui/surface/Section';

const fill = (template: string, n: number) => template.replace('{n}', String(n));

/**
 * «تقويم المعلم» (docs/24 «نقل تقويم معلم إلى المنصة»): who builds this teacher's Google Calendar —
 * the old script from the sheet, or the platform — with the warning and the sync status. Base-role
 * admins only (GET/PUT /admin/google/teachers/:id/calendar-owner refuse everyone else too).
 */
export function TeacherCalendarOwner({ teacherId }: { teacherId: string }) {
  const T = t.googleSync.teacherCalendar;
  const admin = useIsAdmin();
  const path = `/admin/google/teachers/${teacherId}/calendar-owner`;
  const query = useQuery({ queryKey: pathKey(path), queryFn: () => apiFetch<TeacherCalendarView>(path), enabled: admin });
  const client = useQueryClient();
  const save = useMutation({
    mutationFn: (owner: Owner) => apiSend<TeacherCalendarView>('PUT', path, { owner }),
    onSuccess: (view) => client.setQueryData(pathKey(path), view),
  });
  if (!admin) return null;
  const view = query.data;
  return (
    <Section title={T.title}>
      {view ? (
        <>
          <FilterPills
            role="radiogroup"
            wrap
            accessibilityLabel={T.title}
            items={TEACHER_CALENDAR_OWNERS.map((value) => ({ value, label: T[value], disabled: save.isPending }))}
            value={view.owner}
            onChange={(owner) => {
              if (owner !== view.owner) save.mutate(owner);
            }}
          />
          <Note>{T.warning}</Note>
          <Note>{fill(T.managed, view.managed)}</Note>
          <Note>{fill(T.scriptPresent, view.script_event_present)}</Note>
          {save.isSuccess ? <Note>{T.saved}</Note> : null}
          {save.isError ? <Note>{t.common.error}</Note> : null}
        </>
      ) : query.isError ? (
        <ErrorState message={T.loadError} onRetry={() => void query.refetch()} />
      ) : null}
    </Section>
  );
}
