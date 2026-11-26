import {
  TEACHER_CALENDAR_OWNERS,
  type TeacherCalendarOwner as Owner,
  type TeacherCalendarView,
} from '@ab/catalog';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  useIsAdmin,
  apiFetch,
  apiSend,
  t,
  pathKey,
  ErrorState,
  FilterPills,
  Section,
} from '@ab/mobile-kit';
import { Note } from '@/core/ui/feedback/Note';

const fill = (template: string, n: number) => template.replace('{n}', String(n));

/** docs/24: base-role admins only; the API refuses everyone else too. */
export function TeacherCalendarOwner({ teacherId }: { teacherId: string }) {
  const T = t.googleSync.teacherCalendar;
  const admin = useIsAdmin();
  const path = `/admin/google/teachers/${teacherId}/calendar-owner`;
  const query = useQuery({
    queryKey: pathKey(path),
    queryFn: () => apiFetch<TeacherCalendarView>(path),
    enabled: admin,
  });
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
            items={TEACHER_CALENDAR_OWNERS.map((value) => ({
              value,
              label: T[value],
              disabled: save.isPending,
            }))}
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
