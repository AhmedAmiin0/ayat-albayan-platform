import { useQuery } from '@tanstack/react-query';
import { Cartouche } from '@/components/ui/display/cartouche';
import { ListSkeleton } from '@/components/ui/display/skeleton';
import { PageHead } from '@/components/ui/layout/page';
import { teacherMeQuery } from '@/features/teaching/teacher/api';
import { LoadRetry } from '@/features/teaching/teacher/LoadRetry';
import { t } from '@/lib/i18n/i18n';
import { TeacherAvailability } from './TeacherAvailability';

/** /teacher/availability «المواعيد المتاحة» (owner 2026-11-14): her own page, read-only. */
export function TeacherAvailabilityPage() {
  const me = useQuery(teacherMeQuery);
  const body = me.data ? <TeacherAvailability me={me.data} /> : <ListSkeleton />;
  return (
    <>
      <PageHead>
        <Cartouche>{t.availability.title}</Cartouche>
      </PageHead>
      {me.isError && !me.data ? <LoadRetry onRetry={me.refetch} /> : body}
    </>
  );
}
